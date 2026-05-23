// Deploy SweepGuard Test Airdrop on Sepolia
// Usage: npx hardhat run scripts/deploy-test-airdrop.js --network sepolia

const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  // Step 1: Deploy Test Token
  console.log("\n1️⃣ Deploying Test Token...");
  const TestToken = await ethers.getContractFactory("SweepGuardTestToken");
  const token = await TestToken.deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("✅ Test Token deployed:", tokenAddress);

  // Step 2: Deploy Airdrop Contract
  console.log("\n2️⃣ Deploying Airdrop Contract...");
  
  // Empty merkle root (we'll use claimSimple for testing)
  const merkleRoot = ethers.ZeroHash;
  
  // Claim amount: 100 tokens
  const claimAmount = ethers.parseEther("100");
  
  const TestAirdrop = await ethers.getContractFactory("SweepGuardTestAirdrop");
  const airdrop = await TestAirdrop.deploy(tokenAddress, merkleRoot, claimAmount);
  await airdrop.waitForDeployment();
  const airdropAddress = await airdrop.getAddress();
  console.log("✅ Airdrop Contract deployed:", airdropAddress);

  // Step 3: Fund Airdrop Contract
  console.log("\n3️⃣ Funding Airdrop Contract...");
  const fundAmount = ethers.parseEther("10000"); // 10,000 tokens
  const approveTx = await token.approve(airdropAddress, fundAmount);
  await approveTx.wait();
  console.log("✅ Approved tokens");
  
  const fundTx = await airdrop.fund(fundAmount);
  await fundTx.wait();
  console.log("✅ Funded with 10,000 tokens");

  // Step 4: Test Claim
  console.log("\n4️⃣ Testing Claim...");
  const claimTx = await airdrop.claimSimple();
  await claimTx.wait();
  console.log("✅ Claimed 100 tokens!");

  // Check balance
  const balance = await token.balanceOf(deployer.address);
  console.log("💰 Deployer balance:", ethers.formatEther(balance), "SGTT");

  // Step 5: Create some test wallets for claim testing
  console.log("\n5️⃣ Creating Test Wallets...");
  const testWallets = [];
  for (let i = 0; i < 5; i++) {
    const wallet = ethers.Wallet.createRandom().connect(ethers.provider);
    testWallets.push(wallet);
    console.log(`  Test Wallet ${i + 1}: ${wallet.address}`);
  }

  // Print Summary
  console.log("\n" + "=".repeat(60));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=".repeat(60));
  console.log("\n📋 Contract Addresses:");
  console.log(`  Token: ${tokenAddress}`);
  console.log(`  Airdrop: ${airdropAddress}`);
  console.log("\n🔗 Block Explorer:");
  console.log(`  Token: https://sepolia.etherscan.io/address/${tokenAddress}`);
  console.log(`  Airdrop: https://sepolia.etherscan.io/address/${airdropAddress}`);
  console.log("\n💡 How to Test:");
  console.log(`  1. Add SGTT token to MetaMask: ${tokenAddress}`);
  console.log(`  2. Call claimSimple() on airdrop contract: ${airdropAddress}`);
  console.log(`  3. Each address gets 100 SGTT tokens`);
  console.log("\n📝 Contract Methods:");
  console.log("  - claimSimple() — Claim tokens (no proof needed)");
  console.log("  - claim(proof, account) — Claim with Merkle proof");
  console.log("  - claimTo(address) — Claim to specific address");
  console.log("  - balance() — Check airdrop balance");

  // Save addresses to file
  const fs = require('fs');
  const addresses = {
    network: "sepolia",
    chainId: 11155111,
    token: tokenAddress,
    airdrop: airdropAddress,
    deployer: deployer.address,
    claimAmount: "100 SGTT",
    fundedAmount: "10,000 SGTT",
    blockExplorer: {
      token: `https://sepolia.etherscan.io/address/${tokenAddress}`,
      airdrop: `https://sepolia.etherscan.io/address/${airdropAddress}`
    }
  };
  
  fs.writeFileSync(
    'test-airdrop-addresses.json',
    JSON.stringify(addresses, null, 2)
  );
  console.log("\n💾 Addresses saved to test-airdrop-addresses.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
