import { NextRequest, NextResponse } from 'next/server'
import { scanner } from '@/lib/scanner'
import { DEFAULT_CHAINS } from '@/lib/chains'
import { sanitizeErrorMessage, isValidAddress } from '@/lib/validation'
import { rateLimit, getClientIp } from '@/lib/rateLimit'
import { captureError } from '@/lib/sentry'

export async function GET(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = rateLimit(ip)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetTime - Date.now()) / 1000)) } }
    )
  }

  const address = request.nextUrl.searchParams.get('address')

  if (!address || !isValidAddress(address)) {
    return NextResponse.json({ error: 'Invalid EVM address' }, { status: 400 })
  }

  try {
    // 50 second timeout (client has 60s timeout)
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Scan timed out')), 50000)
    )
    
    const result = await Promise.race([
      scanner.scanWallet(address, DEFAULT_CHAINS),
      timeoutPromise
    ])
    return NextResponse.json(result)
  } catch (err: unknown) {
    captureError(err instanceof Error ? err : new Error(String(err)), { address, route: '/api/scan' })
    return NextResponse.json({ error: sanitizeErrorMessage(err) || 'Scan failed' }, { status: 500 })
  }
}
