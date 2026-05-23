import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { scanNFTs, scanNFTsAllChains, batchNFTTransfer, getNFTGasParams } from '@/lib/nftRescue'
import { CHAINS } from '@/lib/chains'
import { sanitizeErrorMessage, isValidAddress } from '@/lib/validation'
import { rateLimit, getClientIp } from '@/lib/rateLimit'
import { captureError } from '@/lib/sentry'

// ============================================================
// NFT API
// GET:  ?address=0x...&chainId=1    → Returns all NFTs owned by address
// POST: { action: "sweep", compromisedAddress, safeAddress, chainId }
//       → Sweep all NFTs to safe wallet
// ============================================================

export async function GET(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = rateLimit(ip)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetTime - Date.now()) / 1000)) } }
    )
  }

  const address = request.nextUrl.searchParams.get('address')
  const chainIdParam = request.nextUrl.searchParams.get('chainId')

  if (!address || !isValidAddress(address)) {
    return NextResponse.json({ error: 'Invalid EVM address' }, { status: 400 })
  }

  try {
    if (chainIdParam) {
      const chainId = parseInt(chainIdParam)
      if (!CHAINS[chainId]) {
        return NextResponse.json({ error: `Unsupported chain ID: ${chainId}` }, { status: 400 })
      }
      const nfts = await scanNFTs(address, chainId)
      return NextResponse.json({ nfts, chainId, total: nfts.length })
    }

    // Scan all chains
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('NFT scan timed out')), 300000)
    )

    const result = await Promise.race([
      scanNFTsAllChains(address),
      timeoutPromise
    ])

    return NextResponse.json({
      nfts: result.nfts,
      total: result.nfts.length,
      failedChains: result.failedChains
    })
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: '/api/nft', address })
    return NextResponse.json(
      { error: sanitizeErrorMessage(err) },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const postIp = getClientIp(request)
  const postRl = rateLimit(postIp)
  if (!postRl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((postRl.resetTime - Date.now()) / 1000)) } }
    )
  }

  try {
    const body = await request.json()
    const { action, compromisedAddress, safeAddress, chainId, privateKey } = body

    if (action !== 'sweep') {
      return NextResponse.json({ error: 'Invalid action. Use "sweep".' }, { status: 400 })
    }

    if (!compromisedAddress || !isValidAddress(compromisedAddress)) {
      return NextResponse.json({ error: 'Invalid compromised address' }, { status: 400 })
    }
    if (!safeAddress || !isValidAddress(safeAddress)) {
      return NextResponse.json({ error: 'Invalid safe address' }, { status: 400 })
    }
    if (!privateKey) {
      return NextResponse.json({ error: 'Private key required for sweep' }, { status: 400 })
    }

    const chain = CHAINS[chainId]
    if (!chain) {
      return NextResponse.json({ error: `Unsupported chain ID: ${chainId}` }, { status: 400 })
    }

    // Scan for NFTs on this chain
    const nfts = await scanNFTs(compromisedAddress, chainId)
    if (nfts.length === 0) {
      return NextResponse.json({ error: 'No NFTs found on this chain', nfts: [] }, { status: 200 })
    }

    // Setup provider and wallet
    const provider = new ethers.JsonRpcProvider(chain.rpc)
    const wallet = new ethers.Wallet(privateKey, provider)
    const gasParams = await getNFTGasParams(provider, chainId)
    let nonce = await provider.getTransactionCount(wallet.address, 'pending')

    // Build batch transfer transactions
    const transferTxs = batchNFTTransfer(nfts, compromisedAddress, safeAddress, nonce, gasParams)

    // Sign and submit transactions
    const results: { nft: string; tokenId: string; txHash?: string; error?: string }[] = []

    for (const tx of transferTxs) {
      try {
        const signedTx = await wallet.signTransaction({
          to: tx.to,
          data: tx.data,
          value: tx.value,
          gasLimit: tx.gasLimit,
          chainId,
          nonce: nonce++,
          ...(gasParams.type === 2
            ? { type: 2, maxFeePerGas: gasParams.maxFeePerGas, maxPriorityFeePerGas: gasParams.maxPriorityFeePerGas }
            : { gasPrice: gasParams.gasPrice })
        })

        const broadcast = await provider.broadcastTransaction(signedTx)
        results.push({
          nft: tx.nft.contractAddress,
          tokenId: tx.nft.tokenId,
          txHash: broadcast.hash
        })
      } catch (err) {
        results.push({
          nft: tx.nft.contractAddress,
          tokenId: tx.nft.tokenId,
          error: err instanceof Error ? err.message : 'Transfer failed'
        })
      }
    }

    return NextResponse.json({
      success: true,
      chainId,
      chainName: chain.name,
      nftsFound: nfts.length,
      transfers: results
    })
  } catch (err) {
    return NextResponse.json(
      { error: sanitizeErrorMessage(err) },
      { status: 500 }
    )
  }
}
