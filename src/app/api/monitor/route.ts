import { NextRequest, NextResponse } from 'next/server'
import { createMonitor, type MonitorAlert, type SweepResult } from '@/lib/monitor'
import { sanitizeErrorMessage, isValidAddress } from '@/lib/validation'

// In-memory store (in production, use Redis/DB)
const MAX_MONITORS = 100
const monitors = new Map<string, ReturnType<typeof createMonitor>>()
const monitorAlerts = new Map<string, MonitorAlert[]>()
const monitorSweeps = new Map<string, SweepResult[]>()

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const { action, address, safeAddress, privateKey, chainIds, telegramBotToken, telegramChatId, discordWebhookUrl, slackWebhookUrl } = body as {
    action?: string
    address?: string
    safeAddress?: string
    privateKey?: string
    chainIds?: number[]
    telegramBotToken?: string
    telegramChatId?: string
    discordWebhookUrl?: string
    slackWebhookUrl?: string
  }

  if (!address || typeof address !== 'string' || !isValidAddress(address)) {
    return NextResponse.json({ error: 'Valid address required' }, { status: 400 })
  }

  try {
  switch (action) {
    case 'start': {
      if (!safeAddress || !privateKey) {
        return NextResponse.json({ error: 'Safe address and private key required' }, { status: 400 })
      }
      if (!isValidAddress(safeAddress)) {
        return NextResponse.json({ error: 'Invalid safe address format' }, { status: 400 })
      }
      if (safeAddress.toLowerCase() === address.toLowerCase()) {
        return NextResponse.json({ error: 'Safe address must differ from compromised address' }, { status: 400 })
      }

      // Enforce max concurrent monitors
      if (!monitors.has(address) && monitors.size >= MAX_MONITORS) {
        return NextResponse.json({ error: `Maximum concurrent monitors (${MAX_MONITORS}) reached` }, { status: 429 })
      }

      // Stop existing monitor if any
      const existing = monitors.get(address)
      if (existing) existing.stop()

      // Create new monitor
      const alerts: MonitorAlert[] = []
      const sweeps: SweepResult[] = []

      monitorAlerts.set(address, alerts)
      monitorSweeps.set(address, sweeps)

      const monitor = createMonitor({
        address,
        safeAddress,
        privateKey,
        chainIds: chainIds || [1, 8453, 56, 42161, 137, 10],
        checkIntervalMs: 5000,
        telegramBotToken,
        telegramChatId,
        discordWebhookUrl,
        slackWebhookUrl,
        onAlert: (alert) => {
          alerts.push(alert)
          if (alerts.length > 100) alerts.shift()
        },
        onSweep: (result) => {
          sweeps.push(result)
          if (sweeps.length > 50) sweeps.shift()
        }
      })

      monitor.start()
      monitors.set(address, monitor)

      return NextResponse.json({ success: true, message: 'Monitoring started' })
    }

    case 'stop': {
      const monitor = monitors.get(address)
      if (monitor) {
        monitor.stop()
        monitors.delete(address)
      }
      return NextResponse.json({ success: true, message: 'Monitoring stopped' })
    }

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }
  } catch (err: unknown) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) || 'Monitor operation failed' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
  const address = request.nextUrl.searchParams.get('address')

  if (!address) {
    return NextResponse.json({ error: 'Address required' }, { status: 400 })
  }

  if (!isValidAddress(address)) {
    return NextResponse.json({ error: 'Invalid address format' }, { status: 400 })
  }

  const monitor = monitors.get(address)
  const alerts = monitorAlerts.get(address) || []
  const sweeps = monitorSweeps.get(address) || []

    return NextResponse.json({
      running: monitor !== undefined,
      address,
      chains: [1, 8453, 56, 42161, 137, 10],
      alerts: alerts.slice(-20),
      sweeps: sweeps.map(s => ({ ...s, chainId: s.chainId }))
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) || 'Monitor status failed' }, { status: 500 })
  }
}
