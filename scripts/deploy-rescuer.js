#!/usr/bin/env node
/**
 * Deploy SweepGuardRescuer to all supported chains.
 *
 * Usage:
 *   DEPLOYER_KEY=0x... node scripts/deploy-rescuer.js
 *
 * The deployer wallet = owner + feeWallet = 0x7A3725154a2E6468F9549334394802e9E2822C2A
 * Make sure the deployer has gas on each chain.
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const PLATFORM_FEE_WALLET = '0x7A3725154a2E6468F9549334394802e9E2822C2A';

// Read compiled contract
const abi = JSON.parse(fs.readFileSync(path.join(__dirname, '../build/contracts_SweepGuardRescuer_sol_SweepGuardRescuer.abi'), 'utf8'));
const bytecode = '0x' + fs.readFileSync(path.join(__dirname, '../build/contracts_SweepGuardRescuer_sol_SweepGuardRescuer.bin'), 'utf8').trim();

// All chains to deploy on
const CHAINS = [
  { id: 1,      name: 'Ethereum',   rpc: 'https://eth.drpc.org' },
  { id: 8453,   name: 'Base',       rpc: 'https://mainnet.base.org' },
  { id: 42161,  name: 'Arbitrum',   rpc: 'https://arb1.arbitrum.io/rpc' },
  { id: 10,     name: 'Optimism',   rpc: 'https://mainnet.optimism.io' },
  { id: 56,     name: 'BSC',        rpc: 'https://bsc-dataseed.binance.org' },
  { id: 137,    name: 'Polygon',    rpc: 'https://polygon-rpc.com' },
  { id: 43114,  name: 'Avalanche',  rpc: 'https://api.avax.network/ext/bc/C/rpc' },
  { id: 81457,  name: 'Blast',      rpc: 'https://rpc.blast.io' },
  { id: 324,    name: 'zkSync',     rpc: 'https://mainnet.era.zksync.io' },
  { id: 59144,  name: 'Linea',      rpc: 'https://rpc.linea.build' },
  { id: 5000,   name: 'Mantle',     rpc: 'https://rpc.mantle.xyz' },
  { id: 534352, name: 'Scroll',     rpc: 'https://rpc.scroll.io' },
  { id: 80094,  name: 'Berachain',  rpc: 'https://rpc.berachain.com' },
  { id: 1329,   name: 'Sei',        rpc: 'https://evm-rpc.sei-apis.com' },
  { id: 57073,  name: 'Ink',        rpc: 'https://rpc-gel.inkonchain.com' },
  { id: 130,    name: 'Unichain',   rpc: 'https://mainnet.unichain.org' },
  { id: 999,    name: 'HyperEVM',   rpc: 'https://rpc.hyperliquid.xyz/evm' },
  { id: 98866,  name: 'Plume',      rpc: 'https://rpc.plume.org' },
  { id: 685689, name: 'Gensyn',     rpc: 'https://gensyn-mainnet.rpc.alchemy.xyz/http' },
  { id: 9745,   name: 'Plasma',     rpc: 'https://rpc.plasma.to' },
];

async function deploy() {
  const key = process.env.DEPLOYER_KEY;
  if (!key) {
    console.error('❌ DEPLOYER_KEY env var required');
    process.exit(1);
  }

  const results = {};

  for (const chain of CHAINS) {
    try {
      console.log(`\n🚀 Deploying on ${chain.name} (${chain.id})...`);
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const wallet = new ethers.Wallet(key, provider);

      console.log(`   Deployer: ${wallet.address}`);

      const balance = await provider.getBalance(wallet.address);
      console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

      if (balance === 0n) {
        console.log(`   ⚠️ Skipping — no gas`);
        continue;
      }

      const factory = new ethers.ContractFactory(abi, bytecode, wallet);
      const contract = await factory.deploy(PLATFORM_FEE_WALLET, PLATFORM_FEE_WALLET);
      await contract.waitForDeployment();

      const address = await contract.getAddress();
      console.log(`   ✅ Deployed at: ${address}`);

      // Verify owner + feeWallet
      const owner = await contract.owner();
      const feeWallet = await contract.feeWallet();
      const feeBps = await contract.FEE_BPS();
      console.log(`   Owner: ${owner}`);
      console.log(`   FeeWallet: ${feeWallet}`);
      console.log(`   FEE_BPS: ${feeBps} (${Number(feeBps) / 100}%)`);

      results[chain.id] = {
        name: chain.name,
        address,
        txHash: contract.deploymentTransaction()?.hash,
      };
    } catch (err) {
      console.log(`   ❌ Failed: ${err.message?.slice(0, 100)}`);
    }
  }

  // Print summary
  console.log('\n\n📋 DEPLOYMENT SUMMARY');
  console.log('═'.repeat(60));

  if (Object.keys(results).length === 0) {
    console.log('No deployments succeeded.');
    return;
  }

  console.log('\n// Add to src/app/airdrop/page.tsx — SWEEPGUARD_RESCUER:');
  console.log('const SWEEPGUARD_RESCUER: Record<number, string> = {');
  for (const [chainId, r] of Object.entries(results)) {
    console.log(`  ${chainId}: '${r.address}', // ${r.name}`);
  }
  console.log('}');

  console.log('\n// Add to src/app/api/airdrop/claim/route.ts — SWEEPGUARD_RESCUER_CONTRACTS:');
  console.log('const SWEEPGUARD_RESCUER_CONTRACTS: Record<number, string> = {');
  for (const [chainId, r] of Object.entries(results)) {
    console.log(`  ${chainId}: '${r.address}', // ${r.name}`);
  }
  console.log('}');

  // Save to file
  const outPath = path.join(__dirname, '../build/deployment-results.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Results saved to: ${outPath}`);
}

deploy().catch(console.error);
