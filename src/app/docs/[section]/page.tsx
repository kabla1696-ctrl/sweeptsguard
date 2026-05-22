import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ section: string }>
}

interface DocContent {
  title: string
  description: string
  icon: string
  content: string
}

const docs: Record<string, DocContent> = {
  'getting-started': {
    title: 'Getting Started',
    description: 'Set up SweepGuard and recover your first wallet in minutes.',
    icon: '🚀',
    content: `# Getting Started with SweepGuard

SweepGuard is a multi-chain wallet recovery and monitoring platform. This guide will help you get started in minutes.

## Step 1: Access SweepGuard

Visit [sweeptsguard.vercel.app](https://sweeptsguard.vercel.app) from any device. SweepGuard is a Progressive Web App (PWA), so you can install it on your phone or desktop for quick access.

## Step 2: Enter Your Wallet Address

On the dashboard, enter the compromised wallet address. You can:

- **Type it manually** — paste the 0x address
- **Connect via WalletConnect** — if you still have access to the wallet
- **Scan a QR code** — from another device

## Step 3: Scan for Assets

Click **Scan** to discover all assets on the compromised wallet:

- **ETH and native tokens** across all supported chains
- **ERC-20 tokens** (USDC, USDT, DAI, etc.)
- **NFTs** (ERC-721 and ERC-1155)
- **DeFi positions** (staked tokens, LP tokens)

The scan covers 33+ EVM chains plus Solana.

## Step 4: Set Up Recovery

Choose your recovery method:

### Flashbots Recovery (Recommended)
- Sends transactions through the private Flashbots mempool
- Invisible to sweeper bots and front-runners
- Best for wallets with active sweeper bots

### EIP-7702 Bundle Recovery
- Uses account abstraction to batch all transfers
- Single atomic transaction — all or nothing
- Can be gas-sponsored (you don't need ETH on the compromised wallet)

### Auto-Sweep Mode
- Monitors the compromised wallet 24/7
- Automatically moves any incoming funds to your safe wallet
- Best for wallets that continue receiving funds

## Step 5: Create a Safe Wallet

You'll need a new, secure wallet to receive recovered funds:

1. **Generate a new wallet** — use a hardware wallet if possible
2. **Secure the seed phrase** — write it down, store it safely
3. **Enter the safe address** in SweepGuard

## Step 6: Execute Recovery

Review the recovery plan and execute:

- SweepGuard constructs the optimal transaction
- Routes through Flashbots for privacy
- Monitors for confirmation
- Sends alerts via Telegram/Discord when complete

## Setting Up Alerts

For ongoing monitoring, set up alerts:

- **Telegram**: Visit /bot for setup instructions
- **Discord**: Visit /discord for bot setup
- **Web**: Enable browser notifications

## Next Steps

- [How Recovery Works](/docs/how-recovery-works) — understand the technology
- [Chain Support](/docs/chain-support) — see all supported networks
- [API Reference](/docs/api-reference) — integrate into your own tools`,
  },
  'how-recovery-works': {
    title: 'How Recovery Works',
    description: 'Understand Flashbots, EIP-7702, and the recovery pipeline.',
    icon: '🔄',
    content: `# How Recovery Works

SweepGuard uses cutting-edge Ethereum technology to recover funds from compromised wallets. Here's how it works under the hood.

## The Problem

When a wallet is compromised, attackers typically deploy a "sweeper bot" — an automated script that:

1. Monitors the compromised address 24/7
2. Detects any new incoming funds or approvals
3. Immediately drains funds to the attacker's wallet
4. Often front-runs any recovery attempt

This creates a race condition: you need to move funds before the sweeper detects and front-runs you.

## The SweepGuard Solution

### Flashbots Private Transactions

Flashbots is a private transaction relay that bypasses Ethereum's public mempool. Here's why this matters:

**Without Flashbots:**
1. You submit a recovery transaction
2. It sits in the public mempool (visible to everyone)
3. The sweeper bot sees it and submits a competing transaction
4. The sweeper's transaction gets included first (higher gas)
5. Your funds are drained before your TX confirms

**With Flashbots:**
1. You submit a recovery transaction via Flashbots relay
2. The transaction goes directly to block builders
3. It's invisible in the public mempool
4. The block is built with your transaction included
5. Funds are safe before the sweeper even knows what happened

### EIP-7702 Account Abstraction

EIP-7702, activated with the Pectra upgrade, allows regular wallets to temporarily gain smart contract capabilities. SweepGuard uses this to:

**Batch Operations:**
Instead of sending 10 separate transactions to move 10 tokens, EIP-7702 lets us bundle everything into a single atomic transaction. This means:
- Lower total gas cost
- All-or-nothing execution (no partial failures)
- Faster recovery

**Gas Sponsorship:**
If the compromised wallet has no ETH for gas, EIP-7702 allows a "paymaster" to sponsor the transaction. SweepGuard can pay the gas on your behalf and deduct it from recovered funds.

**Custom Logic:**
EIP-7702 enables custom execution logic, such as:
- Time-locked transfers (delay large moves for security)
- Spending limits (auto-sweep only above a threshold)
- Multi-sig requirements (require multiple confirmations)

## Recovery Pipeline

Here's the step-by-step pipeline SweepGuard uses:

### 1. Discovery
- Scan the compromised address across 33+ chains
- Identify all assets: ETH, ERC-20s, NFTs, DeFi positions
- Check for pending transactions or approvals
- Identify the attacker's sweeper bot behavior

### 2. Strategy
- Determine optimal recovery method (Flashbots, EIP-7702, or both)
- Calculate gas costs and estimated recovery value
- Prioritize high-value assets first
- Plan for cross-chain recovery if needed

### 3. Execution
- Construct recovery transactions
- Sign with the compromised wallet's key
- Submit via Flashbots relay for privacy
- Monitor for block inclusion
- Retry with escalating gas if needed

### 4. Monitoring
- Track recovery transaction status
- Set up auto-sweep for any new incoming funds
- Send real-time alerts via Telegram/Discord
- Log all actions for audit trail

## Security Considerations

### What SweepGuard Can't Do
- **Recover funds already sent to exchanges** — those require legal action
- **Break encryption** — we need your private key or signing access
- **Reverse confirmed transactions** — blockchain is immutable
- **Guarantee recovery** — some funds may be unrecoverable

### What SweepGuard Does Protect
- **Mempool privacy** — Flashbots prevents front-running
- **Atomic execution** — EIP-7702 ensures all-or-nothing
- **Gas efficiency** — batched operations minimize costs
- **Speed** — automated pipeline is faster than manual recovery`,
  },
  'chain-support': {
    title: 'Chain Support',
    description: 'Full list of supported EVM chains and Solana networks.',
    icon: '⛓️',
    content: `# Chain Support

SweepGuard supports 33+ EVM-compatible chains plus Solana. Here's the complete list.

## Ethereum & Layer 2s

| Chain | Chain ID | Native Token | Status |
|-------|----------|-------------|--------|
| Ethereum Mainnet | 1 | ETH | ✅ Full |
| Optimism | 10 | ETH | ✅ Full |
| Base | 8453 | ETH | ✅ Full |
| Arbitrum One | 42161 | ETH | ✅ Full |
| zkSync Era | 324 | ETH | ✅ Full |
| Linea | 59144 | ETH | ✅ Full |
| Scroll | 534352 | ETH | ✅ Full |
| Starknet | SN_MAIN | ETH | ✅ Full |
| Mantle | 5000 | MNT | ✅ Full |
| Blast | 81457 | ETH | ✅ Full |

## Alternative Layer 1s

| Chain | Chain ID | Native Token | Status |
|-------|----------|-------------|--------|
| Polygon | 137 | MATIC | ✅ Full |
| BNB Smart Chain | 56 | BNB | ✅ Full |
| Avalanche C-Chain | 43114 | AVAX | ✅ Full |
| Fantom | 250 | FTM | ✅ Full |
| Gnosis | 100 | xDAI | ✅ Full |
| Celo | 42220 | CELO | ✅ Full |
| Moonbeam | 1284 | GLMR | ✅ Full |
| Moonriver | 1285 | MOVR | ✅ Full |
| Cronos | 25 | CRO | ✅ Full |
| Boba | 288 | ETH | ✅ Full |

## Testnets

| Chain | Chain ID | Native Token | Status |
|-------|----------|-------------|--------|
| Sepolia | 11155111 | ETH | ✅ Full |
| Goerli | 5 | ETH | ⚠️ Deprecated |
| Mumbai | 80001 | MATIC | ⚠️ Deprecated |
| Base Sepolia | 84532 | ETH | ✅ Full |
| Arbitrum Sepolia | 421614 | ETH | ✅ Full |

## Solana

| Network | Status |
|---------|--------|
| Solana Mainnet | ✅ Full |
| Solana Devnet | ✅ Full |

Solana support includes:
- Native SOL transfers
- SPL token recovery
- Associated Token Account (ATA) handling
- Priority fee optimization

## Flashbots Availability

Flashbots private transactions are available on:
- ✅ Ethereum Mainnet
- ✅ Base
- ✅ Optimism
- ✅ Arbitrum (via compatible builders)
- ⚠️ Other chains use alternative private relay methods

## Adding New Chains

SweepGuard regularly adds support for new chains. If you need support for a chain not listed here, please reach out via our Discord or Telegram.

## Chain-Specific Considerations

### Ethereum Mainnet
- Full Flashbots support
- EIP-7702 available (Pectra upgrade)
- Highest gas costs but most liquidity

### Layer 2s (Base, Optimism, Arbitrum)
- Lower gas costs
- Flashbots support varies by L2
- Fast confirmation times

### BNB Smart Chain
- Very low gas costs
- No Flashbots (use standard private submission)
- High scam/drainer activity — extra monitoring recommended

### Solana
- Different transaction model (not EVM)
- Uses SPL token program for token recovery
- Priority fees for faster confirmation`,
  },
  'extension-setup': {
    title: 'Extension Setup',
    description: 'Configure the browser extension for real-time protection.',
    icon: '🧩',
    content: `# Extension Setup

The SweepGuard browser extension provides real-time protection by scanning transactions before you sign them.

## Installation

### Chrome / Brave / Edge
1. Visit the Chrome Web Store (link on dashboard)
2. Click "Add to Chrome"
3. Confirm the permissions
4. The SweepGuard icon will appear in your toolbar

### Firefox
1. Visit Firefox Add-ons (link on dashboard)
2. Click "Add to Firefox"
3. Confirm the permissions

## Features

### Transaction Simulation
Before you sign any transaction, the extension simulates it and shows:
- Exact token amounts being transferred
- Destination addresses
- Gas costs
- Risk assessment (safe, warning, dangerous)

### Drainer Detection
The extension maintains a database of known drainer contracts:
- Real-time comparison against known malicious addresses
- Warning popups for suspicious approvals
- Blocklist updated every hour

### Address Poisoning Protection
Detects and warns about address poisoning attacks:
- Flags tiny "dust" transactions from unknown addresses
- Highlights lookalike addresses in your transaction history
- Suggests verified addresses from your contacts

### Approval Monitoring
Tracks all token approvals across chains:
- Shows current active approvals
- Warns about unlimited approvals
- One-click revocation via Revoke.cash integration

## Configuration

After installation, click the SweepGuard icon and configure:

### Alert Settings
- **Transaction warnings**: Enable/disable simulation popups
- **Drainer alerts**: Get notified about known drainer interactions
- **Approval alerts**: Warn before signing unlimited approvals

### Safe Addresses
- Add your safe wallet addresses for quick reference
- The extension will suggest these when you need to send recovered funds

### Chain Selection
- Enable/disable specific chains
- Set priority order for multi-chain scanning

## How It Works

1. **You visit a dApp** and initiate a transaction
2. **The extension intercepts** the transaction request
3. **Transaction is simulated** against current blockchain state
4. **Risk assessment** is generated based on:
   - Destination address reputation
   - Token approval patterns
   - Known drainer signatures
   - Unusual transaction patterns
5. **You see a popup** with the assessment and details
6. **You decide** to proceed or cancel

## Troubleshooting

### Extension not detecting transactions
- Make sure the extension is enabled
- Check that the dApp is using standard wallet providers
- Try refreshing the page

### False positives
- You can whitelist specific addresses in settings
- Report false positives to help improve detection

### Performance issues
- Disable chains you don't use
- Clear the extension's cache in settings`,
  },
  'api-reference': {
    title: 'API Reference',
    description: 'Integrate SweepGuard into your own applications.',
    icon: '📡',
    content: `# API Reference

SweepGuard provides a REST API for programmatic access to scanning, recovery, and monitoring features.

## Base URL

\`\`\`
https://sweeptsguard.vercel.app/api
\`\`\`

## Authentication

API keys are required for production use. Get yours at [/api-docs](/api-docs).

\`\`\`
Authorization: Bearer YOUR_API_KEY
\`\`\`

## Endpoints

### Scan Wallet

Scan a wallet address for assets across all chains.

\`\`\`
POST /api/scan
Content-Type: application/json

{
  "address": "0x...",
  "chains": ["1", "137", "42161"]  // optional, defaults to all
}
\`\`\`

**Response:**
\`\`\`json
{
  "ok": true,
  "address": "0x...",
  "assets": {
    "native": [
      { "chain": "1", "symbol": "ETH", "balance": "1.5", "value": 5000 }
    ],
    "erc20": [
      { "chain": "1", "symbol": "USDC", "balance": "1000", "contract": "0x..." }
    ],
    "nfts": [
      { "chain": "1", "collection": "CryptoPunks", "tokenId": "1234" }
    ]
  }
}
\`\`\`

### Recover Funds

Initiate a recovery operation.

\`\`\`
POST /api/recover
Content-Type: application/json

{
  "compromisedAddress": "0x...",
  "safeAddress": "0x...",
  "method": "flashbots",  // "flashbots" | "eip7702" | "auto-sweep"
  "assets": ["all"]  // or specific asset addresses
}
\`\`\`

**Response:**
\`\`\`json
{
  "ok": true,
  "recoveryId": "rec_abc123",
  "status": "pending",
  "estimatedGas": "0.005 ETH",
  "assetsToRecover": 5
}
\`\`\`

### Monitor Address

Start monitoring an address for changes.

\`\`\`
POST /api/monitor
Content-Type: application/json

{
  "address": "0x...",
  "chain": "1",
  "webhookUrl": "https://your-app.com/webhook",  // optional
  "alertTypes": ["balance_change", "incoming_transfer"]
}
\`\`\`

### Gas Estimation

Get current gas prices across chains.

\`\`\`
GET /api/gas?chains=1,137,42161
\`\`\`

### Honeypot Check

Check if a token is a honeypot.

\`\`\`
POST /api/honeypot
Content-Type: application/json

{
  "address": "0x...",
  "chain": "1"
}
\`\`\`

### Scam Check

Check an address against known scam databases.

\`\`\`
POST /api/scam-check
Content-Type: application/json

{
  "address": "0x..."
}
\`\`\`

## Rate Limits

- **Free tier**: 100 requests/hour
- **Pro tier**: 10,000 requests/hour
- **Enterprise**: Custom limits

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Invalid request parameters |
| 401 | Missing or invalid API key |
| 403 | Rate limit exceeded |
| 404 | Resource not found |
| 500 | Internal server error |

## SDKs

- **JavaScript/TypeScript**: \`npm install @sweeptsguard/sdk\`
- **Python**: \`pip install sweeptsguard\`
- **Go**: \`go get github.com/sweeptsguard/go-sdk\`

## Full API Documentation

Visit [/api-docs](/api-docs) for interactive API documentation with request/response examples.`,
  },
  'faq': {
    title: 'FAQ',
    description: 'Frequently asked questions about SweepGuard.',
    icon: '❓',
    content: `# Frequently Asked Questions

## General

### What is SweepGuard?
SweepGuard is a multi-chain wallet recovery and monitoring platform. It helps users recover funds from compromised wallets using Flashbots private transactions and EIP-7702 account abstraction.

### How much does it cost?
SweepGuard charges a small percentage (5-10%) of successfully recovered funds. There are no upfront costs, subscriptions, or hidden fees. If we don't recover your funds, you don't pay.

### Which chains do you support?
We support 33+ EVM-compatible chains (Ethereum, Polygon, Arbitrum, Base, Optimism, BSC, Avalanche, etc.) plus Solana. See [Chain Support](/docs/chain-support) for the full list.

### Do I need to give you my private key?
No. SweepGuard never asks for your private key. Recovery is done by constructing transactions that you sign locally. For auto-sweep mode, you provide a signed authorization that's limited in scope.

## Recovery

### How fast do I need to act?
Speed is critical. Sweeper bots can drain funds within seconds of them arriving. The sooner you set up recovery, the better your chances.

### Can you recover funds already sent to an exchange?
No. Once funds are on an exchange, recovery requires legal action (freeze requests, law enforcement). SweepGuard can help you file freeze requests, but the actual recovery depends on the exchange's cooperation.

### What if my wallet has no ETH for gas?
EIP-7702 gas sponsorship allows SweepGuard to pay the gas on your behalf. The gas cost is deducted from recovered funds. You don't need ETH on the compromised wallet.

### Can you recover NFTs?
Yes. SweepGuard supports ERC-721 and ERC-1155 tokens. NFTs are included in the recovery bundle.

### What about DeFi positions?
SweepGuard can recover staked tokens, LP positions, and lending positions. The recovery process unstakes/unwinds these positions and transfers the underlying assets.

## Security

### Is SweepGuard safe to use?
Yes. SweepGuard uses industry-standard security practices:
- Transactions are signed locally (your key never leaves your device)
- Flashbots provides mempool privacy
- EIP-7702 ensures atomic execution
- Open-source components for transparency

### How do you protect against front-running?
All recovery transactions are sent through Flashbots' private relay. They never appear in the public mempool, making front-running impossible.

### What data do you collect?
SweepGuard collects minimal data:
- Wallet addresses you scan (for caching)
- API usage metrics (for rate limiting)
- Error logs (for debugging)

We never collect private keys, seed phrases, or personal information.

## Monitoring

### How do alerts work?
SweepGuard monitors blockchain activity in real-time. When activity is detected on your monitored wallets, you receive instant alerts via:
- Telegram bot
- Discord bot
- Email (coming soon)
- Webhook (for custom integrations)

### What triggers an alert?
- Balance changes on monitored wallets
- Incoming transfers
- Known drainer activity
- Gas price spikes (configurable threshold)
- Recovery status updates

### Can I monitor multiple wallets?
Yes. There's no limit on the number of wallets you can monitor.

## Technical

### What is Flashbots?
Flashbots is a private transaction relay for Ethereum. Instead of submitting transactions to the public mempool (where everyone can see them), Flashbots sends them directly to block builders. This prevents front-running and sandwich attacks.

### What is EIP-7702?
EIP-7702 is an Ethereum upgrade that allows regular wallets (EOAs) to temporarily gain smart contract capabilities. This enables transaction batching, gas sponsorship, and custom execution logic.

### Do you support hardware wallets?
Yes. SweepGuard works with all hardware wallets (Ledger, Trezor, GridPlus) through WalletConnect and standard wallet connections.`,
  },
  'troubleshooting': {
    title: 'Troubleshooting',
    description: 'Common issues and how to resolve them.',
    icon: '🔧',
    content: `# Troubleshooting

Common issues and solutions for SweepGuard.

## Recovery Issues

### "Transaction failed" during recovery

**Possible causes:**
- Insufficient gas — increase the gas limit
- Sweeper bot front-running — ensure Flashbots is enabled
- Token transfer restrictions — some tokens have transfer limits or blacklists

**Solutions:**
1. Make sure Flashbots is enabled in recovery settings
2. Try with a higher gas price
3. For restricted tokens, try recovering smaller amounts
4. Contact support if the issue persists

### Recovery shows "pending" for a long time

Flashbots transactions wait for the next block. If the network is congested, this can take several minutes.

**Solutions:**
1. Wait up to 5 minutes — Flashbots bundles retry automatically
2. Check the recovery ID on Etherscan for status
3. If stuck for >10 minutes, try canceling and re-submitting

### "No assets found" during scan

**Possible causes:**
- Wrong address — double-check the compromised address
- Assets on unsupported chains — check [Chain Support](/docs/chain-support)
- Assets in DeFi protocols — some positions aren't detected by basic scans

**Solutions:**
1. Verify the address is correct
2. Manually add chains you know the wallet uses
3. Check DeFi positions manually on DeBank or Zapper

### Gas estimation is too high

**Possible causes:**
- Network congestion
- Complex recovery (many tokens to move)
- Including low-value tokens that aren't worth the gas

**Solutions:**
1. Wait for lower gas prices (weekends, off-peak hours)
2. Select only high-value assets for recovery
3. Use EIP-7702 batching to reduce total gas

## Monitoring Issues

### Not receiving Telegram alerts

**Possible causes:**
- Bot token not configured
- Chat ID incorrect
- Bot was blocked

**Solutions:**
1. Check bot status at /bot
2. Verify your chat ID with @userinfobot
3. Unblock the bot and send /start
4. Check that TELEGRAM_BOT_TOKEN is set in environment

### Not receiving Discord alerts

**Possible causes:**
- Bot not invited to server
- Channel ID incorrect
- Missing permissions

**Solutions:**
1. Check bot status at /discord
2. Re-invite the bot with correct permissions
3. Verify the channel ID (enable Developer Mode in Discord)
4. Make sure the bot has Send Messages and Embed Links permissions

### Alerts are delayed

**Possible causes:**
- Network congestion affecting blockchain indexing
- Rate limiting on alert delivery

**Solutions:**
1. Alerts typically arrive within 5-30 seconds
2. If consistently delayed, check your network connection
3. Contact support if delays exceed 1 minute

## Extension Issues

### Extension not detecting transactions

**Solutions:**
1. Make sure the extension is enabled in your browser
2. Refresh the page after installing
3. Check that the dApp uses standard wallet providers (MetaMask, WalletConnect)
4. Try disabling other extensions that might conflict

### Extension slowing down browser

**Solutions:**
1. Disable chains you don't use in extension settings
2. Clear the extension cache
3. Update to the latest version

## API Issues

### 401 Unauthorized

Your API key is missing or invalid.

**Solutions:**
1. Check that you're including the Authorization header
2. Generate a new API key at /api-docs
3. Make sure there are no extra spaces in the header

### 429 Rate Limit Exceeded

You've exceeded your API rate limit.

**Solutions:**
1. Wait for the rate limit to reset (check the Retry-After header)
2. Upgrade to a higher tier for more requests
3. Implement request caching on your end

### 500 Internal Server Error

A server-side error occurred.

**Solutions:**
1. Retry the request after a few seconds
2. Check the error message for details
3. Contact support with the request ID if it persists

## Getting Help

If you can't resolve your issue:

- **Discord**: Join our server for community support
- **Telegram**: Message our support bot
- **Email**: support@sweeptsguard.vercel.app
- **GitHub**: Open an issue for technical problems`,
  },
}

const VALID_SECTIONS = Object.keys(docs)

export async function generateStaticParams() {
  return VALID_SECTIONS.map(section => ({ section }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { section } = await params
  const doc = docs[section]
  if (!doc) return {}

  return {
    title: `${doc.title} — SweepGuard Docs`,
    description: doc.description,
    openGraph: {
      title: `${doc.title} — SweepGuard Docs`,
      description: doc.description,
    },
  }
}

function renderMarkdown(md: string): string {
  let html = md
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-black/40 rounded-lg p-4 text-sm text-emerald-400 overflow-x-auto my-4"><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-black/30 px-1.5 py-0.5 rounded text-xs text-emerald-400">$1</code>')
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-8 mb-3 text-white">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-10 mb-4 text-white border-b border-white/[0.06] pb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-3xl font-bold mb-6 text-white">$1</h1>')
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    // Italic
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-400 hover:underline">$1</a>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li class="ml-4 mb-1 text-zinc-300">$1</li>')
    // Ordered lists
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 mb-1 text-zinc-300 list-decimal">$2</li>')
    // Tables
    .replace(/\|(.+)\|/g, (match) => {
      const cells = match.split('|').filter(c => c.trim())
      if (cells.every(c => /^[\s-]+$/.test(c))) return ''
      const row = cells.map(c => `<td class="px-3 py-2 border border-white/[0.06]">${c.trim()}</td>`).join('')
      return `<tr>${row}</tr>`
    })
    // Horizontal rules
    .replace(/^---$/gm, '<hr class="border-white/[0.06] my-8" />')
    // Paragraphs
    .replace(/\n\n/g, '</p><p class="mb-4 text-zinc-300 leading-relaxed">')
    .replace(/\n/g, '<br />')

  // Wrap list items
  html = html.replace(/(<li[^>]*>.*<\/li>)/gs, '<ul class="list-disc mb-4 space-y-1">$1</ul>')
  html = html.replace(/<\/ul>\s*<ul[^>]*>/g, '')

  // Wrap tables
  html = html.replace(/(<tr>.*<\/tr>)/gs, '<table class="w-full border-collapse mb-4 text-sm"><tbody>$1</tbody></table>')

  html = `<p class="mb-4 text-zinc-300 leading-relaxed">${html}</p>`

  return html
}

export default async function DocSectionPage({ params }: PageProps) {
  const { section } = await params
  const doc = docs[section]

  if (!doc) {
    notFound()
  }

  const html = renderMarkdown(doc.content)
  const currentIndex = VALID_SECTIONS.indexOf(section)
  const prevSection = currentIndex > 0 ? VALID_SECTIONS[currentIndex - 1] : null
  const nextSection = currentIndex < VALID_SECTIONS.length - 1 ? VALID_SECTIONS[currentIndex + 1] : null

  return (
    <main className="min-h-screen bg-[#030305] text-white">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-purple-500/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-pink-500/[0.03] rounded-full blur-[100px]" />
      </div>
      {/* Nav */}
      <nav className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">SweepGuard</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/docs" className="text-sm text-zinc-400 hover:text-white transition">← Docs</Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-zinc-500 mb-6">
          <Link href="/docs" className="hover:text-white transition">Docs</Link>
          <span>/</span>
          <span className="text-zinc-300">{doc.title}</span>
        </div>

        {/* Content */}
        <article>
          <div
            className="prose-custom"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </article>

        {/* Navigation */}
        <nav className="mt-12 grid grid-cols-2 gap-4">
          {prevSection ? (
            <Link href={`/docs/${prevSection}`} className="group bg-[#111118] border border-white/[0.06] rounded-xl p-4 hover:border-green-500/20 transition">
              <span className="text-xs text-zinc-500">← Previous</span>
              <p className="text-sm font-medium mt-1 group-hover:text-green-400 transition-colors">
                {docs[prevSection].icon} {docs[prevSection].title}
              </p>
            </Link>
          ) : <div />}
          {nextSection ? (
            <Link href={`/docs/${nextSection}`} className="group bg-[#111118] border border-white/[0.06] rounded-xl p-4 text-right hover:border-green-500/20 transition">
              <span className="text-xs text-zinc-500">Next →</span>
              <p className="text-sm font-medium mt-1 group-hover:text-green-400 transition-colors">
                {docs[nextSection].icon} {docs[nextSection].title}
              </p>
            </Link>
          ) : <div />}
        </nav>

        {/* Back to docs */}
        <div className="mt-8 text-center">
          <Link href="/docs" className="text-sm text-zinc-400 hover:text-white transition">
            ← Back to Documentation
          </Link>
        </div>
      </div>
    </main>
  )
}
