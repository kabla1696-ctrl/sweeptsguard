import { NextRequest, NextResponse } from 'next/server'
import { honeypotChecker } from '@/lib/honeypot'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  const chainIdParam = request.nextUrl.searchParams.get('chainId')
  const chainId = chainIdParam ? parseInt(chainIdParam, 10) : 1

  if (!token) {
    return NextResponse.json({ error: 'Token address required' }, { status: 400 })
  }

  try {
    const result = await honeypotChecker.check(token, chainId)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Check failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
