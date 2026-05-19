import { NextRequest, NextResponse } from 'next/server'
import { scanRecoverableAssets, executeFullRecovery, executeRevokeDelegation } from '@/lib/fundRecovery'
import { ethers } from 'ethers'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action, privateKey, safeAddress, chainId, sponsorPrivateKey } = body

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
        // Serialize BigInt values to strings for JSON
        return NextResponse.json({
          address: walletAddress,
          ethBalance: assets.ethBalance.toString(),
          ethFormatted: assets.ethFormatted,
          tokens: assets.tokens.map(t => ({
            address: t.address,
            symbol: t.symbol,
            decimals: t.decimals,
            balance: t.balance.toString(),
            balanceFormatted: t.balanceFormatted
          })),
          hasDelegation: assets.hasDelegation,
          delegatedTo: assets.delegatedTo
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
        // Serialize BigInt values
        return NextResponse.json({
          ...result,
          ethRecovered: result.ethRecovered?.toString()
        })
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Recovery failed'
        return NextResponse.json({ error: errorMessage }, { status: 500 })
      }
    }

    case 'revoke': {
      try {
        const targetChain = chainId || 1
        const rpcUrl = rpcUrls[targetChain] || rpcUrls[1]

        // If sponsor private key provided, use Flashbots atomic bundle
        if (sponsorPrivateKey) {
          const result = await executeRevokeDelegation(
            privateKey,
            sponsorPrivateKey,
            targetChain,
            rpcUrl
          )
          return NextResponse.json(result)
        }

        // Otherwise, try direct revoke (wallet needs ETH for gas)
        const provider = new ethers.JsonRpcProvider(rpcUrl)
        const wallet = new ethers.Wallet(privateKey, provider)

        // Check delegation
        const code = await provider.getCode(walletAddress)
        const hasDelegation = code.startsWith('0xef0100')

        if (!hasDelegation) {
          return NextResponse.json({ success: false, error: 'No active delegation found' })
        }

        // Get nonce and gas
        const nonce = await provider.getTransactionCount(walletAddress)
        const feeData = await provider.getFeeData()
        const gasPrice = feeData.gasPrice || feeData.maxFeePerGas || BigInt(0)

        // Check if wallet has enough ETH for gas
        const balance = await provider.getBalance(walletAddress)
        const gasNeeded = BigInt(21000) * gasPrice

        if (balance < gasNeeded) {
          return NextResponse.json({
            success: false,
            error: `Insufficient gas. Need ${ethers.formatEther(gasNeeded)} ETH, wallet has ${ethers.formatEther(balance)} ETH. Provide sponsor private key for gas sponsorship via Flashbots.`
          })
        }

        // Send revoke transaction (self-transfer clears delegation)
        const tx = await wallet.sendTransaction({
          to: walletAddress,
          value: 0n,
          gasLimit: 21000n,
          gasPrice,
          nonce
        })

        return NextResponse.json({
          success: true,
          message: `Delegation revoke tx sent! Hash: ${tx.hash}`,
          txHashes: [tx.hash]
        })
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Revoke failed'
        return NextResponse.json({ error: errorMessage }, { status: 500 })
      }
    }

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }
}
