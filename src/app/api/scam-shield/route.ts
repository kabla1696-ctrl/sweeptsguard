import { NextRequest, NextResponse } from 'next/server'
import { analyzeTransaction, analyzeBatch, DEFAULT_SCAM_SHIELD_CONFIG, type AnalyzeTransactionParams } from '@/lib/scamShield'
import { isValidAddress, sanitizeErrorMessage } from '@/lib/validation'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

export async function GET(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = rateLimit(ip)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetTime - Date.now()) / 1000)) } }
    )
  }

  // GET /api/scam-shield?config=true — return current config
  if (request.nextUrl.searchParams.get('config') === 'true') {
    return NextResponse.json(DEFAULT_SCAM_SHIELD_CONFIG)
  }

  return NextResponse.json({
    message: 'Scam Shield API — POST to analyze transactions',
    endpoints: {
      'POST /': 'Analyze a single transaction',
      'POST / { action: "batch" }': 'Analyze multiple transactions',
      'GET ?config=true': 'Get shield configuration',
    },
  })
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = rateLimit(ip)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetTime - Date.now()) / 1000)) } }
    )
  }

  try {
    const body = await request.json()
    const { action, from, to, value, data, chainId, transactions } = body

    // Batch analysis
    if (action === 'batch') {
      if (!Array.isArray(transactions) || transactions.length === 0) {
        return NextResponse.json({ error: 'Missing transactions array' }, { status: 400 })
      }
      if (transactions.length > 10) {
        return NextResponse.json({ error: 'Maximum 10 transactions per batch' }, { status: 400 })
      }

      const params: AnalyzeTransactionParams[] = transactions.map((tx: Record<string, string>) => ({
        from: tx.from || '0x0000000000000000000000000000000000000000',
        to: tx.to || '0x0000000000000000000000000000000000000000',
        value: tx.value || '0x0',
        data: tx.data || '0x',
        chainId: tx.chainId ? parseInt(tx.chainId, 10) : 1,
      }))

      const result = await analyzeBatch(params)
      return NextResponse.json(result)
    }

    // Single transaction analysis
    if (!to) {
      return NextResponse.json({ error: 'Missing required field: to (recipient address)' }, { status: 400 })
    }

    if (!isValidAddress(to)) {
      return NextResponse.json({ error: 'Invalid "to" address' }, { status: 400 })
    }

    if (from && !isValidAddress(from)) {
      return NextResponse.json({ error: 'Invalid "from" address' }, { status: 400 })
    }

    const params: AnalyzeTransactionParams = {
      from: from || '0x0000000000000000000000000000000000000000',
      to,
      value: value || '0x0',
      data: data || '0x',
      chainId: chainId ? parseInt(String(chainId), 10) : 1,
    }

    const result = await analyzeTransaction(params)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
}
