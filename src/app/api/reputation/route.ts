import { NextRequest, NextResponse } from 'next/server'
import { reputationChecker } from '@/lib/reputation'
import { isValidAddress, sanitizeErrorMessage } from '@/lib/validation'

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address')
  const chainIdParam = request.nextUrl.searchParams.get('chainId')
  const chainId = chainIdParam ? parseInt(chainIdParam, 10) : 1

  if (!address) {
    return NextResponse.json({ error: 'Address required' }, { status: 400 })
  }

  if (!isValidAddress(address)) {
    return NextResponse.json({ error: 'Invalid address format. Must be 0x followed by 40 hex characters.' }, { status: 400 })
  }

  try {
    const result = await reputationChecker.check(address, chainId)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) || 'Check failed' }, { status: 500 })
  }
}
