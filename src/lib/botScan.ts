// Telegram Bot Wallet Scan — Scan wallets via Telegram bot commands
// /scan, inline queries, group scanning, result sharing, analytics

import { isValidAddress } from './validation'

// ============================================================
// Types
// ============================================================

export interface ScanResult {
  id: string
  address: string
  chainId: number
  chainName: string
  riskScore: number // 0–100
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical'
  balance: string
  tokenCount: number
  nftCount: number
  flags: ScanFlag[]
  approvalCount: number
  dangerousApprovals: number
  firstSeen: string
  lastActivity: string
  interactingContracts: number
  scamDetected: boolean
  summary: string
  scannedAt: number
  scannedBy: string // chatId or user
}

export interface ScanFlag {
  type: string
  severity: 'info' | 'warning' | 'danger'
  description: string
}

export interface BotCommand {
  command: string
  description: string
  usage: string
  handler: string
}

export interface InlineQueryResult {
  type: 'article'
  id: string
  title: string
  description: string
  inputMessageContent: {
    message_text: string
    parse_mode: string
  }
  thumb_url?: string
}

export interface ScanAnalytics {
  totalScans: number
  uniqueAddresses: number
  uniqueUsers: number
  scansToday: number
  averageRiskScore: number
  dangerousDetected: number
  topScannedAddresses: { address: string; count: number }[]
  scansByChain: Record<string, number>
  scansByHour: Record<string, number>
  recentScans: ScanResult[]
}

export interface BotConfig {
  botToken: string
  botUsername: string
  webhookUrl: string
  allowedGroups: string[]
  adminUsers: string[]
  maxScansPerMinute: number
  enableInlineQueries: boolean
  enableGroupScanning: boolean
  defaultChain: number
}

// ============================================================
// In-memory stores
// ============================================================

const scanHistory: ScanResult[] = []
const userScanCounts: Map<string, { count: number; resetAt: number }> = new Map()
const groupScanEnabled: Map<string, boolean> = new Map()

let botConfig: BotConfig = {
  botToken: '',
  botUsername: 'SweepGuardBot',
  webhookUrl: '',
  allowedGroups: [],
  adminUsers: [],
  maxScansPerMinute: 10,
  enableInlineQueries: true,
  enableGroupScanning: true,
  defaultChain: 1,
}

// ============================================================
// Chain info
// ============================================================

const CHAIN_INFO: Record<number, { name: string; emoji: string; explorer: string }> = {
  1: { name: 'Ethereum', emoji: '⟠', explorer: 'https://etherscan.io' },
  8453: { name: 'Base', emoji: '🔵', explorer: 'https://basescan.org' },
  56: { name: 'BNB Chain', emoji: '🟡', explorer: 'https://bscscan.com' },
  42161: { name: 'Arbitrum', emoji: '🔵', explorer: 'https://arbiscan.io' },
  137: { name: 'Polygon', emoji: '🟣', explorer: 'https://polygonscan.com' },
  10: { name: 'Optimism', emoji: '🔴', explorer: 'https://optimistic.etherscan.io' },
}

// ============================================================
// Helpers
// ============================================================

function generateId(): string {
  return `scan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function formatAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function getRiskEmoji(level: string): string {
  switch (level) {
    case 'critical': return '🔴'
    case 'high': return '🟠'
    case 'medium': return '🟡'
    case 'low': return '🟢'
    default: return '✅'
  }
}

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const record = userScanCounts.get(userId)

  if (!record || now > record.resetAt) {
    userScanCounts.set(userId, { count: 1, resetAt: now + 60000 })
    return true
  }

  if (record.count >= botConfig.maxScansPerMinute) {
    return false
  }

  record.count++
  return true
}

// ============================================================
// Core scan engine
// ============================================================

export async function scanAddress(address: string, chainId?: number, scannedBy: string = 'api'): Promise<ScanResult> {
  if (!isValidAddress(address)) {
    throw new Error('Invalid address format')
  }

  const chain = chainId || botConfig.defaultChain
  const chainInfo = CHAIN_INFO[chain] || { name: `Chain ${chain}`, emoji: '⛓️', explorer: '' }

  // Simulate scan — in production, call RPC + APIs
  const flags: ScanFlag[] = []
  let riskScore = 0

  // Simulate various checks
  const hasBalance = Math.random() > 0.3
  const balance = hasBalance ? (Math.random() * 50).toFixed(4) : '0.0000'
  const tokenCount = Math.floor(Math.random() * 20)
  const nftCount = Math.floor(Math.random() * 10)
  const approvalCount = Math.floor(Math.random() * 15)
  const dangerousApprovals = Math.floor(Math.random() * 3)

  if (dangerousApprovals > 0) {
    riskScore += dangerousApprovals * 15
    flags.push({
      type: 'dangerous_approvals',
      severity: 'danger',
      description: `${dangerousApprovals} unlimited token approval(s) detected`,
    })
  }

  if (approvalCount > 10) {
    riskScore += 10
    flags.push({
      type: 'many_approvals',
      severity: 'warning',
      description: `${approvalCount} active token approvals — consider revoking unused ones`,
    })
  }

  // Simulate scam detection
  const scamDetected = Math.random() < 0.1
  if (scamDetected) {
    riskScore += 50
    flags.push({
      type: 'scam_interaction',
      severity: 'danger',
      description: 'Wallet has interacted with known scam contracts',
    })
  }

  // Simulate inactive wallet
  const daysSinceActivity = Math.floor(Math.random() * 365)
  if (daysSinceActivity > 180) {
    flags.push({
      type: 'inactive',
      severity: 'info',
      description: `No activity for ${daysSinceActivity} days`,
    })
  }

  // Determine risk level
  const riskLevel: ScanResult['riskLevel'] =
    riskScore >= 80 ? 'critical' :
    riskScore >= 60 ? 'high' :
    riskScore >= 35 ? 'medium' :
    riskScore >= 15 ? 'low' :
    'safe'

  const summary = generateScanSummary(riskLevel, flags, balance, tokenCount)

  const result: ScanResult = {
    id: generateId(),
    address,
    chainId: chain,
    chainName: chainInfo.name,
    riskScore: Math.min(riskScore, 100),
    riskLevel,
    balance,
    tokenCount,
    nftCount,
    flags,
    approvalCount,
    dangerousApprovals,
    firstSeen: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    lastActivity: new Date(Date.now() - daysSinceActivity * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    interactingContracts: Math.floor(Math.random() * 50),
    scamDetected,
    summary,
    scannedAt: Date.now(),
    scannedBy,
  }

  scanHistory.push(result)
  return result
}

function generateScanSummary(riskLevel: string, flags: ScanFlag[], balance: string, tokenCount: number): string {
  const dangerFlags = flags.filter(f => f.severity === 'danger')
  const warningFlags = flags.filter(f => f.severity === 'warning')

  if (riskLevel === 'critical' || riskLevel === 'high') {
    return `⚠️ ${riskLevel.toUpperCase()} RISK — ${dangerFlags.length} critical issue(s) found. ${dangerFlags.map(f => f.description).join('. ')}.`
  }
  if (riskLevel === 'medium') {
    return `⚡ MEDIUM RISK — ${warningFlags.length} warning(s). ${warningFlags.map(f => f.description).join('. ')}.`
  }
  return `✅ ${riskLevel.toUpperCase()} — Wallet has ${balance} ETH and ${tokenCount} token(s). ${flags.length > 0 ? flags.length + ' note(s).' : 'No issues detected.'}`
}

// ============================================================
// Telegram command handling
// ============================================================

export interface TelegramMessage {
  chatId: string
  chatType: 'private' | 'group' | 'supergroup' | 'channel'
  userId: string
  username?: string
  text: string
  messageId: number
}

export async function handleMessage(msg: TelegramMessage): Promise<string> {
  const text = msg.text.trim()

  // Rate limiting
  if (!checkRateLimit(msg.userId)) {
    return '⏳ Rate limit exceeded. Please wait a minute before scanning again.'
  }

  // Parse command
  if (text.startsWith('/scan')) {
    return handleScanCommand(msg)
  }
  if (text.startsWith('/start')) {
    return handleStartCommand()
  }
  if (text.startsWith('/help')) {
    return handleHelpCommand()
  }
  if (text.startsWith('/history')) {
    return handleHistoryCommand(msg)
  }
  if (text.startsWith('/stats')) {
    return handleStatsCommand()
  }

  return ''
}

async function handleScanCommand(msg: TelegramMessage): Promise<string> {
  const parts = msg.text.split(/\s+/)
  const address = parts[1]
  const chainArg = parts[2]

  if (!address) {
    return [
      '🔍 *Wallet Scanner*\n',
      'Usage: `/scan <address> [chain]`\n',
      'Supported chains: `eth`, `base`, `bnb`, `arb`, `poly`, `op`',
      'Example: `/scan 0x1234...abcd eth`\n',
      '_Or use inline mode: @SweepGuardBot 0x1234..._',
    ].join('\n')
  }

  if (!isValidAddress(address)) {
    return '❌ Invalid address. Must be a valid 0x EVM address (42 characters).'
  }

  // Check group scanning permission
  if (msg.chatType !== 'private' && !botConfig.enableGroupScanning) {
    return '🔒 Group scanning is disabled. Use @SweepGuardBot in a private chat.'
  }

  const chainId = parseChainArg(chainArg)

  try {
    const result = await scanAddress(address, chainId, msg.chatId)
    return formatScanResultTelegram(result)
  } catch (err) {
    return `❌ Scan failed: ${err instanceof Error ? err.message : 'Unknown error'}`
  }
}

function parseChainArg(arg?: string): number {
  if (!arg) return botConfig.defaultChain
  const chainMap: Record<string, number> = {
    eth: 1, ethereum: 1,
    base: 8453,
    bnb: 56, bsc: 56,
    arb: 42161, arbitrum: 42161,
    poly: 137, polygon: 137,
    op: 10, optimism: 10,
  }
  return chainMap[arg.toLowerCase()] || botConfig.defaultChain
}

function formatScanResultTelegram(result: ScanResult): string {
  const riskEmoji = getRiskEmoji(result.riskLevel)
  const chainInfo = CHAIN_INFO[result.chainId]

  const lines = [
    `${riskEmoji} *Wallet Scan Result*\n`,
    `🏦 \`${result.address}\``,
    `⛓️ ${chainInfo?.emoji || ''} ${result.chainName}`,
    '',
    `📊 *Risk Score:* ${result.riskScore}/100 (${result.riskLevel.toUpperCase()})`,
    `💰 *Balance:* ${result.balance} ETH`,
    `🪙 *Tokens:* ${result.tokenCount}  |  🖼️ *NFTs:* ${result.nftCount}`,
    `🔓 *Approvals:* ${result.approvalCount} (${result.dangerousApprovals} dangerous)`,
    `📅 *First Seen:* ${result.firstSeen}`,
    `⏰ *Last Activity:* ${result.lastActivity}`,
    '',
  ]

  if (result.flags.length > 0) {
    lines.push('*🚩 Flags:*')
    for (const flag of result.flags) {
      const icon = flag.severity === 'danger' ? '🔴' : flag.severity === 'warning' ? '🟡' : 'ℹ️'
      lines.push(`  ${icon} ${flag.description}`)
    }
    lines.push('')
  }

  lines.push(result.summary)
  lines.push(`\n_Scanned at ${new Date(result.scannedAt).toLocaleString()}_`)

  return lines.join('\n')
}

function handleStartCommand(): string {
  return [
    '🛡️ *SweepGuard Wallet Scanner Bot*\n',
    'Scan any EVM wallet for risks, approvals, and scam interactions.\n',
    '*Commands:*',
    '  `/scan <address> [chain]` — Scan a wallet',
    '  `/history` — Your recent scans',
    '  `/stats` — Bot usage statistics',
    '  `/help` — Show this message\n',
    '*Inline Mode:*',
    '  `@SweepGuardBot 0xAddress` — Quick scan from any chat\n',
    '*Supported Chains:*',
    '  ⟠ Ethereum | 🔵 Base | 🟡 BNB | 🔵 Arbitrum | 🟣 Polygon | 🔴 Optimism\n',
    '_Protect your crypto. Scan before you trust._',
  ].join('\n')
}

function handleHelpCommand(): string {
  return [
    '📖 *SweepGuard Bot Help*\n',
    '*Scan a wallet:*',
    '  `/scan 0x1234...abcd` — Scan on default chain (Ethereum)',
    '  `/scan 0x1234...abcd base` — Scan on specific chain\n',
    '*Chain shortcuts:*',
    '  `eth` → Ethereum | `base` → Base | `bnb` → BNB Chain',
    '  `arb` → Arbitrum | `poly` → Polygon | `op` → Optimism\n',
    '*Inline queries:*',
    '  Type `@SweepGuardBot 0xAddress` in any chat for an instant scan card.\n',
    '*Group usage:*',
    '  Add me to a group and use `/scan` to scan addresses shared in chat.\n',
    '*Tips:*',
    '  • Scan wallets before sending funds',
    '  • Check approvals regularly',
    '  • Watch for unlimited approvals on unknown contracts',
  ].join('\n')
}

function handleHistoryCommand(msg: TelegramMessage): string {
  const userScans = scanHistory
    .filter(s => s.scannedBy === msg.chatId)
    .slice(-10)
    .reverse()

  if (userScans.length === 0) {
    return '📭 No scans yet. Use `/scan <address>` to get started!'
  }

  const lines = ['📋 *Your Recent Scans*\n']
  for (const scan of userScans) {
    const emoji = getRiskEmoji(scan.riskLevel)
    lines.push(`${emoji} \`${formatAddress(scan.address)}\` — ${scan.riskScore}/100 (${scan.riskLevel})`)
    lines.push(`   ${scan.chainName} • ${new Date(scan.scannedAt).toLocaleDateString()}\n`)
  }

  return lines.join('\n')
}

function handleStatsCommand(): string {
  const stats = getAnalytics()
  return [
    '📊 *Bot Statistics*\n',
    `🔍 Total Scans: *${stats.totalScans}*`,
    `📍 Unique Addresses: *${stats.uniqueAddresses}*`,
    `👥 Unique Users: *${stats.uniqueUsers}*`,
    `📅 Scans Today: *${stats.scansToday}*`,
    `📈 Avg Risk Score: *${stats.averageRiskScore.toFixed(1)}/100*`,
    `🚨 Dangerous Detected: *${stats.dangerousDetected}*\n`,
    '*By Chain:*',
    ...Object.entries(stats.scansByChain).map(([chain, count]) => `  ${chain}: ${count}`),
  ].join('\n')
}

// ============================================================
// Inline query support
// ============================================================

export function handleInlineQuery(query: string): InlineQueryResult[] {
  const results: InlineQueryResult[] = []

  // Check if query is an address
  const addressMatch = query.match(/(0x[0-9a-fA-F]{40})/)
  if (addressMatch) {
    const address = addressMatch[1]

    // Find existing scan result
    const existingScan = scanHistory
      .filter(s => s.address.toLowerCase() === address.toLowerCase())
      .sort((a, b) => b.scannedAt - a.scannedAt)[0]

    if (existingScan) {
      results.push({
        type: 'article',
        id: `existing_${existingScan.id}`,
        title: `${getRiskEmoji(existingScan.riskLevel)} ${formatAddress(address)} — ${existingScan.riskScore}/100`,
        description: `${existingScan.chainName} • ${existingScan.riskLevel.toUpperCase()} risk • Scanned ${new Date(existingScan.scannedAt).toLocaleDateString()}`,
        inputMessageContent: {
          message_text: formatScanResultTelegram(existingScan),
          parse_mode: 'Markdown',
        },
      })
    }

    // Always offer a fresh scan
    results.push({
      type: 'article',
      id: `fresh_${Date.now()}`,
      title: `🔍 Scan ${formatAddress(address)}`,
      description: 'Perform a fresh wallet security scan',
      inputMessageContent: {
        message_text: `🔍 *Scanning...*\n\n\`${address}\`\n\n_Initiating fresh security scan via @SweepGuardBot_`,
        parse_mode: 'Markdown',
      },
    })
  }

  // If no address, show help
  if (results.length === 0) {
    results.push({
      type: 'article',
      id: 'help',
      title: '🔍 SweepGuard Wallet Scanner',
      description: 'Enter a 0x wallet address to scan',
      inputMessageContent: {
        message_text: '🛡️ *SweepGuard Wallet Scanner*\n\nEnter a 0x address to scan for risks, approvals, and scam interactions.\n\n_Example: @SweepGuardBot 0x1234...abcd_',
        parse_mode: 'Markdown',
      },
    })
  }

  return results
}

// ============================================================
// Scan result sharing cards
// ============================================================

export function generateShareCard(result: ScanResult): string {
  const riskEmoji = getRiskEmoji(result.riskLevel)
  const bar = generateRiskBar(result.riskScore)

  return [
    '┌─────────────────────────────┐',
    '│    🛡️ SWEEPGUARD SCAN       │',
    '├─────────────────────────────┤',
    `│ ${riskEmoji} Risk: ${result.riskLevel.toUpperCase().padEnd(10)} ${result.riskScore}/100 │`,
    `│ ${bar} │`,
    `│ 🏦 ${formatAddress(result.address).padEnd(23)} │`,
    `│ ⛓️ ${result.chainName.padEnd(23)} │`,
    `│ 💰 ${result.balance.padEnd(10)} ETH            │`,
    `│ 🪙 ${result.tokenCount} tokens | 🖼️ ${String(result.nftCount).padStart(3)} NFTs   │`,
    `│ 🔓 ${result.approvalCount} approvals (${result.dangerousApprovals} danger) │`,
    '├─────────────────────────────┤',
    ...result.flags.slice(0, 3).map(f => {
      const icon = f.severity === 'danger' ? '🔴' : f.severity === 'warning' ? '🟡' : 'ℹ️'
      const desc = f.description.slice(0, 24)
      return `│ ${icon} ${desc.padEnd(24)} │`
    }),
    '├─────────────────────────────┤',
    '│ scanned by @SweepGuardBot   │',
    '└─────────────────────────────┘',
  ].join('\n')
}

function generateRiskBar(score: number): string {
  const filled = Math.round(score / 10)
  const empty = 10 - filled
  return '█'.repeat(filled) + '░'.repeat(empty)
}

// ============================================================
// Analytics
// ============================================================

export function getAnalytics(): ScanAnalytics {
  const now = Date.now()
  const todayStart = new Date().setHours(0, 0, 0, 0)

  const uniqueAddresses = new Set(scanHistory.map(s => s.address.toLowerCase())).size
  const uniqueUsers = new Set(scanHistory.map(s => s.scannedBy)).size
  const scansToday = scanHistory.filter(s => s.scannedAt >= todayStart).length
  const averageRiskScore = scanHistory.length > 0
    ? scanHistory.reduce((sum, s) => sum + s.riskScore, 0) / scanHistory.length
    : 0
  const dangerousDetected = scanHistory.filter(s => s.riskLevel === 'high' || s.riskLevel === 'critical').length

  // Top scanned addresses
  const addressCounts: Record<string, number> = {}
  for (const scan of scanHistory) {
    const addr = scan.address.toLowerCase()
    addressCounts[addr] = (addressCounts[addr] || 0) + 1
  }
  const topScannedAddresses = Object.entries(addressCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([address, count]) => ({ address, count }))

  // Scans by chain
  const scansByChain: Record<string, number> = {}
  for (const scan of scanHistory) {
    scansByChain[scan.chainName] = (scansByChain[scan.chainName] || 0) + 1
  }

  // Scans by hour
  const scansByHour: Record<string, number> = {}
  for (const scan of scanHistory) {
    const hour = new Date(scan.scannedAt).getHours()
    const key = `${hour}:00`
    scansByHour[key] = (scansByHour[key] || 0) + 1
  }

  return {
    totalScans: scanHistory.length,
    uniqueAddresses,
    uniqueUsers,
    scansToday,
    averageRiskScore,
    dangerousDetected,
    topScannedAddresses,
    scansByChain,
    scansByHour,
    recentScans: scanHistory.slice(-20).reverse(),
  }
}

export function getScanById(id: string): ScanResult | null {
  return scanHistory.find(s => s.id === id) || null
}

export function getScansByAddress(address: string): ScanResult[] {
  return scanHistory.filter(s => s.address.toLowerCase() === address.toLowerCase())
}

// ============================================================
// Bot config
// ============================================================

export function getBotConfig(): BotConfig {
  return { ...botConfig }
}

export function updateBotConfig(updates: Partial<BotConfig>): BotConfig {
  botConfig = { ...botConfig, ...updates }
  return botConfig
}

// ============================================================
// Registered bot commands (for Telegram BotFather)
// ============================================================

export const BOT_COMMANDS: BotCommand[] = [
  { command: '/scan', description: 'Scan a wallet address', usage: '/scan <address> [chain]', handler: 'handleScanCommand' },
  { command: '/start', description: 'Start the bot', usage: '/start', handler: 'handleStartCommand' },
  { command: '/help', description: 'Show help', usage: '/help', handler: 'handleHelpCommand' },
  { command: '/history', description: 'Your scan history', usage: '/history', handler: 'handleHistoryCommand' },
  { command: '/stats', description: 'Bot statistics', usage: '/stats', handler: 'handleStatsCommand' },
]
