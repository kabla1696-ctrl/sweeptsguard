import { NextRequest, NextResponse } from 'next/server'
import { honeypotChecker } from '@/lib/honeypot'
import { isValidAddress, sanitizeErrorMessage } from '@/lib/validation'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  const chainIdParam = request.nextUrl.searchParams.get('chainId')
  const chainId = chainIdParam ? parseInt(chainIdParam, 10) : 1

  if (!token) {
    return NextResponse.json({ error: 'Token address required' }, { status: 400 })
  }

  if (!isValidAddress(token)) {
    return NextResponse.json({ error: 'Invalid token address format. Must be 0x followed by 40 hex characters.' }, { status: 400 })
  }

  if (!Number.isFinite(chainId) || chainId < 1) {
    return NextResponse.json({ error: 'Invalid chainId' }, { status: 400 })
  }

  try {
    const result = await honeypotChecker.check(token, chainId)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) || 'Check failed' }, { status: 500 })
  }
}
