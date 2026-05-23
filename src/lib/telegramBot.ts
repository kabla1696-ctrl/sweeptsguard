// Telegram Alert Bot — Full-featured bot with commands, monitoring, and alert dispatch
import { CHAINS } from './chains'
import { isValidAddress } from './validation'

const TELEGRAM_API = 'https://api.telegram.org/bot'

// ============================================================
// Types
// ============================================================

export type AlertType =
  | 'balance_change'
  | 'drainer_movement'
  | 'airdrop'
  | 'gas_spike'
  | 'recovery_status'

export interface Alert {
  type: AlertType
  wallet: string
  chain: string
  message: string
  txHash?: string
  amount?: string
  timestamp: number
}

export interface BotSubscription {
  chatId: string
  address: string
  enabledAlerts: Set<AlertType>
  addedAt: number
}

export interface BotSettings {
  chatId: string
  enabledAlerts: AlertType[]
  gasThreshold?: number // gwei — alert when gas drops below this
}

// In-memory stores (production: use Redis/DB)
const subscriptions = new Map<string, BotSubscription[]>() // chatId → subscriptions
const addressSubs = new Map<string, Set<string>>()          // address → Set<chatId>
const alertHistory = new Map<string, Alert[]>()              // chatId → recent alerts
const settings = new Map<string, BotSettings>()              // chatId → settings

const ALL_ALERT_TYPES: AlertType[] = [
  'balance_change',
  'drainer_movement',
  'airdrop',
  'gas_spike',
  'recovery_status',
]

const DEFAULT_SETTINGS: (chatId: string) => BotSettings = (chatId) => ({
  chatId,
  enabledAlerts: [...ALL_ALERT_TYPES],
  gasThreshold: 20,
})

// ============================================================
// Telegram API helpers
// ============================================================

function getBotToken(): string {
  return process.env.TELEGRAM_BOT_TOKEN || ''
}

async function sendMessage(chatId: string, text: string, extra?: Record<string, unknown>): Promise<boolean> {
  const token = getBotToken()
  if (!token) return false
  try {
    const res = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
        ...extra,
      }),
    })
    const data = await res.json() as { ok?: boolean }
    return data.ok === true
  } catch {
    return false
  }
}

// ============================================================
// Command handlers
// ============================================================

function getOrCreateSettings(chatId: string): BotSettings {
  let s = settings.get(chatId)
  if (!s) {
    s = DEFAULT_SETTINGS(chatId)
    settings.set(chatId, s)
  }
  return s
}

function getSubscriptions(chatId: string): BotSubscription[] {
  return subscriptions.get(chatId) || []
}

function addSubscription(chatId: string, address: string): boolean {
  const subs = getSubscriptions(chatId)
  if (subs.some(s => s.address.toLowerCase() === address.toLowerCase())) return false

  const enabledAlerts = new Set(getOrCreateSettings(chatId).enabledAlerts)
  const sub: BotSubscription = { chatId, address, enabledAlerts, addedAt: Date.now() }
  subs.push(sub)
  subscriptions.set(chatId, subs)

  // Index by address
  let addrSet = addressSubs.get(address.toLowerCase())
  if (!addrSet) {
    addrSet = new Set()
    addressSubs.set(address.toLowerCase(), addrSet)
  }
  addrSet.add(chatId)
  return true
}

function removeSubscription(chatId: string, address: string): boolean {
  const subs = getSubscriptions(chatId)
  const idx = subs.findIndex(s => s.address.toLowerCase() === address.toLowerCase())
  if (idx === -1) return false
  subs.splice(idx, 1)
  subscriptions.set(chatId, subs)

  const addrSet = addressSubs.get(address.toLowerCase())
  if (addrSet) {
    addrSet.delete(chatId)
    if (addrSet.size === 0) addressSubs.delete(address.toLowerCase())
  }
  return true
}

function formatAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function getChainName(chain: string): string {
  // Try numeric chainId
  const id = Number(chain)
  if (!isNaN(id) && CHAINS[id]) return CHAINS[id].name
  // Try matching by name/shortName
  for (const c of Object.values(CHAINS)) {
    if (c.name.toLowerCase() === chain.toLowerCase() || c.shortName.toLowerCase() === chain.toLowerCase()) {
      return c.name
    }
  }
  return chain
}

function getEmoji(type: AlertType): string {
  const m: Record<AlertType, string> = {
    balance_change: '💰',
    drainer_movement: '🚨',
    airdrop: '🎁',
    gas_spike: '⛽',
    recovery_status: '🔄',
  }
  return m[type] || '📢'
}

// ============================================================
// Command parsing & dispatch
// ============================================================

async function handleStart(chatId: string): Promise<void> {
  const text = [
    '🛡️ *SweepGuard Alert Bot*\n',
    'Real-time alerts for your wallets. Available commands:\n',
    '`/monitor <address>` — Start monitoring a wallet',
    '`/stop <address>` — Stop monitoring',
    '`/alerts` — Show recent alerts',
    '`/settings` — Configure alert types',
    '`/status` — Bot status\n',
    '_Tip: Add multiple wallets by running /monitor for each._',
  ].join('\n')
  await sendMessage(chatId, text)
}

async function handleMonitor(chatId: string, address: string): Promise<void> {
  if (!address) {
    await sendMessage(chatId, '⚠️ Usage: `/monitor <0xAddress>`')
    return
  }
  const addr = address.trim()
  if (!isValidAddress(addr)) {
    await sendMessage(chatId, '❌ Invalid address. Must be a valid 0x EVM address.')
    return
  }

  const added = addSubscription(chatId, addr)
  if (added) {
    await sendMessage(chatId, `✅ Now monitoring \`${formatAddress(addr)}\`\n\nAlerts will be sent for: balance changes, drainer movements, airdrops, gas drops, and recovery status.`)
  } else {
    await sendMessage(chatId, `ℹ️ Already monitoring \`${formatAddress(addr)}\``)
  }
}

async function handleStop(chatId: string, address: string): Promise<void> {
  if (!address) {
    await sendMessage(chatId, '⚠️ Usage: `/stop <0xAddress>`')
    return
  }
  const addr = address.trim()
  const removed = removeSubscription(chatId, addr)
  if (removed) {
    await sendMessage(chatId, `🛑 Stopped monitoring \`${formatAddress(addr)}\``)
  } else {
    await sendMessage(chatId, `ℹ️ Not currently monitoring \`${formatAddress(addr)}\``)
  }
}

async function handleAlerts(chatId: string): Promise<void> {
  const history = alertHistory.get(chatId) || []
  if (history.length === 0) {
    await sendMessage(chatId, '📭 No alerts yet. Alerts will appear here when activity is detected.')
    return
  }

  const lines = ['📋 *Recent Alerts*\n']
  for (const alert of history.slice(-10)) {
    const emoji = getEmoji(alert.type)
    const time = new Date(alert.timestamp).toLocaleString()
    const chain = getChainName(alert.chain)
    lines.push(`${emoji} *${alert.type.replace(/_/g, ' ')}* — ${chain}`)
    lines.push(`   ${formatAddress(alert.wallet)}`)
    if (alert.amount) lines.push(`   Amount: ${alert.amount}`)
    if (alert.txHash) lines.push(`   Tx: \`${alert.txHash.slice(0, 10)}…\``)
    lines.push(`   _${time}_\n`)
  }

  await sendMessage(chatId, lines.join('\n'))
}

async function handleSettings(chatId: string): Promise<void> {
  const s = getOrCreateSettings(chatId)
  const subs = getSubscriptions(chatId)

  const lines = ['⚙️ *Bot Settings*\n']

  lines.push('*Monitored wallets:*')
  if (subs.length === 0) {
    lines.push('  _None — use /monitor <address> to add_')
  } else {
    for (const sub of subs) {
      lines.push(`  • \`${formatAddress(sub.address)}\``)
    }
  }

  lines.push('\n*Active alert types:*')
  for (const t of ALL_ALERT_TYPES) {
    const on = s.enabledAlerts.includes(t)
    lines.push(`  ${on ? '✅' : '❌'} ${getEmoji(t)} ${t.replace(/_/g, ' ')}`)
  }

  if (s.gasThreshold) {
    lines.push(`\n⛽ Gas threshold: *${s.gasThreshold} gwei*`)
  }

  await sendMessage(chatId, lines.join('\n'))
}

async function handleStatus(chatId: string): Promise<void> {
  const subs = getSubscriptions(chatId)
  const history = alertHistory.get(chatId) || []
  const s = getOrCreateSettings(chatId)

  const text = [
    '📊 *Bot Status*\n',
    `🔗 Monitored wallets: *${subs.length}*`,
    `📋 Total alerts received: *${history.length}*`,
    `🔔 Active alert types: *${s.enabledAlerts.length}/${ALL_ALERT_TYPES.length}*`,
    `⛽ Gas threshold: *${s.gasThreshold || 20} gwei*`,
    `\n_Bot is online and monitoring._`,
  ].join('\n')

  await sendMessage(chatId, text)
}

// ============================================================
// Public: Process incoming Telegram update
// ============================================================

export interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    chat: { id: number; type: string }
    text?: string
    date: number
  }
}

export async function processUpdate(update: TelegramUpdate): Promise<void> {
  const msg = update.message
  if (!msg || !msg.text) return

  const chatId = String(msg.chat.id)
  const text = msg.text.trim()
  const [command, ...args] = text.split(/\s+/)
  const arg = args.join(' ')

  switch (command.toLowerCase()) {
    case '/start':
      await handleStart(chatId)
      break
    case '/monitor':
      await handleMonitor(chatId, arg)
      break
    case '/stop':
      await handleStop(chatId, arg)
      break
    case '/alerts':
      await handleAlerts(chatId)
      break
    case '/settings':
      await handleSettings(chatId)
      break
    case '/status':
      await handleStatus(chatId)
      break
    default:
      // Ignore non-commands silently
      break
  }
}

// ============================================================
// Public: Send alerts (called by monitor/recovery systems)
// ============================================================

export function getSubscribersForAddress(address: string): string[] {
  const set = addressSubs.get(address.toLowerCase())
  return set ? Array.from(set) : []
}

export function recordAlert(alert: Alert): void {
  // Store in history for every subscribed chat
  const chatIds = getSubscribersForAddress(alert.wallet)
  for (const chatId of chatIds) {
    let history = alertHistory.get(chatId)
    if (!history) {
      history = []
      alertHistory.set(chatId, history)
    }
    history.push(alert)
    // Keep last 100
    if (history.length > 100) history.splice(0, history.length - 100)
  }
}

export async function sendTelegramAlert(alert: Alert): Promise<boolean[]> {
  const chatIds = getSubscribersForAddress(alert.wallet)
  if (chatIds.length === 0) return []

  // Check per-subscription settings
  const emoji = getEmoji(alert.type)
  const chain = getChainName(alert.chain)
  const lines = [
    `${emoji} *${alert.type.replace(/_/g, ' ').toUpperCase()}*\n`,
    `🏦 Wallet: \`${formatAddress(alert.wallet)}\``,
    `⛓️ Chain: ${chain}`,
  ]
  if (alert.amount) lines.push(`💰 Amount: ${alert.amount}`)
  if (alert.txHash) lines.push(`📝 Tx: \`${alert.txHash}\``)
  lines.push(`\n${alert.message}`)
  lines.push(`\n⏰ ${new Date(alert.timestamp).toISOString()}`)

  const text = lines.join('\n')
  const results: boolean[] = []

  for (const chatId of chatIds) {
    const s = settings.get(chatId)
    if (s && !s.enabledAlerts.includes(alert.type)) continue // User disabled this alert type
    const ok = await sendMessage(chatId, text)
    results.push(ok)
  }

  // Record in history
  recordAlert(alert)

  return results
}

// ============================================================
// Public: Send alert by chatId (for API route direct sends)
// ============================================================

export async function sendAlertToChat(chatId: string, alert: Alert): Promise<boolean> {
  const emoji = getEmoji(alert.type)
  const chain = getChainName(alert.chain)
  const lines = [
    `${emoji} *${alert.type.replace(/_/g, ' ').toUpperCase()}*\n`,
    `🏦 Wallet: \`${formatAddress(alert.wallet)}\``,
    `⛓️ Chain: ${chain}`,
  ]
  if (alert.amount) lines.push(`💰 Amount: ${alert.amount}`)
  if (alert.txHash) lines.push(`📝 Tx: \`${alert.txHash}\``)
  lines.push(`\n${alert.message}`)
  lines.push(`\n⏰ ${new Date(alert.timestamp).toISOString()}`)

  const ok = await sendMessage(chatId, lines.join('\n'))

  // Record in history
  recordAlert(alert)

  return ok
}

// ============================================================
// Public: Getters for API routes
// ============================================================

export function getSubscriptionsForChat(chatId: string): BotSubscription[] {
  return getSubscriptions(chatId)
}

export function getAlertHistoryForChat(chatId: string): Alert[] {
  return alertHistory.get(chatId) || []
}

export function getSettingsForChat(chatId: string): BotSettings {
  return getOrCreateSettings(chatId)
}

export function updateSettingsForChat(chatId: string, updates: Partial<Omit<BotSettings, 'chatId'>>): BotSettings {
  const s = getOrCreateSettings(chatId)
  if (updates.enabledAlerts) s.enabledAlerts = updates.enabledAlerts
  if (updates.gasThreshold !== undefined) s.gasThreshold = updates.gasThreshold
  settings.set(chatId, s)
  return s
}
