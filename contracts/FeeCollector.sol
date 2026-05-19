// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SweepGuard Fee Collector
 * @notice Claims airdrops and splits: 80% to user, 20% to platform fee wallet
 * @dev All in one transaction — atomic, trustless, transparent
 */
contract FeeCollector {
    address public immutable feeWallet;
    uint256 public immutable feePercent; // 20 = 20%
    
    event Claimed(address indexed user, address indexed token, uint256 totalAmount, uint256 feeAmount, uint256 userAmount);
    
    constructor(address _feeWallet, uint256 _feePercent) {
        require(_feeWallet != address(0), "Invalid fee wallet");
        require(_feePercent <= 50, "Fee too high");
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
        require(success, "Claim failed");
        
        // Get balance
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No tokens claimed");
        
        // Calculate split
        uint256 feeAmount = (balance * feePercent) / 100;
        uint256 userAmount = balance - feeAmount;
        
        // Transfer
        require(IERC20(token).transfer(feeWallet, feeAmount), "Fee transfer failed");
        require(IERC20(token).transfer(userWallet, userAmount), "User transfer failed");
        
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
        require(success, "Claim failed");
        
        uint256 balance = address(this).balance;
        uint256 feeAmount = (balance * feePercent) / 100;
        uint256 userAmount = balance - feeAmount;
        
        (bool feeSent, ) = feeWallet.call{value: feeAmount}("");
        require(feeSent, "Fee transfer failed");
        
        (bool userSent, ) = userWallet.call{value: userAmount}("");
        require(userSent, "User transfer failed");
        
        emit Claimed(msg.sender, address(0), balance, feeAmount, userAmount);
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
            require(IERC20(token).transfer(feeWallet, balance), "Token withdraw failed");
        }
    }
}

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
}
