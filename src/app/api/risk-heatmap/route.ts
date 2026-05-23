import { NextRequest, NextResponse } from 'next/server'
import { riskHeatmap } from '@/lib/riskHeatmap'
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

  const address = request.nextUrl.searchParams.get('address')
  if (!address || !isValidAddress(address)) {
    return NextResponse.json({ error: 'Invalid EVM address' }, { status: 400 })
  }

  const chainsParam = request.nextUrl.searchParams.get('chains')
  let chainIds: number[] = [1, 8453, 56, 42161, 137]
  if (chainsParam) {
    try {
      chainIds = chainsParam.split(',').map(c => parseInt(c.trim(), 10)).filter(n => !isNaN(n) && n > 0)
      if (chainIds.length === 0) {
        return NextResponse.json({ error: 'Invalid chains parameter' }, { status: 400 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid chains parameter' }, { status: 400 })
    }
  }

  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Heatmap generation timed out')), 50000)
    )

    const result = await Promise.race([
      riskHeatmap.generateHeatmap(address, chainIds),
      timeoutPromise,
    ])

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
    const { address, chains } = body

    if (!address || !isValidAddress(address)) {
      return NextResponse.json({ error: 'Invalid EVM address' }, { status: 400 })
    }

    const chainIds = Array.isArray(chains) && chains.length > 0
      ? chains.filter((c: unknown) => typeof c === 'number' && c > 0)
      : [1, 8453, 56, 42161, 137]

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Heatmap generation timed out')), 50000)
    )

    const heatmap = await Promise.race([
      riskHeatmap.generateHeatmap(address, chainIds),
      timeoutPromise,
    ])

    // Also generate a report
    const report = riskHeatmap.generateReport(heatmap)

    return NextResponse.json({ heatmap, report })
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
}
