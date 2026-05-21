import { NextRequest, NextResponse } from 'next/server'
import { tracker } from '@/lib/tracker'
import { DEFAULT_CHAINS } from '@/lib/chains'
import { sanitizeErrorMessage } from '@/lib/validation'

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address')

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: 'Invalid EVM address' }, { status: 400 })
  }

  try {
    const transfers = await tracker.trackAllChains(address, DEFAULT_CHAINS)

    return NextResponse.json({
      address,
      transfers,
      totalTransfers: transfers.length,
      exchangeDeposits: transfers.filter(t => t.isExchangeDeposit).length,
      drainerTransfers: transfers.filter(t => t.isDrainerTransfer).length
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) || 'Tracking failed' }, { status: 500 })
  }
}
