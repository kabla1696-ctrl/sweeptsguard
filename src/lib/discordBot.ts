// Discord Bot — Slash commands, embeds, alert dispatch for SweepGuard
import { isValidAddress } from './validation'
import { CHAINS } from './chains'

const DISCORD_API = 'https://discord.com/api/v10'

// ============================================================
// Types
// ============================================================

export type DiscordAlertType =
  | 'balance_change'
  | 'drainer_movement'
  | 'airdrop'
  | 'gas_spike'
  | 'recovery_status'

export interface DiscordAlert {
  type: DiscordAlertType
  wallet: string
  chain: string
  message: string
  txHash?: string
  amount?: string
  timestamp: number
}

export interface DiscordEmbed {
  title: string
  description: string
  color: number
  fields?: Array<{ name: string; value: string; inline?: boolean }>
  footer?: { text: string }
  timestamp?: string
}

export interface DiscordInteraction {
  id: string
  application_id: string
  type: number // 1=ping, 2=application_command, 3=message_component
  token: string
  data?: {
    name: string
    type: number
    options?: Array<{ name: string; type: number; value: string }>
  }
  channel_id?: string
  guild_id?: string
  member?: {
    user: { id: string; username: string }
  }
}

// ============================================================
// In-memory stores (production: use Redis/DB)
// ============================================================

const channelSubscriptions = new Map<string, Map<string, DiscordAlert[]>>() // channelId → address → alerts
const channelSettings = new Map<string, { enabledAlerts: DiscordAlertType[] }>()

const ALL_ALERT_TYPES: DiscordAlertType[] = [
  'balance_change',
  'drainer_movement',
  'airdrop',
  'gas_spike',
  'recovery_status',
]

// ============================================================
// Helpers
// ============================================================

function getBotToken(): string {
  return process.env.DISCORD_BOT_TOKEN || ''
}

function getAppId(): string {
  return process.env.DISCORD_APPLICATION_ID || ''
}

function getChainName(chain: string): string {
  const id = Number(chain)
  if (!isNaN(id) && CHAINS[id]) return CHAINS[id].name
  for (const c of Object.values(CHAINS)) {
    if (c.name.toLowerCase() === chain.toLowerCase() || c.shortName.toLowerCase() === chain.toLowerCase()) {
      return c.name
    }
  }
  return chain
}

function formatAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function getEmoji(type: DiscordAlertType): string {
  const m: Record<DiscordAlertType, string> = {
    balance_change: '💰',
    drainer_movement: '🚨',
    airdrop: '🎁',
    gas_spike: '⛽',
    recovery_status: '🔄',
  }
  return m[type] || '📢'
}

function getAlertColor(type: DiscordAlertType): number {
  const colors: Record<DiscordAlertType, number> = {
    balance_change: 0x22c55e,   // green
    drainer_movement: 0xef4444,  // red
    airdrop: 0x8b5cf6,          // purple
    gas_spike: 0xf59e0b,        // amber
    recovery_status: 0x3b82f6,  // blue
  }
  return colors[type] || 0x6b7280
}

// ============================================================
// Discord API helpers
// ============================================================

async function discordRequest(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getBotToken()
  if (!token) throw new Error('DISCORD_BOT_TOKEN not configured')

  return fetch(`${DISCORD_API}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bot ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}

async function sendChannelMessage(channelId: string, content?: string, embeds?: DiscordEmbed[]): Promise<boolean> {
  try {
    const body: Record<string, unknown> = {}
    if (content) body.content = content
    if (embeds?.length) body.embeds = embeds

    const res = await discordRequest(`/channels/${channelId}/messages`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    return res.ok
  } catch {
    return false
  }
}

async function replyToInteraction(interactionToken: string, content: string, embeds?: DiscordEmbed[], ephemeral = false): Promise<boolean> {
  try {
    const body: Record<string, unknown> = {
      content,
      flags: ephemeral ? 64 : 0, // EPHEMERAL flag
    }
    if (embeds?.length) body.embeds = embeds

    const res = await fetch(`${DISCORD_API}/interactions/${interactionToken}/callback`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${getBotToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
        data: body,
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

async function editInteractionResponse(interactionToken: string, content: string, embeds?: DiscordEmbed[]): Promise<boolean> {
  try {
    const body: Record<string, unknown> = { content }
    if (embeds?.length) body.embeds = embeds

    const res = await fetch(`${DISCORD_API}/webhooks/${getAppId()}/${interactionToken}/messages/@original`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bot ${getBotToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    return res.ok
  } catch {
    return false
  }
}

// ============================================================
// Embed builders
// ============================================================

function buildAlertEmbed(alert: DiscordAlert): DiscordEmbed {
  const emoji = getEmoji(alert.type)
  const chain = getChainName(alert.chain)
  const fields: Array<{ name: string; value: string; inline: boolean }> = [
    { name: '🏦 Wallet', value: `\`${formatAddress(alert.wallet)}\``, inline: true },
    { name: '⛓️ Chain', value: chain, inline: true },
  ]

  if (alert.amount) {
    fields.push({ name: '💰 Amount', value: alert.amount, inline: true })
  }
  if (alert.txHash) {
    fields.push({ name: '📝 Tx Hash', value: `\`${alert.txHash}\``, inline: false })
  }

  return {
    title: `${emoji} ${alert.type.replace(/_/g, ' ').toUpperCase()}`,
    description: alert.message,
    color: getAlertColor(alert.type),
    fields,
    footer: { text: 'SweepGuard Alert System' },
    timestamp: new Date(alert.timestamp).toISOString(),
  }
}

function buildStatusEmbed(subCount: number, alertCount: number, enabledTypes: number): DiscordEmbed {
  return {
    title: '📊 SweepGuard Bot Status',
    description: 'Bot is online and monitoring.',
    color: 0x22c55e,
    fields: [
      { name: '🔗 Monitored Wallets', value: String(subCount), inline: true },
      { name: '📋 Total Alerts', value: String(alertCount), inline: true },
      { name: '🔔 Active Alert Types', value: `${enabledTypes}/${ALL_ALERT_TYPES.length}`, inline: true },
    ],
    footer: { text: 'SweepGuard' },
    timestamp: new Date().toISOString(),
  }
}

function buildHelpEmbed(): DiscordEmbed {
  return {
    title: '🛡️ SweepGuard Discord Bot',
    description: 'Real-time alerts for your crypto wallets. Available slash commands:',
    color: 0x8b5cf6,
    fields: [
      { name: '/monitor <address>', value: 'Start monitoring a wallet address', inline: false },
      { name: '/stop <address>', value: 'Stop monitoring a wallet address', inline: false },
      { name: '/alerts', value: 'Show recent alerts for this channel', inline: false },
      { name: '/status', value: 'Check bot and monitoring status', inline: false },
    ],
    footer: { text: 'SweepGuard — Multi-Chain Wallet Recovery' },
    timestamp: new Date().toISOString(),
  }
}

// ============================================================
// Slash command registration
// ============================================================

export async function registerSlashCommands(): Promise<boolean> {
  const appId = getAppId()
  const token = getBotToken()
  if (!appId || !token) return false

  const commands = [
    {
      name: 'monitor',
      description: 'Start monitoring a wallet address',
      type: 1, // CHAT_INPUT
      options: [
        {
          name: 'address',
          description: 'The wallet address to monitor (0x...)',
          type: 3, // STRING
          required: true,
        },
      ],
    },
    {
      name: 'stop',
      description: 'Stop monitoring a wallet address',
      type: 1,
      options: [
        {
          name: 'address',
          description: 'The wallet address to stop monitoring',
          type: 3,
          required: true,
        },
      ],
    },
    {
      name: 'alerts',
      description: 'Show recent alerts for this channel',
      type: 1,
    },
    {
      name: 'status',
      description: 'Check bot and monitoring status',
      type: 1,
    },
  ]

  try {
    const res = await fetch(`${DISCORD_API}/applications/${appId}/commands`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bot ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
    })
    return res.ok
  } catch {
    return false
  }
}

// ============================================================
// Interaction handlers
// ============================================================

function getChannelAlerts(channelId: string): DiscordAlert[] {
  const subs = channelSubscriptions.get(channelId)
  if (!subs) return []
  const all: DiscordAlert[] = []
  for (const alerts of subs.values()) {
    all.push(...alerts)
  }
  return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10)
}

function addChannelSubscription(channelId: string, address: string): boolean {
  let subs = channelSubscriptions.get(channelId)
  if (!subs) {
    subs = new Map()
    channelSubscriptions.set(channelId, subs)
  }
  const key = address.toLowerCase()
  if (subs.has(key)) return false
  subs.set(key, [])
  return true
}

function removeChannelSubscription(channelId: string, address: string): boolean {
  const subs = channelSubscriptions.get(channelId)
  if (!subs) return false
  const key = address.toLowerCase()
  if (!subs.has(key)) return false
  subs.delete(key)
  return true
}

function getChannelSubscriptions(channelId: string): string[] {
  const subs = channelSubscriptions.get(channelId)
  return subs ? Array.from(subs.keys()) : []
}

async function handleMonitorCommand(interaction: DiscordInteraction): Promise<void> {
  const address = interaction.data?.options?.find(o => o.name === 'address')?.value
  const channelId = interaction.channel_id || ''

  if (!address) {
    await replyToInteraction(interaction.token, '⚠️ Please provide a wallet address.', undefined, true)
    return
  }

  if (!isValidAddress(address)) {
    await replyToInteraction(interaction.token, '❌ Invalid address. Must be a valid 0x EVM address.', undefined, true)
    return
  }

  const added = addChannelSubscription(channelId, address)
  if (added) {
    const embed: DiscordEmbed = {
      title: '✅ Monitoring Started',
      description: `Now monitoring \`${formatAddress(address)}\``,
      color: 0x22c55e,
      fields: [
        { name: 'Address', value: `\`${address}\``, inline: false },
        { name: 'Alerts', value: 'Balance changes, drainer movements, airdrops, gas spikes, recovery status', inline: false },
      ],
      footer: { text: 'SweepGuard' },
      timestamp: new Date().toISOString(),
    }
    await replyToInteraction(interaction.token, '', [embed])
  } else {
    await replyToInteraction(interaction.token, `ℹ️ Already monitoring \`${formatAddress(address)}\``, undefined, true)
  }
}

async function handleStopCommand(interaction: DiscordInteraction): Promise<void> {
  const address = interaction.data?.options?.find(o => o.name === 'address')?.value
  const channelId = interaction.channel_id || ''

  if (!address) {
    await replyToInteraction(interaction.token, '⚠️ Please provide a wallet address.', undefined, true)
    return
  }

  const removed = removeChannelSubscription(channelId, address)
  if (removed) {
    await replyToInteraction(interaction.token, `🛑 Stopped monitoring \`${formatAddress(address)}\``)
  } else {
    await replyToInteraction(interaction.token, `ℹ️ Not currently monitoring \`${formatAddress(address)}\``, undefined, true)
  }
}

async function handleAlertsCommand(interaction: DiscordInteraction): Promise<void> {
  const channelId = interaction.channel_id || ''
  const alerts = getChannelAlerts(channelId)

  if (alerts.length === 0) {
    await replyToInteraction(interaction.token, '📭 No alerts yet. Alerts will appear here when activity is detected on monitored wallets.', undefined, true)
    return
  }

  const embed: DiscordEmbed = {
    title: '📋 Recent Alerts',
    description: alerts.slice(0, 5).map(a => {
      const emoji = getEmoji(a.type)
      const time = new Date(a.timestamp).toLocaleString()
      return `${emoji} **${a.type.replace(/_/g, ' ')}** — ${getChainName(a.chain)}\n   \`${formatAddress(a.wallet)}\` ${a.amount ? `• ${a.amount}` : ''}\n   _${time}_`
    }).join('\n\n'),
    color: 0x8b5cf6,
    footer: { text: 'SweepGuard — Showing last 5 alerts' },
    timestamp: new Date().toISOString(),
  }

  await replyToInteraction(interaction.token, '', [embed], true)
}

async function handleStatusCommand(interaction: DiscordInteraction): Promise<void> {
  const channelId = interaction.channel_id || ''
  const subs = getChannelSubscriptions(channelId)
  const alerts = getChannelAlerts(channelId)
  const settings = channelSettings.get(channelId) || { enabledAlerts: [...ALL_ALERT_TYPES] }

  const embed = buildStatusEmbed(subs.length, alerts.length, settings.enabledAlerts.length)
  embed.fields?.push({
    name: '🔗 Monitored Addresses',
    value: subs.length > 0 ? subs.map(a => `\`${formatAddress(a)}\``).join(', ') : 'None',
    inline: false,
  })

  await replyToInteraction(interaction.token, '', [embed], true)
}

// ============================================================
// Public: Handle Discord interaction
// ============================================================

export async function handleDiscordInteraction(interaction: DiscordInteraction): Promise<void> {
  // Type 1 = PING (handled in route for verification)
  // Type 2 = APPLICATION_COMMAND
  if (interaction.type !== 2) return

  const commandName = interaction.data?.name

  switch (commandName) {
    case 'monitor':
      await handleMonitorCommand(interaction)
      break
    case 'stop':
      await handleStopCommand(interaction)
      break
    case 'alerts':
      await handleAlertsCommand(interaction)
      break
    case 'status':
      await handleStatusCommand(interaction)
      break
    default:
      await replyToInteraction(interaction.token, '❓ Unknown command. Try /monitor, /stop, /alerts, or /status.', undefined, true)
  }
}

// ============================================================
// Public: Send alert to Discord channel
// ============================================================

export async function sendDiscordAlert(channelId: string, alert: DiscordAlert): Promise<boolean> {
  const embed = buildAlertEmbed(alert)
  const ok = await sendChannelMessage(channelId, undefined, [embed])

  // Store in history
  const subs = channelSubscriptions.get(channelId)
  if (subs) {
    const key = alert.wallet.toLowerCase()
    const history = subs.get(key) || []
    history.push(alert)
    if (history.length > 50) history.splice(0, history.length - 50)
    subs.set(key, history)
  }

  return ok
}

export async function broadcastAlert(alert: DiscordAlert): Promise<boolean[]> {
  const results: boolean[] = []
  for (const [channelId, subs] of channelSubscriptions) {
    const key = alert.wallet.toLowerCase()
    if (subs.has(key)) {
      const ok = await sendDiscordAlert(channelId, alert)
      results.push(ok)
    }
  }
  return results
}

// ============================================================
// Public: Send embed to a channel
// ============================================================

export async function sendDiscordEmbed(channelId: string, embed: DiscordEmbed): Promise<boolean> {
  return sendChannelMessage(channelId, undefined, [embed])
}

// ============================================================
// Public: Getters for API routes
// ============================================================

export function getSubscriptionsForChannel(channelId: string): string[] {
  return getChannelSubscriptions(channelId)
}

export function getAlertsForChannel(channelId: string): DiscordAlert[] {
  return getChannelAlerts(channelId)
}
