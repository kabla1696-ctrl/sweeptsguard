import { NextRequest, NextResponse } from 'next/server'
import { scanAddress, getAnalytics, handleInlineQuery, handleMessage, type TelegramMessage } from '@/lib/botScan'
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

  const action = request.nextUrl.searchParams.get('action')

  // GET /api/bot-scan?action=analytics — return scan analytics
  if (action === 'analytics') {
    try {
      const analytics = getAnalytics()
      return NextResponse.json(analytics)
    } catch (err) {
      return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
    }
  }

  // GET /api/bot-scan?address=0x...&chainId=1 — scan a single address
  const address = request.nextUrl.searchParams.get('address')
  if (!address) {
    return NextResponse.json(
      { error: 'Missing required parameter: address or action' },
      { status: 400 }
    )
  }

  if (!isValidAddress(address)) {
    return NextResponse.json({ error: 'Invalid EVM address' }, { status: 400 })
  }

  const chainIdParam = request.nextUrl.searchParams.get('chainId')
  const chainId = chainIdParam ? parseInt(chainIdParam, 10) : undefined

  if (chainIdParam && (isNaN(chainId!) || chainId! < 1)) {
    return NextResponse.json({ error: 'Invalid chainId' }, { status: 400 })
  }

  try {
    const result = await scanAddress(address, chainId)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
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
    const { action } = body

    // POST /api/bot-scan { action: 'inline', query: '0x...' }
    if (action === 'inline') {
      const { query } = body
      if (!query || typeof query !== 'string') {
        return NextResponse.json({ error: 'Missing query string' }, { status: 400 })
      }
      const results = handleInlineQuery(query)
      return NextResponse.json({ results })
    }

    // POST /api/bot-scan { action: 'message', chatId, userId, text, ... }
    if (action === 'message') {
      const msg = body as Partial<TelegramMessage>
      if (!msg.chatId || !msg.userId || !msg.text) {
        return NextResponse.json({ error: 'Missing required fields: chatId, userId, text' }, { status: 400 })
      }
      const reply = await handleMessage(msg as TelegramMessage)
      return NextResponse.json({ reply })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
}
