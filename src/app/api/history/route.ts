import { NextRequest, NextResponse } from 'next/server'
import { tracker } from '@/lib/tracker'
import { CHAINS } from '@/lib/chains'

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address')
  const chainIdParam = request.nextUrl.searchParams.get('chainId')

  if (!address) {
    return NextResponse.json({ error: 'Address required' }, { status: 400 })
  }

  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return NextResponse.json({ error: 'Invalid address format. Must be 0x + 40 hex characters.' }, { status: 400 })
  }

  try {
    let chainIds: number[]
    if (chainIdParam) {
      const parsed = parseInt(chainIdParam, 10)
      chainIds = isNaN(parsed) ? Object.keys(CHAINS).map(Number) : [parsed]
    } else {
      chainIds = Object.keys(CHAINS).map(Number)
    }

    const transfers = await tracker.trackAllChains(address, chainIds)

    return NextResponse.json({
      address,
      transfers: transfers.map(t => ({
        hash: t.hash,
        from: t.from,
        to: t.to,
        value: t.value,
        asset: t.asset,
        chainId: t.chainId,
        chainName: t.chainName,
        timestamp: t.timestamp,
        isExchangeDeposit: t.isExchangeDeposit,
        exchangeName: t.exchangeName,
        isDrainerTransfer: t.isDrainerTransfer,
        blockNumber: t.blockNumber
      })),
      total: transfers.length
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch history'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
