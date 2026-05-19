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

  switch (action) {
    case 'scan': {
      try {
        const rpcUrl = process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com'
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
        const rpcUrl = process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com'
        const result = await executeFullRecovery({
          compromisedWalletPrivateKey: privateKey,
          safeWalletAddress: safeAddress,
          chainId: chainId || 1,
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
