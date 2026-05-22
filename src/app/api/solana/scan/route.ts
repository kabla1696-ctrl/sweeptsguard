import { NextRequest, NextResponse } from 'next/server'
import { scanSolanaWallet, detectSolanaHack, isValidSolanaAddress } from '@/lib/solana'

export async function POST(request: NextRequest) {
  let body: { address?: string; includeHackDetection?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { address, includeHackDetection = true } = body

  if (!address || !isValidSolanaAddress(address)) {
    return NextResponse.json(
      { error: 'Invalid Solana address. Must be a valid base58 public key.' },
      { status: 400 }
    )
  }

  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Scan timed out')), 50000)
    )

    // Run scan + hack detection in parallel
    const [scanResult, hackDetection] = await Promise.race([
      Promise.all([
        scanSolanaWallet(address),
        includeHackDetection ? detectSolanaHack(address) : Promise.resolve(null),
      ]),
      timeoutPromise,
    ]) as [Awaited<ReturnType<typeof scanSolanaWallet>>, Awaited<ReturnType<typeof detectSolanaHack>> | null]

    return NextResponse.json({
      ...scanResult,
      hackDetection,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Solana scan failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address')

  if (!address || !isValidSolanaAddress(address)) {
    return NextResponse.json(
      { error: 'Invalid Solana address' },
      { status: 400 }
    )
  }

  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Scan timed out')), 50000)
    )

    const [scanResult, hackDetection] = await Promise.race([
      Promise.all([
        scanSolanaWallet(address),
        detectSolanaHack(address),
      ]),
      timeoutPromise,
    ]) as [Awaited<ReturnType<typeof scanSolanaWallet>>, Awaited<ReturnType<typeof detectSolanaHack>>]

    return NextResponse.json({
      ...scanResult,
      hackDetection,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Solana scan failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
