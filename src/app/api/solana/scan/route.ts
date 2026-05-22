import { NextRequest, NextResponse } from 'next/server'
import { scanSolanaWallet, isValidSolanaAddress } from '@/lib/solana'

export async function POST(request: NextRequest) {
  let body: { address?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { address } = body

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

    const result = await Promise.race([
      scanSolanaWallet(address),
      timeoutPromise,
    ])

    return NextResponse.json(result)
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
    const result = await scanSolanaWallet(address)
    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Solana scan failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
