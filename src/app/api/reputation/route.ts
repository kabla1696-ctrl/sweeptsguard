import { NextRequest, NextResponse } from 'next/server'
import { reputationChecker } from '@/lib/reputation'

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address')
  const chainIdParam = request.nextUrl.searchParams.get('chainId')
  const chainId = chainIdParam ? parseInt(chainIdParam, 10) : 1

  if (!address) {
    return NextResponse.json({ error: 'Address required' }, { status: 400 })
  }

  try {
    const result = await reputationChecker.check(address, chainId)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Check failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
