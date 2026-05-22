import { NextRequest, NextResponse } from 'next/server'
import { getWalletLinksForOwner, getTransfersForAddress, getDrainerTransfers, detectCrossChainDrainerMovement, buildFundFlowGraph } from '@/lib/crossChainLink'
import { isValidAddress, sanitizeErrorMessage } from '@/lib/validation'
import { rateLimit } from '@/lib/rateLimit'

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'anonymous'
  const rl = rateLimit(ip, 20, 60000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const action = request.nextUrl.searchParams.get('action') || 'links'
  const address = request.nextUrl.searchParams.get('address')
  const depth = parseInt(request.nextUrl.searchParams.get('depth') || '3', 10)

  try {
    switch (action) {
      case 'links': {
        if (!address) return NextResponse.json({ error: 'Address required' }, { status: 400 })
        if (!isValidAddress(address)) return NextResponse.json({ error: 'Invalid address' }, { status: 400 })
        const links = getWalletLinksForOwner(address)
        return NextResponse.json({ links })
      }
      case 'transfers': {
        if (!address) return NextResponse.json({ error: 'Address required' }, { status: 400 })
        if (!isValidAddress(address)) return NextResponse.json({ error: 'Invalid address' }, { status: 400 })
        const transfers = getTransfersForAddress(address)
        return NextResponse.json({ transfers })
      }
      case 'drainer_transfers':
        return NextResponse.json({ transfers: getDrainerTransfers() })
      case 'detect_drainer': {
        if (!address) return NextResponse.json({ error: 'Address required' }, { status: 400 })
        if (!isValidAddress(address)) return NextResponse.json({ error: 'Invalid address' }, { status: 400 })
        const result = detectCrossChainDrainerMovement(address)
        return NextResponse.json(result)
      }
      case 'fund_flow': {
        if (!address) return NextResponse.json({ error: 'Address required' }, { status: 400 })
        if (!isValidAddress(address)) return NextResponse.json({ error: 'Invalid address' }, { status: 400 })
        const graph = buildFundFlowGraph(address, depth)
        return NextResponse.json(graph)
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
}
