// Simple Test Airdrop for Sepolia
// This creates a simple claim page without needing Hardhat

const { ethers } = require("ethers");

// Sepolia RPC
const SEPOLIA_RPC = "https://rpc.sepolia.org";

// Simple ERC-20 Token ABI (for minting)
const TOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function mint(address to, uint256 amount)"
];

// Simple Airdrop ABI
const AIRDROP_ABI = [
  "function claimSimple()",
  "function claimTo(address to)",
  "function claimed(address) view returns (bool)",
  "function balance() view returns (uint256)",
  "function claimAmount() view returns (uint256)"
];

async function main() {
  // Use a test private key (DO NOT use with real funds!)
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  
  // Create a random wallet for testing
  const wallet = ethers.Wallet.createRandom().connect(provider);
  console.log("Test Wallet:", wallet.address);
  console.log("Private Key:", wallet.privateKey);
  
  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");
  
  // Get some Sepolia ETH from faucet first!
  console.log("\n💡 Get Sepolia ETH from:");
  console.log("  - https://sepoliafaucet.com/");
  console.log("  - https://faucets.chain.link/sepolia");
  console.log("  - https://www.alchemy.com/faucets/ethereum-sepolia");
  
  console.log("\n📋 Once you have ETH, run:");
  console.log("  node scripts/test-claim.js");
}

main().catch(console.error);
