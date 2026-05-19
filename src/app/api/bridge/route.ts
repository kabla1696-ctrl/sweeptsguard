import { NextRequest, NextResponse } from 'next/server'
import { CHAINS } from '@/lib/chains'

interface BridgeQuote {
  fromChain: number
  toChain: number
  fromChainName: string
  toChainName: string
  estimatedFee: string
  estimatedTime: string
  bridge: string
  bridgeUrl: string
}

const BRIDGE_ROUTES: Record<string, { bridge: string; url: string }> = {
  '1-8453': { bridge: 'Base Bridge', url: 'https://bridge.base.org' },
  '1-42161': { bridge: 'Arbitrum Bridge', url: 'https://bridge.arbitrum.io' },
  '1-137': { bridge: 'Polygon Bridge', url: 'https://portal.polygon.technology' },
  '1-10': { bridge: 'OP Bridge', url: 'https://app.optimism.io/bridge' },
  '8453-1': { bridge: 'Base Bridge', url: 'https://bridge.base.org' },
  '42161-1': { bridge: 'Arbitrum Bridge', url: 'https://bridge.arbitrum.io' },
  '137-1': { bridge: 'Polygon Bridge', url: 'https://portal.polygon.technology' },
  '10-1': { bridge: 'OP Bridge', url: 'https://app.optimism.io/bridge' },
}

export async function GET(request: NextRequest) {
  const fromParam = request.nextUrl.searchParams.get('from')
  const toParam = request.nextUrl.searchParams.get('to')

  if (!fromParam || !toParam) {
    return NextResponse.json({ error: 'from and to chain IDs required' }, { status: 400 })
  }

  const fromChain = parseInt(fromParam, 10)
  const toChain = parseInt(toParam, 10)

  const fromChainConfig = CHAINS[fromChain]
  const toChainConfig = CHAINS[toChain]

  if (!fromChainConfig || !toChainConfig) {
    return NextResponse.json({ error: 'Unsupported chain' }, { status: 400 })
  }

  const routeKey = `${fromChain}-${toChain}`
  const route = BRIDGE_ROUTES[routeKey]

  if (!route) {
    return NextResponse.json({
      fromChain,
      toChain,
      fromChainName: fromChainConfig.name,
      toChainName: toChainConfig.name,
      message: 'No direct bridge route found. Try using Stargate or LI.FI for multi-hop routes.',
      suggestedBridges: [
        { name: 'Stargate', url: 'https://stargate.finance' },
        { name: 'LI.FI', url: 'https://li.fi' },
      ]
    })
  }

  const quote: BridgeQuote = {
    fromChain,
    toChain,
    fromChainName: fromChainConfig.name,
    toChainName: toChainConfig.name,
    estimatedFee: 'Variable (depends on amount)',
    estimatedTime: fromChain === 1 ? '~15 min' : '~2 min',
    bridge: route.bridge,
    bridgeUrl: route.url
  }

  return NextResponse.json(quote)
}
