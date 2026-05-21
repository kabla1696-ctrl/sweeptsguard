import { NextRequest, NextResponse } from 'next/server'
import { scanRecoverableAssets, executeFullRecovery, executeRevokeDelegation, executeFullRecoveryAndRevoke, executePermitSweep } from '@/lib/fundRecovery'
import { isKnownDrainer } from '@/lib/draindb'
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

  // ALL 33 chain RPCs
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
    59144: 'https://rpc.linea.build',
    5000: 'https://rpc.mantle.xyz',
    34443: 'https://mainnet.mode.network',
    534352: 'https://rpc.scroll.io',
    100: 'https://rpc.gnosischain.com',
    7000: 'https://zeta-chain.drpc.org',
    1625: 'https://rpc.gravity.xyz',
    1116: 'https://rpc.coredao.org',
    1329: 'https://evm-rpc.sei-apis.com',
    80094: 'https://rpc.berachain.com',
    57073: 'https://rpc-gel.inkonchain.com',
    196: 'https://rpc.xlayer.tech',
    43111: 'https://rpc.hemi.network',
    8217: 'https://public-en.node.kaia.io',
    1868: 'https://rpc.soneium.org',
    2818: 'https://rpc.morphl2.io',
    1923: 'https://swell-mainnet.alt.technology',
    10143: 'https://testnet-rpc.monad.xyz',
    16600: 'https://evm.0g.ai'
  }

  // Native gas token names per chain
  const gasTokenNames: Record<number, string> = {
    1: 'ETH', 8453: 'ETH', 56: 'BNB', 42161: 'ETH', 137: 'MATIC', 10: 'ETH',
    43114: 'AVAX', 250: 'FTM', 25: 'CRO', 81457: 'ETH', 7777777: 'ETH',
    1101: 'ETH', 169: 'ETH', 324: 'ETH', 59144: 'ETH', 5000: 'MNT',
    34443: 'ETH', 534352: 'ETH', 100: 'xDai', 7000: 'ZETA', 1625: 'G',
    1116: 'CORE', 1329: 'SEI', 80094: 'BERA', 57073: 'ETH', 196: 'OKB',
    43111: 'ETH', 8217: 'KAIA', 1868: 'ETH', 2818: 'ETH', 1923: 'ETH',
    10143: 'MON', 16600: '0G'
  }

  // Chain names
  const chainNames: Record<number, string> = {
    1: 'Ethereum', 8453: 'Base', 56: 'BNB Chain', 42161: 'Arbitrum', 137: 'Polygon',
    10: 'Optimism', 43114: 'Avalanche', 250: 'Fantom', 25: 'Cronos', 81457: 'Blast',
    7777777: 'Zora', 1101: 'Polygon zkEVM', 169: 'Manta', 324: 'zkSync', 59144: 'Linea',
    5000: 'Mantle', 34443: 'Mode', 534352: 'Scroll', 100: 'Gnosis', 7000: 'ZetaChain',
    1625: 'Gravity', 1116: 'Core', 1329: 'Sei', 80094: 'Berachain', 57073: 'Ink',
    196: 'XLayer', 43111: 'Hemi', 8217: 'Kaia', 1868: 'Soneium', 2818: 'Morph',
    1923: 'Swellchain', 10143: 'Monad', 16600: '0G'
  }

  // Explorer base URLs per chain
  const explorerUrls: Record<number, string> = {
    1: 'https://etherscan.io', 8453: 'https://basescan.org', 56: 'https://bscscan.com',
    42161: 'https://arbiscan.io', 137: 'https://polygonscan.com', 10: 'https://optimistic.etherscan.io',
    43114: 'https://snowtrace.io', 250: 'https://ftmscan.com', 25: 'https://cronoscan.com',
    81457: 'https://blastscan.io', 7777777: 'https://explorer.zora.energy', 1101: 'https://zkevm.polygonscan.com',
    169: 'https://pacific-explorer.manta.network', 324: 'https://explorer.zksync.io',
    59144: 'https://lineascan.build', 5000: 'https://mantlescan.xyz', 34443: 'https://explorer.mode.network',
    534352: 'https://scrollscan.com', 100: 'https://gnosisscan.io', 7000: 'https://explorer.zetachain.com',
    1625: 'https://explorer.gravity.xyz', 1116: 'https://scan.coredao.org', 1329: 'https://seitrace.com',
    80094: 'https://berascan.com', 57073: 'https://explorer.inkonchain.com', 196: 'https://www.okx.com/explorer/xlayer',
    43111: 'https://explorer.hemi.xyz', 8217: 'https://kaiascan.io', 1868: 'https://soneium.blockscout.com',
    2818: 'https://explorer.morphl2.io', 1923: 'https://swellscan.io', 10143: 'https://testnet.monadexplorer.com',
    16600: 'https://evm.0g.ai'
  }

  // All supported chains
  const ALL_CHAINS = [1, 8453, 56, 42161, 137, 10, 43114, 250, 25, 81457, 7777777, 1101, 169, 324, 59144, 5000, 34443, 534352, 100, 7000, 1625, 1116, 1329, 80094, 57073, 196, 43111, 8217, 1868, 2818, 1923, 10143, 16600]

  switch (action) {
    case 'scan': {
      try {
        // ── Phase 1: Scan ALL chains for delegations (parallel) ──
        const delegations: { chainId: number; chainName: string; delegatedTo: string; isDrainer: boolean; drainerName?: string }[] = []
        const failedChains: number[] = []

        const delegationPromises = ALL_CHAINS.map(async (cid) => {
          try {
            const rpcUrl = rpcUrls[cid]
            if (!rpcUrl) { failedChains.push(cid); return null }
            const provider = new ethers.JsonRpcProvider(rpcUrl)
            const codePromise = provider.getCode(walletAddress)
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), 10000)
            )
            const code = await Promise.race([codePromise, timeoutPromise])
            if (code && code.startsWith('0xef0100')) {
              const delegatedTo = '0x' + code.slice(8, 48)
              // Check if delegation target is a known drainer
              const drainerCheck = isKnownDrainer(delegatedTo)
              delegations.push({
                chainId: cid,
                chainName: chainNames[cid] || `Chain ${cid}`,
                delegatedTo,
                isDrainer: !!drainerCheck,
                drainerName: drainerCheck?.name
              })
              return { chainId: cid, code }
            }
            return null
          } catch {
            failedChains.push(cid)
            return null
          }
        })

        await Promise.all(delegationPromises)

        // ── Phase 2: Scan ALL chains for assets (parallel) ──
        const assetPromises = ALL_CHAINS.map(async (cid) => {
          const rpc = rpcUrls[cid]
          if (!rpc) return null
          try {
            const chainAssets = await scanRecoverableAssets(walletAddress, rpc)
            if (chainAssets.tokens.length > 0 || parseFloat(chainAssets.ethFormatted) > 0.0001) {
              return {
                chainId: cid,
                chainName: chainNames[cid] || `Chain ${cid}`,
                explorerUrl: explorerUrls[cid] || `https://etherscan.io`,
                gasToken: gasTokenNames[cid] || 'ETH',
                ethBalance: chainAssets.ethBalance.toString(),
                ethFormatted: chainAssets.ethFormatted,
                tokens: chainAssets.tokens.map(t => ({
                  address: t.address,
                  symbol: t.symbol,
                  decimals: t.decimals,
                  balance: t.balance.toString(),
                  balanceFormatted: t.balanceFormatted
                }))
              }
            }
            return null
          } catch {
            return null
          }
        })

        const chainResults = (await Promise.all(assetPromises)).filter(Boolean)

        // Calculate total value summary
        const totalEthAcrossChains = chainResults.reduce((sum, r) => {
          return sum + parseFloat(r!.ethFormatted)
        }, 0)
        const totalTokensAcrossChains = chainResults.reduce((sum, r) => {
          return sum + r!.tokens.length
        }, 0)
        const chainsWithAssets = chainResults.filter(r =>
          parseFloat(r!.ethFormatted) > 0.0001 || r!.tokens.length > 0
        ).length

        return NextResponse.json({
          address: walletAddress,
          multiChainAssets: chainResults,
          hasDelegation: delegations.length > 0,
          delegations,
          failedChains,
          totalChainsScanned: ALL_CHAINS.length,
          summary: {
            totalEthAcrossChains: totalEthAcrossChains.toFixed(6),
            totalTokens: totalTokensAcrossChains,
            chainsWithAssets,
            chainsWithDelegation: delegations.length,
            drainerDetected: delegations.some(d => d.isDrainer)
          }
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

      // Validate safe address
      try {
        ethers.getAddress(safeAddress)
      } catch {
        return NextResponse.json({ error: 'Invalid safe wallet address format' }, { status: 400 })
      }

      // Must provide sponsor key for gas
      if (!sponsorPrivateKey) {
        return NextResponse.json({ error: 'Sponsor wallet private key required — pays gas for recovery' }, { status: 400 })
      }

      try {
        const targetChain = chainId || 1
        const rpcUrl = rpcUrls[targetChain] || rpcUrls[1]

        // ── Strategy 1: Permit-based sweep (tokens with EIP-2612)
        // No gas funding to compromised wallet = drainer can't intercept
        console.log('🔐 Trying permit-based sweep first (no gas funding to compromised wallet)...')
        const permitResult = await executePermitSweep(
          privateKey,
          sponsorPrivateKey,
          safeAddress,
          targetChain,
          rpcUrl
        )

        if (permitResult.success) {
          console.log('✅ Permit sweep succeeded!')
          return NextResponse.json({
            ...permitResult,
            strategy: 'permit-sweep',
            message: 'Tokens recovered via permit — drainer had no chance to intercept',
            explorerUrl: explorerUrls[targetChain] || 'https://etherscan.io'
          })
        }

        // ── Strategy 2: Standard atomic recovery (Flashbots / L2 private sequencer)
        console.log('⚠️ Permit sweep unavailable, falling back to atomic bundle recovery...')
        const result = await executeFullRecoveryAndRevoke(
          privateKey,
          sponsorPrivateKey,
          safeAddress,
          targetChain,
          rpcUrl
        )

        return NextResponse.json({
          ...result,
          strategy: 'atomic-bundle',
          message: result.success
            ? 'Funds recovered via atomic bundle — submitted in single block'
            : 'Recovery failed. Check sponsor wallet balance and try again.',
          explorerUrl: explorerUrls[targetChain] || 'https://etherscan.io'
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

        if (!sponsorPrivateKey) {
          return NextResponse.json({ error: 'Sponsor private key required for revoke gas' }, { status: 400 })
        }

        const result = await executeRevokeDelegation(
          privateKey,
          sponsorPrivateKey,
          targetChain,
          rpcUrl,
          gasToken
        )
        return NextResponse.json({
          ...result,
          explorerUrl: explorerUrls[targetChain] || 'https://etherscan.io'
        })
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Revoke failed'
        return NextResponse.json({ error: errorMessage }, { status: 500 })
      }
    }

    case 'revoke-all': {
      // One-click revoke ALL delegations across ALL chains
      if (!sponsorPrivateKey) {
        return NextResponse.json({ error: 'Sponsor private key required for batch revoke' }, { status: 400 })
      }

      try {
        // Step 1: Scan all chains for delegations
        const chainsWithDelegation: { chainId: number; rpcUrl: string; gasToken: string; chainName: string; delegatedTo: string; isDrainer: boolean }[] = []

        const scanPromises = ALL_CHAINS.map(async (cid) => {
          try {
            const rpc = rpcUrls[cid]
            if (!rpc) return null
            const provider = new ethers.JsonRpcProvider(rpc)
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), 10000)
            )
            const code = await Promise.race([provider.getCode(walletAddress), timeoutPromise])
            if (code && code.startsWith('0xef0100')) {
              const delegatedTo = '0x' + code.slice(8, 48)
              const drainerCheck = isKnownDrainer(delegatedTo)
              return {
                chainId: cid,
                rpcUrl: rpc,
                gasToken: gasTokenNames[cid] || 'ETH',
                chainName: chainNames[cid] || `Chain ${cid}`,
                delegatedTo,
                isDrainer: !!drainerCheck
              }
            }
            return null
          } catch {
            return null
          }
        })

        const scanResults = await Promise.all(scanPromises)
        for (const r of scanResults) {
          if (r) chainsWithDelegation.push(r)
        }

        if (chainsWithDelegation.length === 0) {
          return NextResponse.json({
            success: true,
            message: 'No delegations found on any chain.',
            revokedChains: [],
            totalFee: '0'
          })
        }

        // Step 2: Revoke on each chain (parallel)
        const revokePromises = chainsWithDelegation.map(async (chain) => {
          try {
            const result = await executeRevokeDelegation(
              privateKey,
              sponsorPrivateKey,
              chain.chainId,
              chain.rpcUrl,
              chain.gasToken
            )
            return {
              chainId: chain.chainId,
              chainName: chain.chainName,
              delegatedTo: chain.delegatedTo,
              isDrainer: chain.isDrainer,
              success: result.success,
              txHashes: result.txHashes,
              explorerUrl: explorerUrls[chain.chainId] || 'https://etherscan.io',
              error: result.error
            }
          } catch (err: unknown) {
            return {
              chainId: chain.chainId,
              chainName: chain.chainName,
              delegatedTo: chain.delegatedTo,
              isDrainer: chain.isDrainer,
              success: false,
              txHashes: [],
              explorerUrl: explorerUrls[chain.chainId] || 'https://etherscan.io',
              error: err instanceof Error ? err.message : 'Revoke failed'
            }
          }
        })

        const revokeResults = await Promise.all(revokePromises)
        const successCount = revokeResults.filter(r => r.success).length
        const failCount = revokeResults.filter(r => !r.success).length

        return NextResponse.json({
          success: successCount > 0,
          message: `Batch revoke: ${successCount} succeeded, ${failCount} failed out of ${chainsWithDelegation.length} chains.`,
          revokedChains: revokeResults,
          totalChainsWithDelegation: chainsWithDelegation.length,
          successfulRevokes: successCount,
          failedRevokes: failCount,
          totalFee: (chainsWithDelegation.length * 40).toString(),
          feePerChain: '40'
        })
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Batch revoke failed'
        return NextResponse.json({ error: errorMessage }, { status: 500 })
      }
    }

    case 'recover-and-revoke': {
      if (!safeAddress) {
        return NextResponse.json({ error: 'Safe address required' }, { status: 400 })
      }
      if (!sponsorPrivateKey) {
        return NextResponse.json({ error: 'Sponsor private key required for gas' }, { status: 400 })
      }

      // Validate safe address
      try {
        ethers.getAddress(safeAddress)
      } catch {
        return NextResponse.json({ error: 'Invalid safe wallet address format' }, { status: 400 })
      }

      try {
        const targetChain = chainId || 1
        const rpcUrl = rpcUrls[targetChain] || rpcUrls[1]
        const result = await executeFullRecoveryAndRevoke(
          privateKey,
          sponsorPrivateKey,
          safeAddress,
          targetChain,
          rpcUrl
        )
        return NextResponse.json({
          ...result,
          explorerUrl: explorerUrls[targetChain] || 'https://etherscan.io'
        })
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Recovery failed'
        return NextResponse.json({ error: errorMessage }, { status: 500 })
      }
    }

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }
}
