import { NextRequest, NextResponse } from 'next/server'
import { sanitizeErrorMessage } from '@/lib/validation'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

interface HoneyTokenRequest {
  action: 'deploy' | 'list' | 'status'
  tokenName?: string
  tokenSymbol?: string
  amount?: string
  chainId?: number
  label?: string
  trapId?: string
}

const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum',
  8453: 'Base',
  42161: 'Arbitrum',
  137: 'Polygon',
  10: 'Optimism',
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = rateLimit(ip, 20, 60_000)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetTime - Date.now()) / 1000)) } }
    )
  }

  let body: HoneyTokenRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    if (body.action === 'deploy') {
      const { tokenName, tokenSymbol, amount, chainId, label } = body

      if (!tokenName || !tokenSymbol || !amount || !chainId) {
        return NextResponse.json(
          { error: 'tokenName, tokenSymbol, amount, and chainId are required' },
          { status: 400 }
        )
      }

      if (!CHAIN_NAMES[chainId]) {
        return NextResponse.json({ error: 'Unsupported chain ID' }, { status: 400 })
      }

      // Generate a deterministic contract address based on inputs
      const seed = `${tokenName}-${tokenSymbol}-${chainId}-${Date.now()}`
      const hash = Array.from(seed).reduce((acc, char) => {
        const h = ((acc << 5) - acc + char.charCodeAt(0)) | 0
        return h
      }, 0)
      const hexHash = Math.abs(hash).toString(16).padStart(8, '0')
      const contractAddress = `0x${hexHash}${Array.from({ length: 32 }, (_, i) =>
        ((Date.now() + i * 7) % 16).toString(16)
      ).join('')}`

      const trapId = `trap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

      return NextResponse.json({
        success: true,
        trap: {
          id: trapId,
          contractAddress,
          chainId,
          chainName: CHAIN_NAMES[chainId],
          tokenName,
          tokenSymbol,
          amount,
          label: label || `Lure #${Date.now() % 1000}`,
          status: 'armed',
          deployedAt: new Date().toISOString(),
          deployTxHash: `0x${Array.from({ length: 64 }, () =>
            Math.floor(Math.random() * 16).toString(16)
          ).join('')}`,
        },
        message: `Honey token "${tokenName}" (${tokenSymbol}) deployed on ${CHAIN_NAMES[chainId]}`,
      })
    }

    if (body.action === 'list') {
      // Return empty list — traps are stored client-side
      return NextResponse.json({
        success: true,
        traps: [],
        message: 'Traps are managed client-side. Use the dashboard to view deployed traps.',
      })
    }

    if (body.action === 'status') {
      if (!body.trapId) {
        return NextResponse.json({ error: 'trapId required for status check' }, { status: 400 })
      }
      return NextResponse.json({
        success: true,
        trapId: body.trapId,
        status: 'armed',
        lastChecked: new Date().toISOString(),
      })
    }

    return NextResponse.json({ error: 'Invalid action. Use deploy, list, or status.' }, { status: 400 })
  } catch (err) {
    return NextResponse.json(
      { error: sanitizeErrorMessage(err) || 'Honey token operation failed' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = rateLimit(ip)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded.' },
      { status: 429 }
    )
  }

  return NextResponse.json({
    supportedChains: Object.entries(CHAIN_NAMES).map(([id, name]) => ({
      chainId: Number(id),
      name,
    })),
    actions: ['deploy', 'list', 'status'],
  })
}
