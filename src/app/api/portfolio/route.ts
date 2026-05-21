import { NextRequest, NextResponse } from 'next/server'
import { scanner } from '@/lib/scanner'
import { CHAINS } from '@/lib/chains'
import { sanitizeErrorMessage } from '@/lib/validation'

const ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address')

  if (!address) {
    return NextResponse.json({ error: 'Address required' }, { status: 400 })
  }

  if (!ADDRESS_REGEX.test(address)) {
    return NextResponse.json({ error: 'Invalid address format. Must be 0x followed by 40 hex characters.' }, { status: 400 })
  }

  try {
    const chainIds = Object.keys(CHAINS).map(Number)
    const scanResult = await scanner.scanWallet(address, chainIds)

    // Group assets by chain
    const chainBreakdown: Record<number, { chainName: string; assets: typeof scanResult.assets; total: number }> = {}

    for (const asset of scanResult.assets) {
      if (!chainBreakdown[asset.chainId]) {
        chainBreakdown[asset.chainId] = {
          chainName: asset.chainName,
          assets: [],
          total: 0
        }
      }
      chainBreakdown[asset.chainId].assets.push(asset)
    }

    return NextResponse.json({
      address,
      totalAssets: scanResult.assets.length,
      totalUsdValue: scanResult.totalUsdValue,
      chainBreakdown,
      delegation: scanResult.delegation
    })
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) || 'Failed to fetch portfolio' }, { status: 500 })
  }
}
