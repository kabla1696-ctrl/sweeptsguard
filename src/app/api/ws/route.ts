import { NextRequest, NextResponse } from 'next/server'
import { multiChainWs, CHAIN_WS_URLS, type PendingTx } from '@/lib/websocket'

// GET: WebSocket upgrade for live monitoring
// Query params: address (wallet to monitor), chainId (optional, defaults to all)
export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address')
  const chainIdParam = request.nextUrl.searchParams.get('chainId')

  if (!address) {
    return NextResponse.json(
      { error: 'address query parameter required' },
      { status: 400 }
    )
  }

  // Check if the request is a WebSocket upgrade
  const upgradeHeader = request.headers.get('upgrade')
  if (upgradeHeader?.toLowerCase() !== 'websocket') {
    // If not a WebSocket upgrade, return connection info
    const chainIds = chainIdParam
      ? [parseInt(chainIdParam)]
      : Object.keys(CHAIN_WS_URLS).map(Number)

    const status = chainIds.map(id => ({
      chainId: id,
      wsAvailable: !!CHAIN_WS_URLS[id],
      connected: multiChainWs.isChainConnected(id),
    }))

    return NextResponse.json({
      message: 'Connect via WebSocket for real-time monitoring',
      address,
      supportedChains: status,
      wsUrls: chainIds.reduce((acc, id) => {
        if (CHAIN_WS_URLS[id]) {
          acc[id] = CHAIN_WS_URLS[id]
        }
        return acc
      }, {} as Record<number, string>),
    })
  }

  // For actual WebSocket upgrade, we need to use the native approach
  // Next.js doesn't natively support WebSocket upgrade in API routes,
  // so we provide a polling-based SSE alternative and direct WS URLs

  // Return connection details for client-side WebSocket connection
  return NextResponse.json({
    error: 'Direct WebSocket upgrade not supported in Next.js API routes. Connect client-side using the provided WS URLs.',
    wsUrls: CHAIN_WS_URLS,
    address,
    instruction: 'Use the ChainWebSocket class client-side to connect directly to chain RPCs',
  })
}

// POST: Manage subscriptions (start/stop monitoring)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, address, chainIds } = body as {
      action: 'subscribe' | 'unsubscribe' | 'status'
      address?: string
      chainIds?: number[]
    }

    if (action === 'status') {
      const connectedChains = multiChainWs.getConnectedChains()
      return NextResponse.json({
        connectedChains,
        availableChains: Object.keys(CHAIN_WS_URLS).map(Number),
      })
    }

    if (!address) {
      return NextResponse.json({ error: 'address required' }, { status: 400 })
    }

    const targetChains = chainIds || Object.keys(CHAIN_WS_URLS).map(Number)

    if (action === 'subscribe') {
      const results: { chainId: number; status: string }[] = []

      for (const chainId of targetChains) {
        if (!CHAIN_WS_URLS[chainId]) {
          results.push({ chainId, status: 'no_ws_url' })
          continue
        }

        const ws = multiChainWs.connectChain(chainId)
        if (ws) {
          ws.subscribe(address, (tx: PendingTx) => {
            // In a real setup, this would push to a connected client
            console.log(`[WS] Pending TX on chain ${tx.chainId}: ${tx.hash}`)
          })
          results.push({ chainId, status: 'subscribed' })
        } else {
          results.push({ chainId, status: 'connection_failed' })
        }
      }

      return NextResponse.json({ success: true, subscriptions: results })
    }

    if (action === 'unsubscribe') {
      for (const chainId of targetChains) {
        const ws = multiChainWs.getConnection(chainId)
        if (ws) {
          ws.unsubscribe(address)
        }
      }
      return NextResponse.json({ success: true, message: 'Unsubscribed' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
