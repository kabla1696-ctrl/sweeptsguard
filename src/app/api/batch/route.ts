import { NextRequest, NextResponse } from 'next/server'
import {
  batchRevokeDelegation,
  batchClaimAirdrops,
  batchSweepTokens,
  batchScanNFTs,
  type AirdropInfo,
  type TokenSweepTarget,
} from '@/lib/batchOperations'
import { CHAINS } from '@/lib/chains'
import { isValidAddress, sanitizeErrorMessage } from '@/lib/validation'

const MAX_CHAINS = 50
const MAX_AIRDROPS = 20
const MAX_TOKENS = 50

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const action = body.action as string

  switch (action) {
    case 'revoke':
      return handleRevoke(body)
    case 'claim':
      return handleClaim(body)
    case 'sweep':
      return handleSweep(body)
    case 'scan-nfts':
      return handleScanNFTs(body)
    default:
      return NextResponse.json(
        { error: `Unknown action: ${action}. Valid: revoke, claim, sweep, scan-nfts` },
        { status: 400 }
      )
  }
}

// ── Revoke ─────────────────────────────────────────────────

async function handleRevoke(body: Record<string, unknown>) {
  const { chains, privateKey, safeWallet } = body as {
    chains?: number[]
    privateKey?: string
    safeWallet?: string
  }

  if (!privateKey) {
    return NextResponse.json({ error: 'privateKey required' }, { status: 400 })
  }
  if (!safeWallet) {
    return NextResponse.json({ error: 'safeWallet required' }, { status: 400 })
  }
  if (!isValidAddress(safeWallet)) {
    return NextResponse.json({ error: 'Invalid safeWallet address' }, { status: 400 })
  }

  let targetChains: number[]
  if (chains && Array.isArray(chains) && chains.length > 0) {
    if (chains.length > MAX_CHAINS) {
      return NextResponse.json({ error: `chains exceeds maximum of ${MAX_CHAINS}` }, { status: 400 })
    }
    targetChains = chains
  } else {
    targetChains = Object.keys(CHAINS).map(Number)
  }

  try {
    const results = await batchRevokeDelegation(targetChains, privateKey, safeWallet)
    const successful = results.filter((r) => r.success)
    const failed = results.filter((r) => !r.success)

    return NextResponse.json({
      success: failed.length === 0,
      totalAttempted: results.length,
      successful: successful.length,
      failed: failed.length,
      results,
    })
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) || 'Batch revoke failed' }, { status: 500 })
  }
}

// ── Claim ──────────────────────────────────────────────────

async function handleClaim(body: Record<string, unknown>) {
  const { airdrops, privateKey } = body as {
    airdrops?: AirdropInfo[]
    privateKey?: string
  }

  if (!privateKey) {
    return NextResponse.json({ error: 'privateKey required' }, { status: 400 })
  }
  if (!airdrops || !Array.isArray(airdrops) || airdrops.length === 0) {
    return NextResponse.json({ error: 'airdrops array required' }, { status: 400 })
  }
  if (airdrops.length > MAX_AIRDROPS) {
    return NextResponse.json({ error: `airdrops exceeds maximum of ${MAX_AIRDROPS}` }, { status: 400 })
  }

  for (const a of airdrops) {
    if (!a.contractAddress || !isValidAddress(a.contractAddress)) {
      return NextResponse.json({ error: `Invalid contract address: ${a.contractAddress}` }, { status: 400 })
    }
    if (!a.chainId || !CHAINS[a.chainId]) {
      return NextResponse.json({ error: `Unsupported chain: ${a.chainId}` }, { status: 400 })
    }
  }

  try {
    const results = await batchClaimAirdrops(airdrops, privateKey)
    const successful = results.filter((r) => r.success)
    const failed = results.filter((r) => !r.success)

    return NextResponse.json({
      success: failed.length === 0,
      totalAttempted: results.length,
      successful: successful.length,
      failed: failed.length,
      results,
    })
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) || 'Batch claim failed' }, { status: 500 })
  }
}

// ── Sweep ──────────────────────────────────────────────────

async function handleSweep(body: Record<string, unknown>) {
  const { tokens, chains, privateKey, compromisedAddress, safeAddress } = body as {
    tokens?: TokenSweepTarget[]
    chains?: number[]
    privateKey?: string
    compromisedAddress?: string
    safeAddress?: string
  }

  if (!privateKey) {
    return NextResponse.json({ error: 'privateKey required' }, { status: 400 })
  }
  if (!compromisedAddress || !isValidAddress(compromisedAddress)) {
    return NextResponse.json({ error: 'valid compromisedAddress required' }, { status: 400 })
  }
  if (!safeAddress || !isValidAddress(safeAddress)) {
    return NextResponse.json({ error: 'valid safeAddress required' }, { status: 400 })
  }

  let sweepTokens: TokenSweepTarget[]
  if (tokens && Array.isArray(tokens) && tokens.length > 0) {
    if (tokens.length > MAX_TOKENS) {
      return NextResponse.json({ error: `tokens exceeds maximum of ${MAX_TOKENS}` }, { status: 400 })
    }
    sweepTokens = tokens
  } else if (chains && Array.isArray(chains) && chains.length > 0) {
    // Default tokens per chain
    const DEFAULT_TOKENS: Record<number, { address: string; symbol: string; decimals: number }[]> = {
      1: [
        { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', decimals: 6 },
        { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', decimals: 6 },
      ],
      8453: [
        { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', decimals: 6 },
      ],
      42161: [
        { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', symbol: 'USDT', decimals: 6 },
        { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', symbol: 'USDC', decimals: 6 },
      ],
      137: [
        { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', symbol: 'USDT', decimals: 6 },
      ],
    }

    sweepTokens = []
    for (const chainId of chains) {
      const chainTokens = DEFAULT_TOKENS[chainId] || []
      for (const t of chainTokens) {
        sweepTokens.push({
          tokenAddress: t.address,
          chainId,
          symbol: t.symbol,
          decimals: t.decimals,
        })
      }
    }

    if (sweepTokens.length === 0) {
      return NextResponse.json({ error: 'No default tokens for specified chains' }, { status: 400 })
    }
  } else {
    return NextResponse.json({ error: 'tokens or chains array required' }, { status: 400 })
  }

  try {
    const results = await batchSweepTokens(sweepTokens, compromisedAddress, safeAddress, privateKey)
    const successful = results.filter((r) => r.success)
    const failed = results.filter((r) => !r.success)

    return NextResponse.json({
      success: failed.length === 0,
      totalAttempted: results.length,
      successful: successful.length,
      failed: failed.length,
      results,
    })
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) || 'Batch sweep failed' }, { status: 500 })
  }
}

// ── Scan NFTs ──────────────────────────────────────────────

async function handleScanNFTs(body: Record<string, unknown>) {
  const { address, chains } = body as {
    address?: string
    chains?: number[]
  }

  if (!address || !isValidAddress(address)) {
    return NextResponse.json({ error: 'valid address required' }, { status: 400 })
  }

  const targetChains = chains && Array.isArray(chains) && chains.length > 0
    ? chains
    : [1, 8453, 42161, 137] // Default to major chains

  try {
    const results = await batchScanNFTs(address, targetChains)
    const totalNFTs = results.reduce((sum, r) => sum + r.nfts.length, 0)

    return NextResponse.json({
      success: true,
      totalChainsScanned: results.length,
      totalNFTs,
      results,
    })
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) || 'NFT scan failed' }, { status: 500 })
  }
}
