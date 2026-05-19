import { NextRequest, NextResponse } from 'next/server'
import { createMonitor, type MonitorAlert } from '@/lib/monitor'
import type { SweepResult } from '@/lib/sweeper'

// In-memory store (in production, use Redis/DB)
const monitors = new Map<string, ReturnType<typeof createMonitor>>()
const monitorAlerts = new Map<string, MonitorAlert[]>()
const monitorSweeps = new Map<string, SweepResult[]>()

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action, address, safeAddress, privateKey, chainIds } = body

  if (!address) {
    return NextResponse.json({ error: 'Address required' }, { status: 400 })
  }

  switch (action) {
    case 'start': {
      if (!safeAddress || !privateKey) {
        return NextResponse.json({ error: 'Safe address and private key required' }, { status: 400 })
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
        checkIntervalMs: 5000, // Check every 5 seconds
        onAlert: (alert) => {
          alerts.push(alert)
          // Keep last 100 alerts
          if (alerts.length > 100) alerts.shift()
        },
        onSweep: (result) => {
          sweeps.push(result)
          // Keep last 50 sweeps
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
}

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address')

  if (!address) {
    return NextResponse.json({ error: 'Address required' }, { status: 400 })
  }

  const monitor = monitors.get(address)
  const alerts = monitorAlerts.get(address) || []
  const sweeps = monitorSweeps.get(address) || []

  return NextResponse.json({
    running: monitor !== undefined,
    address,
    safeAddress: '',
    chains: [1, 8453, 56, 42161, 137, 10],
    alerts: alerts.slice(-20),
    sweeps: sweeps.slice(-20)
  })
}
