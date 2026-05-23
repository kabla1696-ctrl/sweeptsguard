// FeeCollector Deployment Script
// Deploy FeeCollector contract on multiple chains
// Usage: npx hardhat run scripts/deploy-fee-collector.js --network <network>

const { ethers } = require("hardhat");

// Configuration
const FEE_WALLET = "0x7A3725154a2E6468F9549334394802e9E2822C2A";
const FEE_PERCENT = 20; // 20%

// Networks to deploy (update with your RPC URLs in hardhat.config.js)
const NETWORKS = [
  { name: "ethereum", chainId: 1 },
  { name: "base", chainId: 8453 },
  { name: "bsc", chainId: 56 },
  { name: "arbitrum", chainId: 42161 },
  { name: "polygon", chainId: 137 },
  { name: "optimism", chainId: 10 },
  { name: "avalanche", chainId: 43114 },
  { name: "fantom", chainId: 250 },
  { name: "cronos", chainId: 25 },
  { name: "blast", chainId: 81457 },
  { name: "zora", chainId: 7777777 },
  { name: "polygon_zkevm", chainId: 1101 },
  { name: "manta", chainId: 169 },
  { name: "zksync", chainId: 324 },
  { name: "linea", chainId: 59144 },
];

async function deployToNetwork(network) {
  console.log(`\n🚀 Deploying to ${network.name} (chainId: ${network.chainId})...`);
  
  try {
    const [deployer] = await ethers.getSigners();
    console.log(`   Deployer: ${deployer.address}`);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);
    
    if (balance < ethers.parseEther("0.01")) {
      console.log(`   ⚠️  Low balance! Need at least 0.01 ETH for deployment`);
      return null;
    }
    
    const FeeCollector = await ethers.getContractFactory("FeeCollector");
    const feeCollector = await FeeCollector.deploy(FEE_WALLET, FEE_PERCENT);
    await feeCollector.waitForDeployment();
    
    const address = await feeCollector.getAddress();
    console.log(`   ✅ FeeCollector deployed at: ${address}`);
    console.log(`   Fee Wallet: ${FEE_WALLET}`);
    console.log(`   Fee Percent: ${FEE_PERCENT}%`);
    
    return { network: network.name, chainId: network.chainId, address };
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("🛡️  SweepGuard FeeCollector Deployment");
  console.log("=".repeat(60));
  console.log(`Fee Wallet: ${FEE_WALLET}`);
  console.log(`Fee Percent: ${FEE_PERCENT}%`);
  console.log(`Networks: ${NETWORKS.length}`);
  
  // Deploy to current network
  const network = await ethers.provider.getNetwork();
  const currentNetwork = NETWORKS.find(n => n.chainId === Number(network.chainId));
  
  if (currentNetwork) {
    const result = await deployToNetwork(currentNetwork);
    if (result) {
      console.log("\n" + "=".repeat(60));
      console.log("📋 Deployment Result:");
      console.log("=".repeat(60));
      console.log(`Network: ${result.network}`);
      console.log(`Chain ID: ${result.chainId}`);
      console.log(`Contract: ${result.address}`);
      console.log(`\nAdd this to your .env.local:`);
      console.log(`FEE_COLLECTOR_${result.chainId}=${result.address}`);
      console.log("=".repeat(60));
    }
  } else {
    console.log(`\n⚠️  Current network (chainId: ${network.chainId}) not in deployment list`);
    console.log("Please deploy manually or add to NETWORKS array");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
