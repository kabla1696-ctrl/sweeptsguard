import { NextRequest, NextResponse } from 'next/server'
import { createSweepEngine, type SweepConfig, type SweepResult } from '@/lib/sweeper'
import { CHAINS } from '@/lib/chains'
import { isValidAddress, sanitizeErrorMessage } from '@/lib/validation'

const MAX_CHAIN_IDS = 50

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { compromisedAddress, safeAddress, privateKey, chainIds } = body as {
    compromisedAddress?: string
    safeAddress?: string
    privateKey?: string
    chainIds?: number[]
  }

  if (!compromisedAddress || !safeAddress || !privateKey) {
    return NextResponse.json(
      { error: 'compromisedAddress, safeAddress, and privateKey required' },
      { status: 400 }
    )
  }

  if (!isValidAddress(compromisedAddress)) {
    return NextResponse.json({ error: 'Invalid compromisedAddress format' }, { status: 400 })
  }
  if (!isValidAddress(safeAddress)) {
    return NextResponse.json({ error: 'Invalid safeAddress format' }, { status: 400 })
  }
  if (compromisedAddress.toLowerCase() === safeAddress.toLowerCase()) {
    return NextResponse.json({ error: 'Safe address must differ from compromised address' }, { status: 400 })
  }

  let targetChains: number[]
  if (chainIds) {
    if (!Array.isArray(chainIds) || chainIds.length === 0) {
      return NextResponse.json({ error: 'chainIds must be a non-empty array' }, { status: 400 })
    }
    if (chainIds.length > MAX_CHAIN_IDS) {
      return NextResponse.json({ error: `chainIds exceeds maximum of ${MAX_CHAIN_IDS}` }, { status: 400 })
    }
    for (const cid of chainIds) {
      if (typeof cid !== 'number' || !Number.isFinite(cid)) {
        return NextResponse.json({ error: 'Each chainId must be a finite number' }, { status: 400 })
      }
    }
    targetChains = chainIds
  } else {
    targetChains = Object.keys(CHAINS).map(Number)
  }

  try {
    const config: SweepConfig = {
      compromisedAddress,
      safeAddress,
      privateKey,
      chainIds: targetChains,
      sweepNative: true,
      sweepTokens: true,
      minEthBalance: '0.001'
    }

    const engine = createSweepEngine(config)

    // Execute sweeps in parallel across all chains
    const sweepPromises = targetChains.map(chainId => engine.sweepChain(chainId))
    const results = await Promise.all(sweepPromises)
    const flatResults = results.flat()

    const successful = flatResults.filter((r: SweepResult) => r.success)
    const failed = flatResults.filter((r: SweepResult) => !r.success)

    return NextResponse.json({
      success: true,
      totalAttempted: flatResults.length,
      successful: successful.length,
      failed: failed.length,
      results: flatResults
    })
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) || 'Batch sweep failed' }, { status: 500 })
  }
}
