import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'

// ── RPC URLs ──────────────────────────────────────────────────────────
const RPC_URLS: Record<number, string> = {
  1: 'https://eth.drpc.org',
  8453: 'https://mainnet.base.org',
  42161: 'https://arb1.arbitrum.io/rpc',
  137: 'https://polygon-bor-rpc.publicnode.com',
  56: 'https://bsc-rpc.publicnode.com',
  10: 'https://mainnet.optimism.io',
  43114: 'https://api.avax.network/ext/bc/C/rpc',
  324: 'https://mainnet.era.zksync.io',
  59144: 'https://rpc.linea.build',
  81457: 'https://rpc.blast.io',
  7777777: 'https://rpc.zora.energy',
  5000: 'https://rpc.mantle.xyz',
  34443: 'https://mainnet.mode.network',
  534352: 'https://rpc.scroll.io',
  80094: 'https://rpc.berachain.com',
  1329: 'https://evm-rpc.sei-apis.com',
  57073: 'https://rpc-gel.inkonchain.com',
}

// ── Rate limiting ─────────────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; windowStart: number }>()
const WINDOW_MS = 60_000
const MAX_REQ = 100 // higher limit for RPC proxy

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now })
    return true
  }
  if (entry.count >= MAX_REQ) return false
  entry.count++
  return true
}

// ── Blocked methods (prevent abuse) ───────────────────────────────────
const BLOCKED_METHODS = new Set([
  'eth_sendRawTransaction', // don't allow arbitrary TX submission through proxy
])

// ── POST /api/extension/rpc ───────────────────────────────────────────
// RPC proxy for the extension — routes all blockchain calls through backend
// This prevents exposing RPC URLs in the extension source code
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32000, message: 'Rate limit exceeded' },
      }, { status: 429 })
    }

    const body = await request.json()
    const { chainId, method, params } = body

    if (!chainId || !method) {
      return NextResponse.json({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32600, message: 'Missing chainId or method' },
      }, { status: 400 })
    }

    if (BLOCKED_METHODS.has(method)) {
      return NextResponse.json({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32601, message: `Method ${method} is blocked` },
      }, { status: 403 })
    }

    const rpcUrl = RPC_URLS[chainId]
    if (!rpcUrl) {
      return NextResponse.json({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32600, message: `Chain ${chainId} not supported` },
      }, { status: 400 })
    }

    // Forward the JSON-RPC request to the actual RPC
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const result = await provider.send(method, params || [])

    return NextResponse.json({
      jsonrpc: '2.0',
      id: body.id || 1,
      result,
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32603, message },
    }, { status: 500 })
  }
}
