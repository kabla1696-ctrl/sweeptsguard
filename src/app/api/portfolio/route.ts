import { NextRequest, NextResponse } from 'next/server'
import { scanner } from '@/lib/scanner'
import { CHAINS } from '@/lib/chains'

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address')

  if (!address) {
    return NextResponse.json({ error: 'Address required' }, { status: 400 })
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
    const message = err instanceof Error ? err.message : 'Failed to fetch portfolio'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
