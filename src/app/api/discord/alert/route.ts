import { NextRequest, NextResponse } from 'next/server'
import { sendDiscordAlert, broadcastAlert, type DiscordAlert, type DiscordAlertType } from '@/lib/discordBot'
import { isValidAddress } from '@/lib/validation'

const VALID_ALERT_TYPES = new Set<DiscordAlertType>([
  'balance_change',
  'drainer_movement',
  'airdrop',
  'gas_spike',
  'recovery_status',
])

// POST — Send an alert to a Discord channel
// Body: { channelId, type, wallet, chain, message, txHash?, amount? }
// If channelId is provided, sends to that channel.
// If channelId is omitted, broadcasts to all channels subscribed to the wallet.
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { channelId, type, wallet, chain, message, txHash, amount } = body as {
    channelId?: string
    type?: string
    wallet?: string
    chain?: string
    message?: string
    txHash?: string
    amount?: string
  }

  // Validate required fields
  if (!type || !VALID_ALERT_TYPES.has(type as DiscordAlertType)) {
    return NextResponse.json({
      error: `Invalid or missing type. Must be one of: ${Array.from(VALID_ALERT_TYPES).join(', ')}`,
    }, { status: 400 })
  }

  if (!wallet || !isValidAddress(wallet)) {
    return NextResponse.json({ error: 'Valid wallet address required' }, { status: 400 })
  }

  if (!chain || typeof chain !== 'string') {
    return NextResponse.json({ error: 'chain is required' }, { status: 400 })
  }

  if (!message || typeof message !== 'string') {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  const alert: DiscordAlert = {
    type: type as DiscordAlertType,
    wallet,
    chain,
    message,
    txHash: typeof txHash === 'string' ? txHash : undefined,
    amount: typeof amount === 'string' ? amount : undefined,
    timestamp: Date.now(),
  }

  try {
    let results: boolean[]

    if (channelId) {
      // Direct send to specific channel
      const ok = await sendDiscordAlert(channelId, alert)
      results = [ok]
    } else {
      // Broadcast to all channels subscribed to this wallet
      results = await broadcastAlert(alert)
    }

    const sent = results.filter(Boolean).length

    return NextResponse.json({
      ok: true,
      sent,
      total: results.length,
      alert: {
        type: alert.type,
        wallet: alert.wallet,
        chain: alert.chain,
        timestamp: alert.timestamp,
      },
    })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Failed to send alert'
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}
