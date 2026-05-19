import { NextRequest, NextResponse } from 'next/server'
import { createSweepEngine, type SweepConfig, type SweepResult } from '@/lib/sweeper'
import { CHAINS } from '@/lib/chains'

export async function POST(request: NextRequest) {
  const body = await request.json()
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

  const targetChains = chainIds || Object.keys(CHAINS).map(Number)

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
    const message = err instanceof Error ? err.message : 'Batch sweep failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
