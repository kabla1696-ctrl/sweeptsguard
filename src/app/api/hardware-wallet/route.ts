import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getClientIp } from '@/lib/rateLimit'
import { sanitizeErrorMessage } from '@/lib/validation'
import { captureError } from '@/lib/sentry'

// ── In-memory device store ──────────────────────────────────

interface StoredDevice {
  id: string
  name: string
  type: 'ledger' | 'trezor' | 'airgap'
  model: string
  firmware: string
  status: 'connected' | 'disconnected' | 'locked'
  accounts: { address: string; chain: string; balance: string }[]
  lastUsed: string
  connectedAt: string
  avatar: string
}

// In-memory store
const devices = new Map<string, StoredDevice>()
let signOperations: { id: string; deviceId: string; status: string; createdAt: string; completedAt: string | null }[] = []

// Seed with a demo device for initial state
devices.set('dev-ledger-001', {
  id: 'dev-ledger-001',
  name: 'Ledger Nano X',
  type: 'ledger',
  model: 'Nano X',
  firmware: '2.2.3',
  status: 'connected',
  accounts: [
    { address: '0x1234567890abcdef1234567890abcdef12345678', chain: 'Ethereum', balance: '12.5 ETH' },
    { address: '0x1234567890abcdef1234567890abcdef12345678', chain: 'Bitcoin', balance: '0.45 BTC' },
  ],
  lastUsed: new Date().toISOString(),
  connectedAt: new Date().toISOString(),
  avatar: '🔐',
})

devices.set('dev-trezor-001', {
  id: 'dev-trezor-001',
  name: 'Trezor Model T',
  type: 'trezor',
  model: 'Model T',
  firmware: '2.6.0',
  status: 'disconnected',
  accounts: [
    { address: '0xabcdef0123456789abcdef0123456789abcdef01', chain: 'Ethereum', balance: '8.2 ETH' },
  ],
  lastUsed: new Date(Date.now() - 2 * 86400000).toISOString(),
  connectedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  avatar: '🔑',
})

// ── Helpers ─────────────────────────────────────────────────

function generateId(): string {
  return `hw_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function getAvatar(type: string): string {
  switch (type) {
    case 'ledger': return '🔐'
    case 'trezor': return '🔑'
    case 'airgap': return '📱'
    default: return '🔐'
  }
}

function getModelName(type: string): string {
  switch (type) {
    case 'ledger': return 'Ledger Device'
    case 'trezor': return 'Trezor Device'
    case 'airgap': return 'Air-Gapped Device'
    default: return 'Unknown Device'
  }
}

// ── Handlers ────────────────────────────────────────────────

/**
 * GET /api/hardware-wallet
 * List all connected devices
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = rateLimit(ip)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  try {
    const deviceList = Array.from(devices.values())
    return NextResponse.json({
      success: true,
      data: {
        devices: deviceList,
        signOperations: signOperations.slice(-20),
        supportedDevices: [
          { type: 'ledger', name: 'Ledger', models: ['Nano S', 'Nano X', 'Stax'], connection: 'USB/Bluetooth' },
          { type: 'trezor', name: 'Trezor', models: ['Model One', 'Model T', 'Safe 3', 'Safe 5'], connection: 'USB' },
          { type: 'airgap', name: 'Air-Gapped', models: ['Keystone 3 Pro', 'QR-based'], connection: 'QR Code' },
        ],
      },
    })
  } catch (err: unknown) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: '/api/hardware-wallet GET' })
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
}

/**
 * POST /api/hardware-wallet
 * Actions: connect, disconnect, sign, label
 * Body: { action: string, ... }
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = rateLimit(ip, 30, 60_000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const { action } = body as { action: string }

    switch (action) {
      case 'connect': {
        const { deviceType, model } = body as { deviceType: string; model?: string }
        if (!deviceType || !['ledger', 'trezor', 'airgap'].includes(deviceType)) {
          return NextResponse.json({ error: 'Invalid deviceType. Must be ledger, trezor, or airgap.' }, { status: 400 })
        }

        const id = generateId()
        const device: StoredDevice = {
          id,
          name: model || getModelName(deviceType),
          type: deviceType as StoredDevice['type'],
          model: model || getModelName(deviceType),
          firmware: '1.0.0',
          status: 'connected',
          accounts: [],
          lastUsed: new Date().toISOString(),
          connectedAt: new Date().toISOString(),
          avatar: getAvatar(deviceType),
        }
        devices.set(id, device)

        return NextResponse.json({
          success: true,
          data: device,
          message: `Device connected. Please confirm on your ${deviceType} device.`,
        })
      }

      case 'disconnect': {
        const { deviceId } = body as { deviceId: string }
        if (!deviceId) {
          return NextResponse.json({ error: 'deviceId is required' }, { status: 400 })
        }
        const device = devices.get(deviceId)
        if (!device) {
          return NextResponse.json({ error: 'Device not found' }, { status: 404 })
        }
        device.status = 'disconnected'
        devices.set(deviceId, device)
        return NextResponse.json({ success: true, data: device, message: 'Device disconnected' })
      }

      case 'sign': {
        const { deviceId, unsignedTx, chainId } = body as {
          deviceId: string
          unsignedTx: string
          chainId?: number
        }
        if (!deviceId || !unsignedTx) {
          return NextResponse.json({ error: 'deviceId and unsignedTx are required' }, { status: 400 })
        }
        const device = devices.get(deviceId)
        if (!device) {
          return NextResponse.json({ error: 'Device not found' }, { status: 404 })
        }
        if (device.status !== 'connected') {
          return NextResponse.json({ error: 'Device is not connected' }, { status: 400 })
        }

        // Create sign operation record
        const opId = generateId()
        const op = {
          id: opId,
          deviceId,
          status: 'completed',
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        }
        signOperations.push(op)
        if (signOperations.length > 100) signOperations = signOperations.slice(-100)

        // Update device lastUsed
        device.lastUsed = new Date().toISOString()
        devices.set(deviceId, device)

        // Generate a deterministic signed transaction hash
        const signedHash = '0x' + Array.from({ length: 64 }, (_, i) =>
          ((unsignedTx.charCodeAt(i % unsignedTx.length) * 31 + i * 17) & 0xf).toString(16)
        ).join('')

        return NextResponse.json({
          success: true,
          data: {
            operationId: opId,
            signedTransaction: signedHash,
            hash: signedHash,
            deviceId,
            chainId: chainId || 1,
          },
          message: 'Transaction signed successfully',
        })
      }

      case 'label': {
        const { deviceId, label } = body as { deviceId: string; label: string }
        if (!deviceId || !label) {
          return NextResponse.json({ error: 'deviceId and label are required' }, { status: 400 })
        }
        const device = devices.get(deviceId)
        if (!device) {
          return NextResponse.json({ error: 'Device not found' }, { status: 404 })
        }
        device.name = label
        devices.set(deviceId, device)
        return NextResponse.json({ success: true, data: device })
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Valid actions: connect, disconnect, sign, label` },
          { status: 400 }
        )
    }
  } catch (err: unknown) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: '/api/hardware-wallet POST' })
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
}

/**
 * DELETE /api/hardware-wallet?deviceId=xxx
 * Remove a device from the manager
 */
export async function DELETE(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = rateLimit(ip)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  try {
    const deviceId = request.nextUrl.searchParams.get('deviceId')
    if (!deviceId) {
      return NextResponse.json({ error: 'deviceId query parameter is required' }, { status: 400 })
    }
    const deleted = devices.delete(deviceId)
    if (!deleted) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, message: 'Device removed' })
  } catch (err: unknown) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
}
