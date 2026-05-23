// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SweepGuardRescuer
 * @notice EIP-7702 batch executor for compromised wallets.
 *         Compromised wallet delegates to this contract via EIP-7702,
 *         sponsor pays gas, claim+transfer happens in one atomic TX.
 *         20% fee goes to SweepGuard platform wallet.
 *
 *         Based on Antidrain (zun-whitehat.eth) architecture.
 *         Deployed by SweepGuard for our own fee collection.
 */
contract SweepGuardRescuer {
    // ─── State ───────────────────────────────────────────────────
    address public immutable owner;
    address public feeWallet;
    uint256 public constant FEE_BPS = 2000; // 20%
    uint256 public constant BPS_DENOM = 10000;

    // account => delegatee => nonce
    mapping(address => mapping(address => uint256)) public accountNonces;

    // ─── Events ──────────────────────────────────────────────────
    event Rescued(
        address indexed account,
        address indexed safeRecipient,
        address indexed token,
        uint256 userAmount,
        uint256 feeAmount
    );
    event RescuedNative(
        address indexed account,
        address indexed safeRecipient,
        uint256 userAmount,
        uint256 feeAmount
    );
    event MovedERC20(
        address indexed account,
        address indexed safeRecipient,
        address indexed token,
        uint256 amount
    );
    event FeeWalletUpdated(address indexed oldWallet, address indexed newWallet);

    // ─── Errors ──────────────────────────────────────────────────
    error NotOwner();
    error NotFeeWallet();
    error InvalidRecipient();
    error TransferFailed();

    // ─── Modifiers ───────────────────────────────────────────────
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    // ─── Constructor ─────────────────────────────────────────────
    constructor(address initialOwner, address initialFeeWallet) {
        owner = initialOwner;
        feeWallet = initialFeeWallet;
    }

    // ─── Admin ───────────────────────────────────────────────────
    function setFeeWallet(address newFeeWallet) external onlyOwner {
        if (newFeeWallet == address(0)) revert InvalidRecipient();
        emit FeeWalletUpdated(feeWallet, newFeeWallet);
        feeWallet = newFeeWallet;
    }

    // ─── Rescue with claim (airdrops, rewards, etc.) ─────────────
    function executeRescue(
        address safeRecipient,
        address[] calldata tokens,
        address claimTarget,
        bytes calldata claimData,
        address fw
    ) external payable {
        if (safeRecipient == address(0)) revert InvalidRecipient();
        if (fw != feeWallet) revert NotFeeWallet();

        if (claimTarget != address(0) && claimData.length > 0) {
            (bool claimSuccess, ) = claimTarget.call(claimData);
            claimSuccess;
        }

        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == address(0)) {
                _rescueNative(safeRecipient, msg.value);
            } else {
                _rescueERC20(safeRecipient, tokens[i], fw);
            }
        }
    }

    // ─── Move existing ERC-20 balances ───────────────────────────
    function executeMoveERC20(
        address safeRecipient,
        address[] calldata tokens,
        address fw
    ) external {
        if (safeRecipient == address(0)) revert InvalidRecipient();
        if (fw != feeWallet) revert NotFeeWallet();

        for (uint256 i = 0; i < tokens.length; i++) {
            _rescueERC20(safeRecipient, tokens[i], fw);
        }
    }

    // ─── Rescue native ETH ──────────────────────────────────────
    function executeRescueNative(
        address safeRecipient,
        address fw
    ) external payable {
        if (safeRecipient == address(0)) revert InvalidRecipient();
        if (fw != feeWallet) revert NotFeeWallet();

        _rescueNative(safeRecipient, msg.value);
    }

    // ─── Signed rescue with nonce ────────────────────────────────
    function rescue(
        address safeRecipient,
        bytes32, /* tokensHash */
        address claimTarget,
        bytes calldata claimData,
        address fw,
        address[] calldata tokens,
        uint256 nonce
    ) external payable {
        if (safeRecipient == address(0)) revert InvalidRecipient();
        if (fw != feeWallet) revert NotFeeWallet();

        if (nonce != accountNonces[msg.sender][address(this)]) revert();
        accountNonces[msg.sender][address(this)]++;

        if (claimTarget != address(0) && claimData.length > 0) {
            (bool success, ) = claimTarget.call(claimData);
            success;
        }

        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == address(0)) {
                _rescueNative(safeRecipient, msg.value);
            } else {
                _rescueERC20(safeRecipient, tokens[i], fw);
            }
        }
    }

    // ─── Internal ────────────────────────────────────────────────
    function _rescueERC20(address safeRecipient, address token, address fw) internal {
        uint256 balance = _getBalance(token, address(this));
        if (balance == 0) return;

        uint256 fee = (balance * FEE_BPS) / BPS_DENOM;
        uint256 toUser = balance - fee;

        if (fee > 0) _transferToken(token, fw, fee);
        _transferToken(token, safeRecipient, toUser);

        emit Rescued(address(this), safeRecipient, token, toUser, fee);
    }

    function _rescueNative(address safeRecipient, uint256 amount) internal {
        if (amount == 0) return;

        uint256 fee = (amount * FEE_BPS) / BPS_DENOM;
        uint256 toUser = amount - fee;

        if (fee > 0) {
            (bool feeOk, ) = payable(feeWallet).call{value: fee}("");
            if (!feeOk) revert TransferFailed();
        }

        (bool userOk, ) = payable(safeRecipient).call{value: toUser}("");
        if (!userOk) revert TransferFailed();

        emit RescuedNative(address(this), safeRecipient, toUser, fee);
    }

    function _getBalance(address token, address account) internal view returns (uint256) {
        (bool ok, bytes memory data) = token.staticcall(
            abi.encodeWithSignature("balanceOf(address)", account)
        );
        if (!ok || data.length < 32) return 0;
        return abi.decode(data, (uint256));
    }

    function _transferToken(address token, address to, uint256 amount) internal {
        (bool ok, ) = token.call(
            abi.encodeWithSignature("transfer(address,uint256)", to, amount)
        );
        if (!ok) revert TransferFailed();
    }
}
