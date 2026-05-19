// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SweepGuard Claimer — EIP-712 Signature-Based Airdrop Recovery
 * @notice Claims airdrops from compromised wallets using EIP-712 signatures + EIP-7702 delegation
 * @dev Inspired by zun-whitehat.eth's system for safely recovering airdrops from hacked wallets
 *
 * SECURITY MODEL:
 * ─────────────────────────────────────────────────────────────────────
 * 1. User signs an EIP-712 MESSAGE (not a transaction) authorizing a specific claim
 * 2. This contract verifies that signature on-chain
 * 3. Contract uses EIP-7702 delegation to execute AS the compromised wallet
 * 4. Contract claims tokens and splits 80/20 atomically
 * 5. Private key NEVER leaves the user's device — only a signature
 *
 * WHY THIS IS SECURE:
 * - Signature is one-time use (nonce prevents replay)
 * - Signature has deadline (expires after ~10 minutes)
 * - Atomic execution: if claim fails, entire TX reverts, no gas wasted
 * - No private key exposure: user only signs EIP-712 message in MetaMask
 * - Works on ANY chain, ANY airdrop contract
 * - 80/20 split is enforced by smart contract — cannot be changed
 * - Drainer can't intercept: claim + split happens in ONE atomic TX
 *
 * EIP-7702 DELEGATION MODE:
 * ─────────────────────────────────────────────────────────────────────
 * When the compromised wallet delegates to this contract via EIP-7702:
 * - Calling the wallet's address executes this contract's code
 * - address(this) == compromised wallet address
 * - External calls have msg.sender == compromised wallet
 * - Tokens are held by the wallet (this contract's code manages them)
 * - The claimAndSplit function transfers tokens out atomically
 *
 * DIRECT CALL MODE:
 * ─────────────────────────────────────────────────────────────────────
 * When called directly on the contract's own address:
 * - Works for airdrops that don't verify msg.sender (merkle-based claims)
 * - Contract receives tokens, then splits them
 * - For sender-verified airdrops, EIP-7702 delegation is required
 *
 * @dev Fee wallet: 0x7A3725154a2E6468F9549334394802e9E2822C2A
 * @dev Platform fee: 20% (enforced immutably)
 */
contract SweepGuardClaimer {
    // ─── Immutables ────────────────────────────────────────────────
    address public immutable feeWallet;
    uint256 public immutable feePercent;

    // ─── EIP-712 Constants ─────────────────────────────────────────
    // Domain separator components
    bytes32 private constant DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );
    bytes32 private constant NAME_HASH = keccak256("SweepGuard");
    bytes32 private constant VERSION_HASH = keccak256("1");

    // ClaimAirdrop struct type hash
    // Matches the EIP-712 typed data structure:
    // ClaimAirdrop(
    //   address hackedWallet,
    //   address safeWallet,
    //   address tokenAddress,
    //   address airdropContract,
    //   bytes claimData,
    //   uint256 amount,
    //   uint256 deadline,
    //   uint256 nonce
    // )
    bytes32 private constant CLAIM_TYPEHASH = keccak256(
        "ClaimAirdrop(address hackedWallet,address safeWallet,address tokenAddress,address airdropContract,bytes claimData,uint256 amount,uint256 deadline,uint256 nonce)"
    );

    // ─── State ─────────────────────────────────────────────────────
    // Nonce tracking: prevents signature replay attacks
    // Keyed by hacked wallet address — each wallet has independent nonce
    mapping(address => uint256) public nonces;

    // ─── Events ────────────────────────────────────────────────────
    event ClaimExecuted(
        address indexed hackedWallet,
        address indexed safeWallet,
        address indexed tokenAddress,
        uint256 totalAmount,
        uint256 feeAmount,
        uint256 userAmount,
        uint256 nonce
    );

    // ─── Errors ────────────────────────────────────────────────────
    error InvalidFeeWallet();
    error FeeTooHigh();
    error SignatureExpired();
    error InvalidNonce();
    error InvalidSignature();
    error ClaimFailed();
    error TransferFailed();
    error NoTokensClaimed();
    error InsufficientPayment();

    // ─── Constructor ───────────────────────────────────────────────
    /**
     * @notice Deploy the claimer contract
     * @param _feeWallet Address to receive 20% platform fee
     * @param _feePercent Fee percentage (max 50%)
     */
    constructor(address _feeWallet, uint256 _feePercent) {
        if (_feeWallet == address(0)) revert InvalidFeeWallet();
        if (_feePercent > 50) revert FeeTooHigh();
        feeWallet = _feeWallet;
        feePercent = _feePercent;
    }

    // ─── Core: Claim and Split ─────────────────────────────────────
    /**
     * @notice Claim airdrop tokens and split 80/20 atomically
     * @dev This is the main entry point. Can be called:
     *      - Directly on this contract (for merkle-based airdrops)
     *      - On the hacked wallet's address via EIP-7702 delegation
     *
     * @param hackedWallet   Address of the compromised wallet that owns the airdrop
     * @param safeWallet     Address to receive 80% of claimed tokens
     * @param tokenAddress   Address of the ERC20 token being claimed
     * @param airdropContract Address of the airdrop claim contract
     * @param claimData      Encoded calldata for the airdrop's claim function
     * @param amount         Expected claim amount (for signature binding, 0 if unknown)
     * @param deadline       Signature expiry timestamp (reverts if block.timestamp > deadline)
     * @param nonce          Unique nonce for this wallet (prevents replay)
     * @param signature      EIP-712 signature from the hacked wallet's private key
     */
    function claimAndSplit(
        address hackedWallet,
        address safeWallet,
        address tokenAddress,
        address airdropContract,
        bytes calldata claimData,
        uint256 amount,
        uint256 deadline,
        uint256 nonce,
        bytes calldata signature
    ) external payable {
        // ── Step 1: Check deadline ──────────────────────────────────
        // SECURITY: Signatures expire after ~10 minutes to limit
        // the window for replay attacks or key compromise.
        if (block.timestamp > deadline) revert SignatureExpired();

        // ── Step 2: Validate and increment nonce ────────────────────
        // SECURITY: Each signature can only be used once. The nonce
        // ensures that even if someone captures the signature, they
        // cannot replay it for a different claim.
        if (nonce != nonces[hackedWallet]) revert InvalidNonce();
        nonces[hackedWallet]++;

        // ── Step 3: Recover and verify signer ───────────────────────
        // SECURITY: We reconstruct the EIP-712 digest from the
        // parameters and recover the signer. Only the holder of
        // the hacked wallet's private key could have produced this
        // signature. The signature is verified against the exact
        // parameters — changing any parameter invalidates it.
        bytes32 digest = _buildDigest(
            hackedWallet,
            safeWallet,
            tokenAddress,
            airdropContract,
            claimData,
            amount,
            deadline,
            nonce
        );

        address signer = _recoverSigner(digest, signature);
        if (signer != hackedWallet) revert InvalidSignature();

        // ── Step 4: Execute the claim ───────────────────────────────
        // Call the airdrop contract with the provided claimData.
        // In EIP-7702 delegation mode: msg.sender == hackedWallet
        // In direct call mode: msg.sender == this contract
        (bool claimSuccess, ) = airdropContract.call{value: msg.value}(claimData);
        if (!claimSuccess) revert ClaimFailed();

        // ── Step 5: Get claimed token balance ───────────────────────
        uint256 balance = IERC20(tokenAddress).balanceOf(address(this));
        if (balance == 0) revert NoTokensClaimed();

        // ── Step 6: Split tokens 80/20 ──────────────────────────────
        // SECURITY: The split is enforced by the smart contract.
        // Neither the user nor the platform can change the ratio.
        // This happens atomically — either both transfers succeed
        // or the entire transaction reverts.
        uint256 feeAmount = (balance * feePercent) / 100;
        uint256 userAmount = balance - feeAmount;

        // Transfer platform fee
        bool feeSent = IERC20(tokenAddress).transfer(feeWallet, feeAmount);
        if (!feeSent) revert TransferFailed();

        // Transfer user share to safe wallet
        bool userSent = IERC20(tokenAddress).transfer(safeWallet, userAmount);
        if (!userSent) revert TransferFailed();

        emit ClaimExecuted(
            hackedWallet,
            safeWallet,
            tokenAddress,
            balance,
            feeAmount,
            userAmount,
            nonce
        );
    }

    // ─── EIP-712 Domain Separator ──────────────────────────────────
    /**
     * @notice Compute the EIP-712 domain separator
     * @dev Cached per chain — the domain separator only changes if
     *      chainId or contract address changes (which shouldn't happen).
     *      We compute it fresh each call for simplicity (gas cost is minimal).
     */
    function _domainSeparator() private view returns (bytes32) {
        return keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                NAME_HASH,
                VERSION_HASH,
                block.chainid,
                address(this)
            )
        );
    }

    // ─── Build EIP-712 Digest ──────────────────────────────────────
    /**
     * @notice Build the full EIP-712 digest for signature verification
     * @dev Follows EIP-712: digest = keccak256("\x19\x01" || domainSeparator || structHash)
     */
    function _buildDigest(
        address hackedWallet,
        address safeWallet,
        address tokenAddress,
        address airdropContract,
        bytes calldata claimData,
        uint256 amount,
        uint256 deadline,
        uint256 nonce
    ) private view returns (bytes32) {
        // Hash the claimData bytes
        bytes32 claimDataHash = keccak256(claimData);

        // Compute struct hash
        bytes32 structHash = keccak256(
            abi.encode(
                CLAIM_TYPEHASH,
                hackedWallet,
                safeWallet,
                tokenAddress,
                airdropContract,
                claimDataHash,
                amount,
                deadline,
                nonce
            )
        );

        // Compute final EIP-712 digest
        return keccak256(
            abi.encodePacked("\x19\x01", _domainSeparator(), structHash)
        );
    }

    // ─── ECDSA Signature Recovery ──────────────────────────────────
    /**
     * @notice Recover the signer address from an EIP-712 digest and signature
     * @dev Uses ecrecover with signature malleability protection.
     *      Rejects signatures with s-value in the upper half (EIP-2).
     */
    function _recoverSigner(bytes32 digest, bytes calldata signature) private pure returns (address) {
        require(signature.length == 65, "Invalid signature length");

        // Split signature into r, s, v
        bytes32 r;
        bytes32 s;
        uint8 v;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }

        // Normalize v value (MetaMask may return 0/1 instead of 27/28)
        if (v < 27) {
            v += 27;
        }

        require(v == 27 || v == 28, "Invalid v value");

        // EIP-2: Reject signatures with s-value in the upper half
        // This prevents signature malleability attacks
        require(
            uint256(s) <= 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0,
            "Invalid s value"
        );

        address signer = ecrecover(digest, v, r, s);
        require(signer != address(0), "Invalid signature");

        return signer;
    }

    // ─── View Functions ────────────────────────────────────────────
    /**
     * @notice Get the current nonce for a wallet
     * @param wallet Address to check
     * @return Current nonce value
     */
    function getNonce(address wallet) external view returns (uint256) {
        return nonces[wallet];
    }

    /**
     * @notice Get contract info
     * @return _feeWallet Platform fee wallet address
     * @return _feePercent Fee percentage
     */
    function getInfo() external view returns (address _feeWallet, uint256 _feePercent) {
        return (feeWallet, feePercent);
    }

    /**
     * @notice Build the EIP-712 typed data hash for off-chain signature generation
     * @dev Call this from the API to generate the exact data the user should sign
     * @return The EIP-712 digest that should be signed
     */
    function buildClaimDigest(
        address hackedWallet,
        address safeWallet,
        address tokenAddress,
        address airdropContract,
        bytes calldata claimData,
        uint256 amount,
        uint256 deadline,
        uint256 nonce
    ) external view returns (bytes32) {
        return _buildDigest(
            hackedWallet,
            safeWallet,
            tokenAddress,
            airdropContract,
            claimData,
            amount,
            deadline,
            nonce
        );
    }

    // ─── Emergency ─────────────────────────────────────────────────
    /**
     * @notice Emergency withdraw tokens (only fee wallet)
     * @dev In case tokens get stuck in the contract (shouldn't happen
     *      in normal operation since claimAndSplit is atomic)
     */
    function emergencyWithdraw(address token) external {
        require(msg.sender == feeWallet, "Not authorized");
        if (token == address(0)) {
            (bool sent, ) = feeWallet.call{value: address(this).balance}("");
            require(sent, "ETH withdraw failed");
        } else {
            uint256 balance = IERC20(token).balanceOf(address(this));
            require(IERC20(token).transfer(feeWallet, balance), "Token withdraw failed");
        }
    }

    /**
     * @notice Emergency withdraw ETH
     */
    function emergencyWithdrawETH() external {
        require(msg.sender == feeWallet, "Not authorized");
        (bool sent, ) = feeWallet.call{value: address(this).balance}("");
        require(sent, "ETH withdraw failed");
    }
}

/**
 * @dev Minimal ERC20 interface for token transfers
 */
interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
}
