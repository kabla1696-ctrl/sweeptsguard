import { NextRequest, NextResponse } from 'next/server'
import { aiThreatEngine } from '@/lib/aiThreat'
import { isValidAddress, sanitizeErrorMessage } from '@/lib/validation'

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address')
  const chainIdParam = request.nextUrl.searchParams.get('chainId')
  const multiChain = request.nextUrl.searchParams.get('multiChain')

  if (!address) {
    return NextResponse.json({ error: 'Address required' }, { status: 400 })
  }

  if (!isValidAddress(address)) {
    return NextResponse.json({ error: 'Invalid address format. Must be 0x followed by 40 hex characters.' }, { status: 400 })
  }

  try {
    if (multiChain === 'true') {
      const chainIdsParam = request.nextUrl.searchParams.get('chainIds')
      const chainIds = chainIdsParam
        ? chainIdsParam.split(',').map(Number)
        : [1, 8453, 56, 42161, 137]
      const result = await aiThreatEngine.analyzeMultiChain(address, chainIds)
      return NextResponse.json(result)
    }

    const chainId = chainIdParam ? parseInt(chainIdParam, 10) : 1
    const result = await aiThreatEngine.analyze(address, chainId)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) || 'Analysis failed' }, { status: 500 })
  }
}
