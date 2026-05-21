import { NextRequest, NextResponse } from 'next/server'
import { scamDetector } from '@/lib/scamDetector'
import { isValidAddress } from '@/lib/validation'

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
    const result = await scamDetector.checkAddress(address, chainId)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Check failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { tokenAddress, chainId = 1 } = body as { tokenAddress?: string; chainId?: number }

  if (!tokenAddress) {
    return NextResponse.json({ error: 'Token address required' }, { status: 400 })
  }

  if (!isValidAddress(tokenAddress)) {
    return NextResponse.json({ error: 'Invalid token address format. Must be 0x followed by 40 hex characters.' }, { status: 400 })
  }

  try {
    const analysis = await scamDetector.analyzeToken(tokenAddress, chainId)
    return NextResponse.json(analysis)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Analysis failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
