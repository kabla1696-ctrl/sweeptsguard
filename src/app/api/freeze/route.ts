import { NextRequest, NextResponse } from 'next/server'
import { generateFreezeRequest, getAvailableExchanges, generateLawEnforcementReport, FreezeRequestData } from '@/lib/freezeRequest'
import { isValidAddress, sanitizeErrorMessage } from '@/lib/validation'
import { rateLimit } from '@/lib/rateLimit'

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'anonymous'
  if (!rateLimit(ip, 20, 60000)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const action = request.nextUrl.searchParams.get('action') || 'exchanges'

  try {
    switch (action) {
      case 'exchanges':
        return NextResponse.json({ exchanges: getAvailableExchanges() })
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'anonymous'
  if (!rateLimit(ip, 5, 60000)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const { action, exchange, walletAddress, compromisedAddress, txHash, incidentDate, description, additionalInfo } = body

    if (!walletAddress || !isValidAddress(walletAddress)) {
      return NextResponse.json({ error: 'Valid wallet address required' }, { status: 400 })
    }

    const freezeData: FreezeRequestData = {
      victimAddress: walletAddress,
      drainerAddress: compromisedAddress || walletAddress,
      exchangeName: exchange || '',
      depositTxHash: txHash || '',
      amount: body.amount || '0',
      asset: body.asset || 'ETH',
      chainName: body.chainName || 'Ethereum',
      timestamp: incidentDate ? new Date(incidentDate).getTime() : Date.now(),
    }

    switch (action) {
      case 'generate': {
        if (!exchange) return NextResponse.json({ error: 'Exchange required' }, { status: 400 })
        const template = generateFreezeRequest(exchange, freezeData)
        return NextResponse.json({ template, exchange })
      }
      case 'law_enforcement': {
        const report = generateLawEnforcementReport(freezeData)
        return NextResponse.json({ report })
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
}
