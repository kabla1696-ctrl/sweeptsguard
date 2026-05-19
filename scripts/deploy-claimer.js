// SweepGuardClaimer Deployment Script
// Deploys the EIP-712 signature-based claim contract on all supported chains
// Uses CREATE2 for deterministic addresses across chains

const { ethers } = require("hardhat");

// Configuration
const FEE_WALLET = "0x7A3725154a2E6468F9549334394802e9E2822C2A";
const FEE_PERCENT = 20; // 20%

// Salt for CREATE2 (same salt = same address on all chains)
const DEPLOYMENT_SALT = "sweeptsguard-claimer-v1";

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
  { name: "Mantle", chainId: 5000, rpc: "https://rpc.mantle.xyz" },
  { name: "Mode", chainId: 34443, rpc: "https://mainnet.mode.network" },
  { name: "Scroll", chainId: 534352, rpc: "https://rpc.scroll.io" },
  { name: "Gnosis", chainId: 100, rpc: "https://rpc.gnosischain.com" },
  { name: "ZetaChain", chainId: 7000, rpc: "https://zeta-chain.drpc.org" },
  { name: "Gravity", chainId: 1625, rpc: "https://rpc.gravity.xyz" },
  { name: "Core", chainId: 1116, rpc: "https://rpc.coredao.org" },
  { name: "Sei", chainId: 1329, rpc: "https://evm-rpc.sei-apis.com" },
  { name: "Berachain", chainId: 80094, rpc: "https://rpc.berachain.com" },
  { name: "Ink", chainId: 57073, rpc: "https://rpc-gel.inkonchain.com" },
  { name: "XLayer", chainId: 196, rpc: "https://rpc.xlayer.tech" },
  { name: "Hemi", chainId: 43111, rpc: "https://rpc.hemi.network" },
  { name: "Kaia", chainId: 8217, rpc: "https://public-en.node.kaia.io" },
  { name: "Soneium", chainId: 1868, rpc: "https://rpc.soneium.org" },
  { name: "Morph", chainId: 2818, rpc: "https://rpc.morphl2.io" },
  { name: "Swellchain", chainId: 1923, rpc: "https://swell-mainnet.alt.technology" },
  { name: "Monad Testnet", chainId: 10143, rpc: "https://testnet-rpc.monad.xyz" },
  { name: "0G", chainId: 0, rpc: "https://evm.0g.ai" },
];

async function predictDeploymentAddress(deployerAddress) {
  const Claimer = await ethers.getContractFactory("SweepGuardClaimer");
  const bytecode = Claimer.bytecode;
  const constructorArgs = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "uint256"],
    [FEE_WALLET, FEE_PERCENT]
  );
  const fullBytecode = bytecode + constructorArgs.slice(2);
  const bytecodeHash = ethers.keccak256(fullBytecode);
  const salt = ethers.keccak256(ethers.toUtf8Bytes(DEPLOYMENT_SALT));

  return ethers.getCreate2Address(deployerAddress, salt, bytecodeHash);
}

async function deployWithCREATE2(deployer) {
  console.log("\n🚀 Deploying SweepGuardClaimer with CREATE2...");
  console.log(`   Fee Wallet: ${FEE_WALLET}`);
  console.log(`   Fee Percent: ${FEE_PERCENT}%`);
  console.log(`   Salt: ${DEPLOYMENT_SALT}`);

  const predictedAddress = await predictDeploymentAddress(deployer.address);
  console.log(`   Predicted Address: ${predictedAddress}`);
  console.log(`   (Same address on ALL chains!)`);

  const Claimer = await ethers.getContractFactory("SweepGuardClaimer");
  const bytecode = Claimer.bytecode;
  const constructorArgs = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "uint256"],
    [FEE_WALLET, FEE_PERCENT]
  );
  const fullBytecode = bytecode + constructorArgs.slice(2);
  const salt = ethers.keccak256(ethers.toUtf8Bytes(DEPLOYMENT_SALT));

  // CREATE2 Factory (standard deterministic deployment proxy)
  const CREATE2_FACTORY = "0x4e59b44847b379578588920cA78FbF26c0B4956C";

  try {
    const tx = await deployer.sendTransaction({
      to: CREATE2_FACTORY,
      data: ethers.concat([salt, fullBytecode]),
      gasLimit: 1000000n,
    });

    console.log(`   TX Hash: ${tx.hash}`);
    await tx.wait();

    const code = await ethers.provider.getCode(predictedAddress);
    if (code !== "0x") {
      console.log(`   ✅ Deployed at: ${predictedAddress}`);
      return predictedAddress;
    } else {
      console.log(`   ❌ CREATE2 deployment failed — code not found at predicted address`);
      return null;
    }
  } catch (error) {
    console.log(`   ❌ CREATE2 error: ${error.message}`);
    console.log(`   Trying regular deployment...`);

    const claimer = await Claimer.deploy(FEE_WALLET, FEE_PERCENT);
    await claimer.waitForDeployment();
    const address = await claimer.getAddress();
    console.log(`   ✅ Deployed at: ${address}`);
    console.log(`   ⚠️  Address may differ across chains`);
    return address;
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("🛡️  SweepGuard Claimer — EIP-712 Signature Deployment");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  console.log(`\n📍 Network: ${CHAINS.find((c) => c.chainId === chainId)?.name || "Unknown"} (${chainId})`);
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
    console.log(`\n✅ Add this to src/app/api/airdrop/claim/route.ts:`);
    console.log(`\nconst CLAIMER_CONTRACTS: Record<number, string> = {`);
    console.log(`  ${chainId}: '${address}',`);
    console.log(`  // Deploy on other chains with same CREATE2 salt for identical address`);
    console.log(`}`);
    console.log(`\n✅ EIP-712 Domain:`);
    console.log(`   name: "SweepGuard"`);
    console.log(`   version: "1"`);
    console.log(`   chainId: ${chainId}`);
    console.log(`   verifyingContract: ${address}`);
    console.log("\n" + "=".repeat(60));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
