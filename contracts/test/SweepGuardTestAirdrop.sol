// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SweepGuard Test Airdrop
 * @notice Fake airdrop for testing claims — Merkle proof based
 */
contract SweepGuardTestAirdrop is Ownable {
    using SafeERC20 for IERC20;

    // Token being airdropped
    IERC20 public immutable token;

    // Merkle root of eligible addresses
    bytes32 public merkleRoot;

    // Amount per claim
    uint256 public claimAmount;

    // Track claimed addresses
    mapping(address => bool) public claimed;

    // Events
    event Claimed(address indexed account, uint256 amount);
    event MerkleRootUpdated(bytes32 newRoot);
    event ClaimAmountUpdated(uint256 newAmount);

    constructor(
        address _token,
        bytes32 _merkleRoot,
        uint256 _claimAmount
    ) Ownable(msg.sender) {
        token = IERC20(_token);
        merkleRoot = _merkleRoot;
        claimAmount = _claimAmount;
    }

    /**
     * @notice Claim airdrop tokens
     * @param proof Merkle proof
     * @param account Address claiming (for verification)
     */
    function claim(bytes32[] calldata proof, address account) external {
        require(!claimed[account], "Already claimed");
        require(_verifyProof(proof, account), "Invalid proof");

        claimed[account] = true;
        token.safeTransfer(account, claimAmount);

        emit Claimed(account, claimAmount);
    }

    /**
     * @notice Simple claim — no proof needed (for testing)
     */
    function claimSimple() external {
        require(!claimed[msg.sender], "Already claimed");

        claimed[msg.sender] = true;
        token.safeTransfer(msg.sender, claimAmount);

        emit Claimed(msg.sender, claimAmount);
    }

    /**
     * @notice Claim to a specific address (for testing)
     * @param to Recipient address
     */
    function claimTo(address to) external {
        require(!claimed[to], "Already claimed");

        claimed[to] = true;
        token.safeTransfer(to, claimAmount);

        emit Claimed(to, claimAmount);
    }

    function _verifyProof(bytes32[] calldata proof, address account) internal view returns (bool) {
        bytes32 leaf = keccak256(abi.encodePacked(account));
        return MerkleProof.verify(proof, merkleRoot, leaf);
    }

    // Owner functions
    function setMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
        merkleRoot = _merkleRoot;
        emit MerkleRootUpdated(_merkleRoot);
    }

    function setClaimAmount(uint256 _claimAmount) external onlyOwner {
        claimAmount = _claimAmount;
        emit ClaimAmountUpdated(_claimAmount);
    }

    // Fund the airdrop
    function fund(uint256 amount) external {
        token.safeTransferFrom(msg.sender, address(this), amount);
    }

    // Check balance
    function balance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }
}
