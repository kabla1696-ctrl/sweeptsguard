import { NextRequest, NextResponse } from 'next/server'
import { claimer } from '@/lib/claimer'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { contractAddress, chainId, claimMethod, recipientAddress, privateKey, sponsorPrivateKey } = body

  if (!contractAddress || !chainId || !recipientAddress || !privateKey) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    // Encode claim data based on method
    let claimData: string

    switch (claimMethod) {
      case 'claim': {
        // Standard claim with recipient, amount, proof
        // In production, these would come from the airdrop's merkle tree
        const amount = body.amount || '0'
        const proof = body.proof || []
        claimData = claimer.encodeClaimData('claim', {
          recipient: recipientAddress,
          amount,
          proof
        })
        break
      }
      case 'claimSimple': {
        claimData = claimer.encodeClaimData('claimSimple', {})
        break
      }
      default: {
        claimData = body.claimData || '0x'
      }
    }

    // If sponsor private key provided, use gas sponsorship via Flashbots
    if (sponsorPrivateKey) {
      const result = await claimer.claimWithSponsorship(
        contractAddress,
        chainId,
        claimData,
        privateKey,
        sponsorPrivateKey
      )
      return NextResponse.json({ results: [result] })
    }

    // Execute claim without sponsorship
    const result = await claimer.claimAirdrop(
      contractAddress,
      chainId,
      claimData,
      privateKey
    )

    return NextResponse.json({
      results: [result]
    })
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Claim failed'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
