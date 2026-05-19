import { NextRequest, NextResponse } from 'next/server'
import { claimer, PLATFORM_FEE_WALLET, PLATFORM_FEE_PERCENT } from '@/lib/claimer'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { contractAddress, chainId, claimMethod, recipientAddress, privateKey, sponsorPrivateKey, mode, eligibleAddress, tokenAddress, useFeeCollector, feeMode, gasPrice } = body

  if (!contractAddress || !chainId || !privateKey) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    // MODE: claimFromAnyWallet — use any wallet with gas to claim for compromised wallet
    if (mode === 'claimFromAnyWallet' && eligibleAddress) {
      // Encode claim data with eligibleAddress as recipient
      let claimData: string
      try {
        claimData = claimer.encodeClaimData('claim', {
          recipient: eligibleAddress,  // tokens go to eligible (compromised) address
          amount: body.amount || '0',
          proof: body.proof || []
        })
      } catch {
        // Fallback to simple claim
        claimData = claimer.encodeClaimData('claimSimple', {})
      }

      // Use recipientAddress as the safe wallet if provided, otherwise eligibleAddress
      const safeWallet = recipientAddress || eligibleAddress

      // If useFeeCollector is true, use FeeCollector contract (20% fee)
      if (useFeeCollector && tokenAddress) {
        const result = await claimer.claimWithFee(
          contractAddress,
          chainId,
          claimData,
          tokenAddress,
          safeWallet,
          privateKey
        )
        return NextResponse.json({ 
          results: [result],
          fee: {
            wallet: PLATFORM_FEE_WALLET,
            percent: PLATFORM_FEE_PERCENT,
            note: '20% of claimed tokens sent to platform fee wallet'
          }
        })
      }

      const result = await claimer.claimFromAnyWallet(
        contractAddress,
        chainId,
        eligibleAddress,
        safeWallet,
        privateKey,  // this is the "from" wallet (with gas)
        claimData
      )
      return NextResponse.json({ results: [result] })
    }

    // Encode claim data based on method
    let claimData: string

    switch (claimMethod) {
      case 'claim': {
        if (!recipientAddress) {
          return NextResponse.json({ error: 'Recipient address required' }, { status: 400 })
        }
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

    // If useFeeCollector is true, use FeeCollector contract
    if (useFeeCollector && tokenAddress && recipientAddress) {
      const result = await claimer.claimWithFee(
        contractAddress,
        chainId,
        claimData,
        tokenAddress,
        recipientAddress,
        privateKey
      )
      return NextResponse.json({ 
        results: [result],
        fee: {
          wallet: PLATFORM_FEE_WALLET,
          percent: PLATFORM_FEE_PERCENT,
          note: '20% of claimed tokens sent to platform fee wallet'
        }
      })
    }

    // If sponsor private key provided, use gas sponsorship via Flashbots
    if (sponsorPrivateKey) {
      const result = await claimer.claimWithSponsorship(
        contractAddress,
        chainId,
        claimData,
        privateKey,
        sponsorPrivateKey,
        tokenAddress,  // For fee collector
        recipientAddress,  // User's safe wallet
        feeMode,  // Fee mode from extension
        gasPrice  // Gas price from extension
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
