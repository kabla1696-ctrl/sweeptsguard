import { NextRequest, NextResponse } from 'next/server'
import { sendAlertToChat, sendTelegramAlert, type Alert, type AlertType } from '@/lib/telegramBot'
import { isValidAddress } from '@/lib/validation'

const VALID_ALERT_TYPES = new Set<AlertType>([
  'balance_change',
  'drainer_movement',
  'airdrop',
  'gas_spike',
  'recovery_status',
])

// POST — Send an alert
// Body: { chatId?, type, wallet, chain, message, txHash?, amount? }
// If chatId is provided, sends to that chat directly.
// If chatId is omitted, sends to all subscribers of the wallet.
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { chatId, type, wallet, chain, message, txHash, amount, data } = body as {
    chatId?: string
    type?: string
    wallet?: string
    chain?: string
    message?: string
    txHash?: string
    amount?: string
    data?: Record<string, unknown>
  }

  // Validate required fields
  if (!type || !VALID_ALERT_TYPES.has(type as AlertType)) {
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

  const alert: Alert = {
    type: type as AlertType,
    wallet,
    chain,
    message,
    txHash: typeof txHash === 'string' ? txHash : undefined,
    amount: typeof amount === 'string' ? amount : undefined,
    timestamp: Date.now(),
  }

  try {
    let results: boolean[]

    if (chatId) {
      // Direct send to specific chat
      const ok = await sendAlertToChat(chatId, alert)
      results = [ok]
    } else {
      // Broadcast to all subscribers of this wallet
      results = await sendTelegramAlert(alert)
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

// GET — Fetch alert history for a chat
export async function GET(request: NextRequest) {
  const chatId = request.nextUrl.searchParams.get('chatId')

  if (!chatId) {
    return NextResponse.json({ error: 'chatId query param required' }, { status: 400 })
  }

  const { getAlertHistoryForChat, getSubscriptionsForChat, getSettingsForChat } = await import('@/lib/telegramBot')

  return NextResponse.json({
    ok: true,
    chatId,
    subscriptions: getSubscriptionsForChat(chatId),
    alerts: getAlertHistoryForChat(chatId).slice(-50),
    settings: getSettingsForChat(chatId),
  })
}
