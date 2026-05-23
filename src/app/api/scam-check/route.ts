import { NextRequest, NextResponse } from 'next/server'
import { scamDetector } from '@/lib/scamDetector'
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
    const result = await scamDetector.checkAddress(address, chainId)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) || 'Check failed' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const { tokenAddress, chainId: rawChainId } = body as { tokenAddress?: string; chainId?: unknown }
  const chainId = typeof rawChainId === 'number' && Number.isFinite(rawChainId) ? rawChainId : 1

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
    return NextResponse.json({ error: sanitizeErrorMessage(err) || 'Analysis failed' }, { status: 500 })
  }
}
