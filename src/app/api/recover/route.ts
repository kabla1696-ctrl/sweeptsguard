import { NextRequest, NextResponse } from 'next/server'
import { scanRecoverableAssets, executeFullRecovery } from '@/lib/fundRecovery'
import { ethers } from 'ethers'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action, privateKey, safeAddress, chainId } = body

  if (!privateKey) {
    return NextResponse.json({ error: 'Private key required' }, { status: 400 })
  }

  // Validate private key
  let walletAddress: string
  try {
    const wallet = new ethers.Wallet(privateKey)
    walletAddress = wallet.address
  } catch {
    return NextResponse.json({ error: 'Invalid private key' }, { status: 400 })
  }

  // Use multiple RPC fallbacks (avoid Cloudflare-blocked ones)
  const rpcUrls: Record<number, string> = {
    1: process.env.ETHEREUM_RPC_URL || 'https://eth.drpc.org',
    8453: process.env.BASE_RPC_URL || 'https://base.drpc.org',
    56: process.env.BSC_RPC_URL || 'https://bsc.drpc.org',
    42161: process.env.ARBITRUM_RPC_URL || 'https://arbitrum.drpc.org',
    137: process.env.POLYGON_RPC_URL || 'https://polygon.drpc.org',
    10: process.env.OPTIMISM_RPC_URL || 'https://optimism.drpc.org'
  }

  switch (action) {
    case 'scan': {
      try {
        const rpcUrl = rpcUrls[1]
        const assets = await scanRecoverableAssets(walletAddress, rpcUrl)
        return NextResponse.json({
          address: walletAddress,
          ...assets
        })
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Scan failed'
        return NextResponse.json({ error: errorMessage }, { status: 500 })
      }
    }

    case 'recover': {
      if (!safeAddress) {
        return NextResponse.json({ error: 'Safe address required' }, { status: 400 })
      }

      try {
        const targetChain = chainId || 1
        const rpcUrl = rpcUrls[targetChain] || rpcUrls[1]
        const result = await executeFullRecovery({
          compromisedWalletPrivateKey: privateKey,
          safeWalletAddress: safeAddress,
          chainId: targetChain,
          rpcUrl
        })
        return NextResponse.json(result)
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Recovery failed'
        return NextResponse.json({ error: errorMessage }, { status: 500 })
      }
    }

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }
}
