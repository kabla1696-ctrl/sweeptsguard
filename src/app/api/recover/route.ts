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

  // ALL 15 chain RPCs
  const rpcUrls: Record<number, string> = {
    1: process.env.ETHEREUM_RPC_URL || 'https://eth.drpc.org',
    8453: process.env.BASE_RPC_URL || 'https://base.drpc.org',
    56: process.env.BSC_RPC_URL || 'https://bsc.drpc.org',
    42161: process.env.ARBITRUM_RPC_URL || 'https://arbitrum.drpc.org',
    137: process.env.POLYGON_RPC_URL || 'https://polygon.drpc.org',
    10: process.env.OPTIMISM_RPC_URL || 'https://optimism.drpc.org',
    43114: 'https://api.avax.network/ext/bc/C/rpc',
    250: 'https://rpc.ftm.tools',
    25: 'https://evm.cronos.org',
    81457: 'https://rpc.blast.io',
    7777777: 'https://rpc.zora.energy',
    1101: 'https://zkevm-rpc.com',
    169: 'https://pacific-rpc.manta.network/http',
    324: 'https://mainnet.era.zksync.io',
    59144: 'https://rpc.linea.build'
  }

  // Native gas token names per chain
  const gasTokenNames: Record<number, string> = {
    1: 'ETH', 8453: 'ETH', 56: 'BNB', 42161: 'ETH', 137: 'MATIC', 10: 'ETH',
    43114: 'AVAX', 250: 'FTM', 25: 'CRO', 81457: 'ETH', 7777777: 'ETH',
    1101: 'ETH', 169: 'ETH', 324: 'ETH', 59144: 'ETH'
  }

  switch (action) {
    case 'scan': {
      try {
        // Scan ALL chains for delegations
        const allChains = [1, 8453, 56, 42161, 137, 10, 43114, 250, 25, 81457, 7777777, 1101, 169, 324, 59144]
        const delegations: { chainId: number; chainName: string; delegatedTo: string; isDrainer: boolean; drainerName?: string }[] = []
        const failedChains: number[] = []

        // Check delegation on ALL chains (with timeout)
        const chainNames: Record<number, string> = { 1: 'Ethereum', 8453: 'Base', 56: 'BNB Chain', 42161: 'Arbitrum', 137: 'Polygon', 10: 'Optimism', 43114: 'Avalanche', 250: 'Fantom', 25: 'Cronos', 81457: 'Blast', 7777777: 'Zora', 1101: 'Polygon zkEVM', 169: 'Manta', 324: 'zkSync', 59144: 'Linea' }

        const delegationPromises = allChains.map(async (cid) => {
          try {
            const rpcUrl = rpcUrls[cid]
            if (!rpcUrl) { failedChains.push(cid); return null }
            const provider = new ethers.JsonRpcProvider(rpcUrl)
            // 10 second timeout per chain
            const codePromise = provider.getCode(walletAddress)
            const timeoutPromise = new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 10000)
            )
            const code = await Promise.race([codePromise, timeoutPromise])
            if (code && code.startsWith('0xef0100')) {
              const delegatedTo = '0x' + code.slice(8, 48)
              delegations.push({ chainId: cid, chainName: chainNames[cid] || `Chain ${cid}`, delegatedTo, isDrainer: false })
              return { chainId: cid, code }
            }
            return null
          } catch (err) {
            failedChains.push(cid)
            return null
          }
        })

        await Promise.all(delegationPromises)

        // Get ETH + token balances (Ethereum only for now)
        const rpcUrl = rpcUrls[1]
        const assets = await scanRecoverableAssets(walletAddress, rpcUrl)

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
          hasDelegation: delegations.length > 0,
          delegatedTo: delegations.length > 0 ? delegations[0].delegatedTo : null,
          delegations,
          failedChains,
          totalChainsScanned: allChains.length
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
        const gasToken = gasTokenNames[targetChain] || 'ETH'

        // If sponsor private key provided, use Flashbots atomic bundle
        if (sponsorPrivateKey) {
          const result = await executeRevokeDelegation(
            privateKey,
            sponsorPrivateKey,
            targetChain,
            rpcUrl,
            gasToken
          )
          return NextResponse.json(result)
        }

        // Otherwise, try direct revoke (wallet needs gas token)
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

        // Check if wallet has enough gas token
        const balance = await provider.getBalance(walletAddress)
        const gasNeeded = BigInt(21000) * gasPrice

        if (balance < gasNeeded) {
          return NextResponse.json({
            success: false,
            error: `Insufficient gas. Need ${ethers.formatEther(gasNeeded)} ${gasToken}, wallet has ${ethers.formatEther(balance)} ${gasToken}. Provide sponsor private key for gas sponsorship via Flashbots.`
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
