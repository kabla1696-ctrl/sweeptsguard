# 🛡️ SweepGuard

**Auto-Sweep Protection for Compromised EVM Wallets**

SweepGuard automatically detects incoming funds to compromised wallets and transfers them to your safe wallet before hackers can drain them.

## The Problem

Wallet drainer attacks (especially EIP-7702 based) are increasing. Once a wallet is compromised:
- Hackers use automated bots to drain funds within seconds
- Any new incoming funds (airdrops, payments, claims) are immediately stolen
- Victims have no way to protect future incoming funds

## The Solution

SweepGuard monitors your compromised wallet 24/7 across multiple chains. When funds arrive:
1. **Instant Detection** — We detect incoming transfers within seconds
2. **Auto-Sweep** — Funds are automatically transferred to your safe wallet
3. **Multi-Chain** — Works across Ethereum, Base, BSC, Arbitrum, Polygon, Optimism

## Features

- 🔍 **EIP-7702 Delegation Detection** — Identify if your wallet has been delegated to a drainer contract
- ⚡ **Real-Time Monitoring** — Balance checks every 5 seconds across all chains
- 🚀 **Auto-Sweep** — Automatic fund transfer to your safe wallet
- 🚨 **Alert System** — Get notified of any balance changes
- 📊 **Dashboard** — Monitor all your protected wallets in one place

## Supported Chains

| Chain | Status |
|-------|--------|
| Ethereum | ✅ |
| Base | ✅ |
| BNB Chain | ✅ |
| Arbitrum | ✅ |
| Polygon | ✅ |
| Optimism | ✅ |

## Getting Started

1. Visit [SweepGuard](https://sweeptsguard.vercel.app)
2. Enter your compromised wallet address to scan
3. Set up your safe wallet
4. Start monitoring — funds will be auto-swept when detected

## Tech Stack

- **Frontend**: Next.js 15, Tailwind CSS
- **Blockchain**: ethers.js v6, viem
- **API**: Next.js API Routes
- **Monitoring**: Custom WebSocket + polling engine

## Development

```bash
npm install
npm run dev
```

## How It Works

```
Compromised Wallet → [Monitoring Engine] → Detect Balance Change
                                              ↓
                                    Auto-Sweep Transaction
                                              ↓
                                      Safe Wallet ✅
```

## Security

- Private keys are **never stored** on our servers
- All sweep transactions are signed client-side
- Open source and auditable

## License

MIT

---

Built with 🛡️ by SweepGuard
