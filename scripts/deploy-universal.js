// FeeCollector Universal Deployment Script
// Uses CREATE2 to deploy at SAME address on ALL chains
// Deploy ONCE, use EVERYWHERE

const { ethers } = require("hardhat");

// Configuration
const FEE_WALLET = "0x7A3725154a2E6468F9549334394802e9E2822C2A";
const FEE_PERCENT = 20; // 20%

// Salt for CREATE2 (same salt = same address on all chains)
const DEPLOYMENT_SALT = "sweeptsguard-fee-collector-v1";

// All supported chains
const CHAINS = [
  { name: "Ethereum", chainId: 1, rpc: "https://eth.drpc.org" },
  { name: "Base", chainId: 8453, rpc: "https://mainnet.base.org" },
  { name: "BNB Chain", chainId: 56, rpc: "https://bsc-dataseed.binance.org" },
  { name: "Arbitrum", chainId: 42161, rpc: "https://arb1.arbitrum.io/rpc" },
  { name: "Polygon", chainId: 137, rpc: "https://polygon-rpc.com" },
  { name: "Optimism", chainId: 10, rpc: "https://mainnet.optimism.io" },
  { name: "Avalanche", chainId: 43114, rpc: "https://api.avax.network/ext/bc/C/rpc" },
  { name: "Fantom", chainId: 250, rpc: "https://rpc.ftm.tools" },
  { name: "Cronos", chainId: 25, rpc: "https://evm.cronos.org" },
  { name: "Blast", chainId: 81457, rpc: "https://rpc.blast.io" },
  { name: "Zora", chainId: 7777777, rpc: "https://rpc.zora.energy" },
  { name: "Polygon zkEVM", chainId: 1101, rpc: "https://zkevm-rpc.com" },
  { name: "Manta Pacific", chainId: 169, rpc: "https://pacific-rpc.manta.network/http" },
  { name: "zkSync Era", chainId: 324, rpc: "https://mainnet.era.zksync.io" },
  { name: "Linea", chainId: 59144, rpc: "https://rpc.linea.build" },
];

async function predictDeploymentAddress(deployerAddress) {
  const FeeCollector = await ethers.getContractFactory("FeeCollector");
  const bytecode = FeeCollector.bytecode;
  const constructorArgs = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "uint256"],
    [FEE_WALLET, FEE_PERCENT]
  );
  const fullBytecode = bytecode + constructorArgs.slice(2);
  const bytecodeHash = ethers.keccak256(fullBytecode);
  const salt = ethers.keccak256(ethers.toUtf8Bytes(DEPLOYMENT_SALT));
  
  const address = ethers.getCreate2Address(
    deployerAddress,
    salt,
    bytecodeHash
  );
  
  return address;
}

async function deployWithCREATE2(deployer) {
  console.log("\n🚀 Deploying FeeCollector with CREATE2...");
  console.log(`   Fee Wallet: ${FEE_WALLET}`);
  console.log(`   Fee Percent: ${FEE_PERCENT}%`);
  console.log(`   Salt: ${DEPLOYMENT_SALT}`);
  
  // Predict deployment address
  const predictedAddress = await predictDeploymentAddress(deployer.address);
  console.log(`   Predicted Address: ${predictedAddress}`);
  console.log(`   (Same address on ALL chains!)`);
  
  // Deploy using CREATE2 factory
  const FeeCollector = await ethers.getContractFactory("FeeCollector");
  const bytecode = FeeCollector.bytecode;
  const constructorArgs = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "uint256"],
    [FEE_WALLET, FEE_PERCENT]
  );
  const fullBytecode = bytecode + constructorArgs.slice(2);
  const salt = ethers.keccak256(ethers.toUtf8Bytes(DEPLOYMENT_SALT));
  
  // CREATE2 Factory (standard deterministic deployment proxy)
  const CREATE2_FACTORY = "0x4e59b44847b379578588920cA78FbF26c0B4956C";
  
  try {
    // Deploy via CREATE2 factory
    const tx = await deployer.sendTransaction({
      to: CREATE2_FACTORY,
      data: ethers.concat([
        salt,
        fullBytecode
      ]),
      gasLimit: 500000n
    });
    
    console.log(`   TX Hash: ${tx.hash}`);
    await tx.wait();
    
    // Verify deployment
    const code = await ethers.provider.getCode(predictedAddress);
    if (code !== "0x") {
      console.log(`   ✅ Deployed at: ${predictedAddress}`);
      return predictedAddress;
    } else {
      console.log(`   ❌ Deployment failed`);
      return null;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    
    // Fallback: regular deployment
    console.log(`   Trying regular deployment...`);
    const feeCollector = await FeeCollector.deploy(FEE_WALLET, FEE_PERCENT);
    await feeCollector.waitForDeployment();
    const address = await feeCollector.getAddress();
    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   ⚠️  Address may differ across chains`);
    return address;
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("🛡️  SweepGuard FeeCollector - Universal Deployment");
  console.log("=".repeat(60));
  
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  console.log(`\n📍 Network: ${CHAINS.find(c => c.chainId === chainId)?.name || 'Unknown'} (${chainId})`);
  console.log(`👤 Deployer: ${deployer.address}`);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
  
  if (balance < ethers.parseEther("0.005")) {
    console.log(`\n⚠️  Low balance! Need at least 0.005 ETH for deployment`);
    return;
  }
  
  const address = await deployWithCREATE2(deployer);
  
  if (address) {
    console.log("\n" + "=".repeat(60));
    console.log("📋 DEPLOYMENT COMPLETE");
    console.log("=".repeat(60));
    console.log(`\nContract Address: ${address}`);
    console.log(`Fee Wallet: ${FEE_WALLET}`);
    console.log(`Fee Percent: ${FEE_PERCENT}%`);
    console.log(`\n✅ Add this to src/lib/claimer.ts:`);
    console.log(`\nexport const FEE_COLLECTOR_CONTRACTS: Record<number, string> = {`);
    console.log(`  ${chainId}: '${address}',`);
    console.log(`  // Deploy on other chains to get same address via CREATE2`);
    console.log(`}`);
    console.log("\n" + "=".repeat(60));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
