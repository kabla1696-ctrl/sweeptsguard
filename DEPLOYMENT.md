# 🚀 FeeCollector Deployment Guide

## Quick Deploy (Recommended)

### Step 1: Get Deployer Wallet Private Key
You need a wallet with gas on all chains. Best approach:
- Use a fresh wallet dedicated for deployments
- Fund it with ETH/BNB/MATIC on each chain

### Step 2: Set Environment Variables
Create `.env` file in project root:
```bash
# Deployer private key (WITHOUT 0x prefix)
DEPLOYER_KEY=your_private_key_here

# RPC URLs (optional - defaults provided)
ETH_RPC=https://eth.drpc.org
BASE_RPC=https://mainnet.base.org
BSC_RPC=https://bsc-dataseed.binance.org
ARB_RPC=https://arb1.arbitrum.io/rpc
POLYGON_RPC=https://polygon-rpc.com
OP_RPC=https://mainnet.optimism.io
AVAX_RPC=https://api.avax.network/ext/bc/C/rpc
FTM_RPC=https://rpc.ftm.tools
CRO_RPC=https://evm.cronos.org
BLAST_RPC=https://rpc.blast.io
ZORA_RPC=https://rpc.zora.energy
PZKEVM_RPC=https://zkevm-rpc.com
MANTA_RPC=https://pacific-rpc.manta.network/http
ZKSYNC_RPC=https://mainnet.era.zksync.io
LINEA_RPC=https://rpc.linea.build

# Block Explorer API Keys (for verification)
ETHERSCAN_API_KEY=xxx
BASESCAN_API_KEY=xxx
BSCSCAN_API_KEY=xxx
ARBISCAN_API_KEY=xxx
POLYGONSCAN_API_KEY=xxx
```

### Step 3: Install Dependencies
```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox @openzeppelin/contracts
```

### Step 4: Deploy to Each Chain
```bash
# Deploy to Ethereum
npx hardhat run scripts/deploy-fee-collector.js --network ethereum

# Deploy to Base
npx hardhat run scripts/deploy-fee-collector.js --network base

# Deploy to BNB Chain
npx hardhat run scripts/deploy-fee-collector.js --network bsc

# Deploy to Arbitrum
npx hardhat run scripts/deploy-fee-collector.js --network arbitrum

# Deploy to Polygon
npx hardhat run scripts/deploy-fee-collector.js --network polygon

# Deploy to Optimism
npx hardhat run scripts/deploy-fee-collector.js --network optimism

# Deploy to Avalanche
npx hardhat run scripts/deploy-fee-collector.js --network avalanche

# Deploy to Fantom
npx hardhat run scripts/deploy-fee-collector.js --network fantom

# Deploy to Cronos
npx hardhat run scripts/deploy-fee-collector.js --network cronos

# Deploy to Blast
npx hardhat run scripts/deploy-fee-collector.js --network blast

# Deploy to Zora
npx hardhat run scripts/deploy-fee-collector.js --network zora

# Deploy to Polygon zkEVM
npx hardhat run scripts/deploy-fee-collector.js --network polygon_zkevm

# Deploy to Manta
npx hardhat run scripts/deploy-fee-collector.js --network manta

# Deploy to zkSync
npx hardhat run scripts/deploy-fee-collector.js --network zksync

# Deploy to Linea
npx hardhat run scripts/deploy-fee-collector.js --network linea
```

### Step 5: Update Contract Addresses
After deployment, update `src/lib/claimer.ts`:
```typescript
export const FEE_COLLECTOR_CONTRACTS: Record<number, string> = {
  1: '0x...', // Ethereum
  8453: '0x...', // Base
  56: '0x...', // BNB Chain
  42161: '0x...', // Arbitrum
  137: '0x...', // Polygon
  10: '0x...', // Optimism
  43114: '0x...', // Avalanche
  250: '0x...', // Fantom
  25: '0x...', // Cronos
  81457: '0x...', // Blast
  7777777: '0x...', // Zora
  1101: '0x...', // Polygon zkEVM
  169: '0x...', // Manta Pacific
  324: '0x...', // zkSync Era
  59144: '0x...', // Linea
}
```

### Step 6: Verify Contracts (Optional)
```bash
npx hardhat verify --network <network> <contract_address> "0x7A3725154a2E6468F9549334394802e9E2822C2A" "20"
```

---

## 🎯 One-Click Deploy Script

Save time with this script:
```bash
#!/bin/bash
# deploy-all.sh

NETWORKS=("ethereum" "base" "bsc" "arbitrum" "polygon" "optimism" "avalanche" "fantom" "cronos" "blast" "zora" "polygon_zkevm" "manta" "zksync" "linea")

for network in "${NETWORKS[@]}"; do
  echo "Deploying to $network..."
  npx hardhat run scripts/deploy-fee-collector.js --network $network
  echo "---"
done
```

---

## 💰 Gas Costs (Estimated)

| Chain | Gas Cost | Recommended |
|-------|----------|-------------|
| Ethereum | ~$50-100 | 0.1 ETH |
| Base | ~$0.01 | 0.001 ETH |
| BNB Chain | ~$0.05 | 0.005 BNB |
| Arbitrum | ~$0.01 | 0.001 ETH |
| Polygon | ~$0.01 | 0.01 MATIC |
| Optimism | ~$0.01 | 0.001 ETH |
| Avalanche | ~$0.05 | 0.01 AVAX |
| Fantom | ~$0.01 | 0.1 FTM |
| Cronos | ~$0.01 | 0.1 CRO |
| Blast | ~$0.01 | 0.001 ETH |
| Zora | ~$0.01 | 0.001 ETH |
| Polygon zkEVM | ~$0.01 | 0.001 ETH |
| Manta | ~$0.01 | 0.001 ETH |
| zkSync | ~$0.05 | 0.005 ETH |
| Linea | ~$0.01 | 0.001 ETH |

**Total estimated: ~$100-200 for all chains**

---

## 🔐 Security

- FeeCollector contract is **immutable** — fee wallet and percent cannot be changed
- **Trustless** — smart contract enforces 80/20 split
- **Transparent** — all transactions visible on-chain
- **Emergency withdraw** — only fee wallet can withdraw stuck funds

---

## 📊 Contract Functions

| Function | Description |
|----------|-------------|
| `claimAndSplit()` | Claim ERC20 + split 80/20 |
| `claimETHAndSplit()` | Claim ETH + split 80/20 |
| `batchClaimAndSplit()` | Batch claim multiple airdrops |
| `emergencyWithdraw()` | Withdraw stuck funds (fee wallet only) |
| `getInfo()` | Get contract info |

---

## ✅ After Deployment

1. Update `FEE_COLLECTOR_CONTRACTS` in `claimer.ts`
2. Push to GitHub
3. Vercel auto-deploys
4. Start earning 20% on every airdrop claim! 💰
