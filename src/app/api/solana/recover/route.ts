import { NextRequest, NextResponse } from 'next/server'
import {
  recoverSolanaFunds,
  scanSolanaWallet,
  isValidSolanaAddress,
  decodeSolanaKey,
  SOLANA_PLATFORM_WALLET,
  SOLANA_FEE_BPS,
} from '@/lib/solana'
import { rateLimit, getClientIp } from '@/lib/rateLimit'
import { captureError } from '@/lib/sentry'

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = rateLimit(ip)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetTime - Date.now()) / 1000)) } }
    )
  }

  let body: {
    compromisedAddress?: string
    safeAddress?: string
    privateKey?: string
    useJito?: boolean
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { safeAddress, privateKey, useJito = true } = body

  // Validate inputs
  if (!privateKey || typeof privateKey !== 'string') {
    return NextResponse.json(
      { error: 'Private key of compromised wallet is required' },
      { status: 400 }
    )
  }

  if (!safeAddress || !isValidSolanaAddress(safeAddress)) {
    return NextResponse.json(
      { error: 'Invalid safe wallet address. Must be a valid Solana address.' },
      { status: 400 }
    )
  }

  // Validate that the private key is valid and get the compromised address
  let compromisedPubkey: string
  try {
    const keypair = decodeSolanaKey(privateKey)
    compromisedPubkey = keypair.publicKey.toBase58()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid private key'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  // Safety: can't recover to self
  if (compromisedPubkey === safeAddress) {
    return NextResponse.json(
      {
        error:
          'Safe wallet CANNOT be the compromised wallet — funds would stay in the compromised wallet!',
      },
      { status: 400 }
    )
  }

  try {
    // First, do a quick scan to show what's recoverable
    const scanResult = await scanSolanaWallet(compromisedPubkey)

    if (
      parseFloat(scanResult.solBalanceFormatted) < 0.000001 &&
      scanResult.tokens.length === 0
    ) {
      return NextResponse.json({
        success: false,
        error:
          'No recoverable funds found. Wallet has 0 SOL and no SPL tokens.',
        scanResult,
      })
    }

    // Execute recovery — ATOMIC BATCH (SOL + all tokens in ONE tx)
    // useJito=true by default = private submission, no front-running
    const result = await recoverSolanaFunds(privateKey, safeAddress, undefined, useJito)

    // Calculate platform fee (20% of recovered SOL)
    let platformFee = '0'
    if (result.success && result.solRecovered) {
      const recoveredLamports = Math.floor(parseFloat(result.solRecovered) * 1_000_000_000)
      const feeLamports = Math.floor(recoveredLamports * SOLANA_FEE_BPS / 10000)
      platformFee = (feeLamports / 1_000_000_000).toFixed(9)
    }

    return NextResponse.json({
      ...result,
      scanResult,
      compromisedAddress: compromisedPubkey,
      safeAddress,
      platformFee,
      platformWallet: SOLANA_PLATFORM_WALLET,
      feePercent: SOLANA_FEE_BPS / 100,
    })
  } catch (err: unknown) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: '/api/solana/recover' })
    const message = err instanceof Error ? err.message : 'Recovery failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET endpoint to scan without recovering
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
    const message = err instanceof Error ? err.message : 'Scan failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
