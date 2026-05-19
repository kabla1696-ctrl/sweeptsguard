// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SweepGuard Fee Collector v2
 * @notice Claims airdrops and splits: 80% to user, 20% to platform fee wallet
 * @dev Optimized for Flashbots atomic bundles - minimal gas usage
 * @dev Fee wallet: 0x7A3725154a2E6468F9549334394802e9E2822C2A
 */
contract FeeCollector {
    address public immutable feeWallet;
    uint256 public immutable feePercent;
    
    event Claimed(address indexed user, address indexed token, uint256 totalAmount, uint256 feeAmount, uint256 userAmount);
    event BatchClaimed(address indexed user, uint256 claimCount, uint256 totalFee);
    
    constructor(address _feeWallet, uint256 _feePercent) {
        require(_feeWallet != address(0), "Invalid fee wallet");
        require(_feePercent <= 50, "Fee too high");
        feeWallet = _feeWallet;
        feePercent = _feePercent;
    }
    
    /**
     * @notice Claim ERC20 tokens and split between user and fee wallet
     * @param token Address of the ERC20 token to claim
     * @param claimData Encoded claim function call data for the airdrop contract
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
        
        // Get claimed balance
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No tokens claimed");
        
        // Calculate split
        uint256 feeAmount = (balance * feePercent) / 100;
        uint256 userAmount = balance - feeAmount;
        
        // Transfer in single calls (gas efficient)
        IERC20(token).transfer(feeWallet, feeAmount);
        IERC20(token).transfer(userWallet, userAmount);
        
        emit Claimed(msg.sender, token, balance, feeAmount, userAmount);
    }
    
    /**
     * @notice Batch claim multiple airdrops and split each
     * @param tokens Array of token addresses
     * @param claimDatas Array of encoded claim data
     * @param claimContracts Array of claim contract addresses
     * @param userWallets Array of user wallet addresses
     */
    function batchClaimAndSplit(
        address[] calldata tokens,
        bytes[] calldata claimDatas,
        address[] calldata claimContracts,
        address[] calldata userWallets
    ) external {
        require(
            tokens.length == claimDatas.length &&
            tokens.length == claimContracts.length &&
            tokens.length == userWallets.length,
            "Array length mismatch"
        );
        
        uint256 totalFee;
        
        for (uint256 i = 0; i < tokens.length; i++) {
            // Execute claim
            (bool success, ) = claimContracts[i].call(claimDatas[i]);
            if (!success) continue;
            
            // Get balance
            uint256 balance = IERC20(tokens[i]).balanceOf(address(this));
            if (balance == 0) continue;
            
            // Split
            uint256 feeAmount = (balance * feePercent) / 100;
            uint256 userAmount = balance - feeAmount;
            
            // Transfer
            IERC20(tokens[i]).transfer(feeWallet, feeAmount);
            IERC20(tokens[i]).transfer(userWallets[i], userAmount);
            
            totalFee += feeAmount;
            
            emit Claimed(msg.sender, tokens[i], balance, feeAmount, userAmount);
        }
        
        emit BatchClaimed(msg.sender, tokens.length, totalFee);
    }
    
    /**
     * @notice Claim native ETH and split
     * @param claimData Encoded claim data
     * @param claimContract Address of claim contract
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
     * @notice Emergency withdraw (only fee wallet)
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
     * @notice Get contract info
     */
    function getInfo() external view returns (address _feeWallet, uint256 _feePercent) {
        return (feeWallet, feePercent);
    }
}

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
}
