// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title SweepGuard Fee Collector
 * @notice Claims airdrops and splits: 80% to user, 20% to platform fee wallet
 * @dev All in one transaction — atomic, trustless, transparent
 */
contract FeeCollector {
    using SafeERC20 for IERC20;
    
    address public immutable feeWallet;
    uint256 public immutable feePercent; // 20 = 20%
    
    event Claimed(address indexed user, address indexed token, uint256 totalAmount, uint256 feeAmount, uint256 userAmount);
    event ETHClaimed(address indexed user, uint256 totalAmount, uint256 feeAmount, uint256 userAmount);
    
    error InvalidFeeWallet();
    error InvalidFeePercent();
    error ClaimFailed();
    error NoTokensClaimed();
    error TransferFailed();
    error NotAuthorized();
    error ETHTransferFailed();
    
    constructor(address _feeWallet, uint256 _feePercent) {
        if (_feeWallet == address(0)) revert InvalidFeeWallet();
        if (_feePercent > 50) revert InvalidFeePercent();
        feeWallet = _feeWallet;
        feePercent = _feePercent;
    }
    
    /**
     * @notice Claim ERC20 tokens and split between user and fee wallet
     * @param token Address of the ERC20 token
     * @param claimData Encoded claim function call data
     * @param claimContract Address of the airdrop claim contract
     * @param userWallet Address to receive user's share (80%)
     */
    function claimAndSplit(
        address token,
        bytes calldata claimData,
        address claimContract,
        address userWallet
    ) external {
        // Execute the claim
        (bool success, ) = claimContract.call(claimData);
        if (!success) revert ClaimFailed();
        
        // Get balance
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance == 0) revert NoTokensClaimed();
        
        // Calculate split
        uint256 feeAmount = (balance * feePercent) / 100;
        uint256 userAmount = balance - feeAmount;
        
        // Transfer
        IERC20(token).safeTransfer(feeWallet, feeAmount);
        IERC20(token).safeTransfer(userWallet, userAmount);
        
        emit Claimed(msg.sender, token, balance, feeAmount, userAmount);
    }
    
    /**
     * @notice Claim native ETH and split
     * @param claimContract Address of the airdrop claim contract
     * @param claimData Encoded claim function call data
     * @param userWallet Address to receive user's share
     */
    function claimETHAndSplit(
        bytes calldata claimData,
        address claimContract,
        address userWallet
    ) external payable {
        (bool success, ) = claimContract.call{value: msg.value}(claimData);
        if (!success) revert ClaimFailed();
        
        uint256 balance = address(this).balance;
        uint256 feeAmount = (balance * feePercent) / 100;
        uint256 userAmount = balance - feeAmount;
        
        (bool feeSent, ) = feeWallet.call{value: feeAmount}("");
        if (!feeSent) revert ETHTransferFailed();
        
        (bool userSent, ) = userWallet.call{value: userAmount}("");
        if (!userSent) revert ETHTransferFailed();
        
        emit ETHClaimed(msg.sender, balance, feeAmount, userAmount);
    }
    
    /**
     * @notice Batch claim multiple airdrops
     * @param claims Array of claim parameters
     */
    struct ClaimParams {
        address token;
        bytes claimData;
        address claimContract;
        address userWallet;
    }
    
    function batchClaimAndSplit(ClaimParams[] calldata claims) external {
        for (uint256 i = 0; i < claims.length; i++) {
            ClaimParams calldata claim = claims[i];
            
            // Execute the claim
            (bool success, ) = claim.claimContract.call(claim.claimData);
            if (!success) continue; // Skip failed claims
            
            // Get balance
            uint256 balance = IERC20(claim.token).balanceOf(address(this));
            if (balance == 0) continue;
            
            // Calculate split
            uint256 feeAmount = (balance * feePercent) / 100;
            uint256 userAmount = balance - feeAmount;
            
            // Transfer
            IERC20(claim.token).safeTransfer(feeWallet, feeAmount);
            IERC20(claim.token).safeTransfer(claim.userWallet, userAmount);
            
            emit Claimed(msg.sender, claim.token, balance, feeAmount, userAmount);
        }
    }
    
    /**
     * @notice Emergency withdraw (only fee wallet owner)
     */
    function emergencyWithdraw(address token) external {
        require(msg.sender == feeWallet, "Not authorized");
        if (token == address(0)) {
            (bool sent, ) = feeWallet.call{value: address(this).balance}("");
            require(sent, "ETH withdraw failed");
        } else {
            uint256 balance = IERC20(token).balanceOf(address(this));
            IERC20(token).safeTransfer(feeWallet, balance);
        }
    }
    
    /**
     * @notice Get contract info
     */
    function getInfo() external view returns (address _feeWallet, uint256 _feePercent, uint256 _ethBalance) {
        return (feeWallet, feePercent, address(this).balance);
    }
}
