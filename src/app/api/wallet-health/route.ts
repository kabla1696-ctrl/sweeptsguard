import { NextRequest, NextResponse } from 'next/server'
import { walletHealthScorer } from '@/lib/walletHealth'
import { isValidAddress, sanitizeErrorMessage } from '@/lib/validation'

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address')
  const chainIdsParam = request.nextUrl.searchParams.get('chainIds')

  if (!address) {
    return NextResponse.json({ error: 'Address required' }, { status: 400 })
  }

  if (!isValidAddress(address)) {
    return NextResponse.json({ error: 'Invalid address format. Must be 0x followed by 40 hex characters.' }, { status: 400 })
  }

  try {
    const chainIds = chainIdsParam
      ? chainIdsParam.split(',').map(Number)
      : [1, 8453, 56, 42161, 137]
    const result = await walletHealthScorer.analyze(address, chainIds)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) || 'Health check failed' }, { status: 500 })
  }
}
