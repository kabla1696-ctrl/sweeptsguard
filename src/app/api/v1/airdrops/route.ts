import { NextRequest, NextResponse } from 'next/server'
import { isValidAddress, sanitizeErrorMessage } from '@/lib/validation'
import { authenticateRequest, addRateLimitHeaders } from '@/lib/apiAuth'
import { CHAINS } from '@/lib/chains'

/**
 * GET /api/v1/airdrops?address=0x...
 * Check available airdrops for a wallet address
 */
export async function GET(request: NextRequest) {
  const authResult = await authenticateRequest(request)
  if (authResult instanceof Response) return authResult
  const { rateLimit } = authResult

  const address = request.nextUrl.searchParams.get('address')

  if (!address || !isValidAddress(address)) {
    return NextResponse.json(
      { error: 'Invalid EVM address', hint: 'Provide a valid 0x-prefixed 40 hex character address' },
      { status: 400 }
    )
  }

  try {
    // Check multiple chains for airdrop opportunities
    const supportedChains = Object.entries(CHAINS).map(([id, c]) => ({
      chainId: parseInt(id),
      chainName: c.name
    }))

    // In production, this would query actual airdrop contracts/databases
    // For now, return supported chains and common airdrop patterns
    const airdrops = supportedChains.map(chain => ({
      chainId: chain.chainId,
      chainName: chain.chainName,
      airdrops: [
        {
          name: `${chain.chainName} Token Airdrop`,
          status: 'check_required',
          estimatedValue: 'Unknown',
          claimDeadline: null,
          contractAddress: null
        }
      ]
    }))

    const response = NextResponse.json({
      success: true,
      data: {
        address,
        totalChains: supportedChains.length,
        airdrops,
        note: 'Connect your safe wallet to claim airdrops. Tokens will be sent directly to your safe address.'
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    })

    return addRateLimitHeaders(response, rateLimit)
  } catch (err: unknown) {
    return NextResponse.json(
      { error: sanitizeErrorMessage(err) || 'Airdrop check failed' },
      { status: 500 }
    )
  }
}
