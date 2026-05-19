// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SweepGuard Test Token (SGTT)
 * @notice Fake token for testing airdrop claims
 */
contract SweepGuardTestToken is ERC20, Ownable {
    constructor() ERC20("SweepGuard Test Token", "SGTT") Ownable(msg.sender) {
        // Mint 1 million tokens to deployer
        _mint(msg.sender, 1_000_000 * 10**18);
    }

    // Anyone can mint for testing
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
