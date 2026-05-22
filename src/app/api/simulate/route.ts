import { NextRequest, NextResponse } from 'next/server'
import { simulateTransaction } from '@/lib/simulation'
import { sanitizeErrorMessage } from '@/lib/validation'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { chainId, tx } = body

    if (!chainId || typeof chainId !== 'number') {
      return NextResponse.json(
        { error: 'chainId is required and must be a number' },
        { status: 400 }
      )
    }

    if (!tx || !tx.from || !tx.to) {
      return NextResponse.json(
        { error: 'tx object with from and to is required' },
        { status: 400 }
      )
    }

    const result = await simulateTransaction(chainId, {
      from: tx.from,
      to: tx.to,
      data: tx.data || '0x',
      value: tx.value || '0x0',
    })

    return NextResponse.json(result)
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        gasUsed: '0',
        gasCostETH: '0',
        gasCostUSD: '0',
        tokenTransfers: [],
        stateChanges: [],
        error: sanitizeErrorMessage(err),
        warnings: [],
      },
      { status: 500 }
    )
  }
}
