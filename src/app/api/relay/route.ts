/**
 * Server-Side Relay Endpoint
 *
 * Accepts signed meta-transactions and submits them to the blockchain.
 * The server wallet pays gas; fee is deducted from claimed tokens.
 *
 * POST: { signedTx, chainId, feePayment }
 * Response: { success, txHash, error }
 */

import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { sanitizeErrorMessage } from '@/lib/validation'

// Server relay wallet — pays gas for users
const RELAY_PRIVATE_KEY = process.env.RELAY_PRIVATE_KEY || ''

// SweepGuard Rescuer contracts
const SWEEPGUARD_RESCUER: Record<number, string> = {
  8453: '0xDB671f97bfB72e324A758588456373EEC141400F', // Base
}

// RPC URLs
const RPC_URLS: Record<number, string> = {
  1: 'https://eth.drpc.org',
  8453: 'https://mainnet.base.org',
  42161: 'https://arb1.arbitrum.io/rpc',
  137: 'https://polygon-rpc.com',
  56: 'https://bsc-dataseed.binance.org',
  10: 'https://mainnet.optimism.io',
  43114: 'https://api.avax.network/ext/bc/C/rpc',
  250: 'https://rpc.ftm.tools',
  81457: 'https://rpc.blast.io',
  324: 'https://mainnet.era.zksync.io',
  59144: 'https://rpc.linea.build',
  5000: 'https://rpc.mantle.xyz',
  534352: 'https://rpc.scroll.io',
  80094: 'https://rpc.berachain.com',
  1329: 'https://evm-rpc.sei-apis.com',
}

// ============================================================
// Rate limiting (simple in-memory)
// ============================================================
const rateLimitMap: Map<string, { count: number; resetAt: number }> = new Map()
const RATE_LIMIT_WINDOW = 60_000 // 1 minute
const RATE_LIMIT_MAX = 5 // 5 requests per minute per IP

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return true
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false
  }

  entry.count++
  return true
}

// ============================================================
// POST Handler
// ============================================================

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json({
        error: 'Rate limit exceeded. Please wait before trying again.',
      }, { status: 429 })
    }

    const body = await request.json()
    const { signedTx, chainId, feePayment = 'deduct' } = body

    if (!signedTx || !chainId) {
      return NextResponse.json({
        error: 'signedTx and chainId required',
      }, { status: 400 })
    }

    if (!RELAY_PRIVATE_KEY) {
      return NextResponse.json({
        error: 'Server relay not configured. Set RELAY_PRIVATE_KEY environment variable.',
      }, { status: 500 })
    }

    const rpcUrl = RPC_URLS[chainId]
    if (!rpcUrl) {
      return NextResponse.json({
        error: `Chain ${chainId} not supported`,
      }, { status: 400 })
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const relayWallet = new ethers.Wallet(RELAY_PRIVATE_KEY, provider)

    // Extract the typed data and signature
    const { typedData, signature } = signedTx
    if (!typedData || !signature) {
      return NextResponse.json({
        error: 'signedTx must contain typedData and signature',
      }, { status: 400 })
    }

    const domain = typedData.domain
    const message = typedData.message
    const types = typedData.types

    // Verify signature
    const verifyTypes = { ...types }
    delete verifyTypes.EIP712Domain

    let recoveredAddress: string
    try {
      recoveredAddress = ethers.verifyTypedData(
        domain,
        verifyTypes,
        message,
        signature
      )
    } catch (err: unknown) {
      return NextResponse.json({
        error: `Signature verification failed: ${sanitizeErrorMessage(err)}`,
      }, { status: 400 })
    }

    if (recoveredAddress.toLowerCase() !== message.hackedWallet.toLowerCase()) {
      return NextResponse.json({
        error: `Signature mismatch. Expected ${message.hackedWallet}, got ${recoveredAddress}`,
      }, { status: 400 })
    }

    // Check deadline
    const deadline = Number(message.deadline)
    if (Math.floor(Date.now() / 1000) > deadline) {
      return NextResponse.json({
        error: 'Signature has expired. Please sign again.',
      }, { status: 400 })
    }

    // Verify safe wallet ≠ hacked wallet
    if (message.safeWallet.toLowerCase() === message.hackedWallet.toLowerCase()) {
      return NextResponse.json({
        error: 'Safe wallet CANNOT be the hacked wallet!',
      }, { status: 400 })
    }

    const claimerAddress = SWEEPGUARD_RESCUER[chainId]
    if (!claimerAddress) {
      return NextResponse.json({
        error: `SweepGuardRescuer not deployed on chain ${chainId}`,
      }, { status: 400 })
    }

    // Build claimAndSplit calldata
    const claimerIface = new ethers.Interface([
      'function claimAndSplit(address hackedWallet, address safeWallet, address tokenAddress, address airdropContract, bytes claimData, uint256 amount, uint256 deadline, uint256 nonce, bytes signature)',
    ])

    const execData = claimerIface.encodeFunctionData('claimAndSplit', [
      message.hackedWallet,
      message.safeWallet,
      message.tokenAddress,
      message.airdropContract,
      message.claimData,
      BigInt(message.amount),
      deadline,
      Number(message.nonce),
      signature,
    ])

    // Get relay wallet state
    const [balance, feeData, relayNonce] = await Promise.all([
      provider.getBalance(relayWallet.address),
      provider.getFeeData(),
      provider.getTransactionCount(relayWallet.address, 'latest'),
    ])

    const maxFeePerGas = feeData.maxFeePerGas || feeData.gasPrice || ethers.parseUnits('20', 'gwei')
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || ethers.parseUnits('2', 'gwei')
    const gasNeeded = maxFeePerGas * 400000n

    if (balance < gasNeeded) {
      return NextResponse.json({
        error: `Relay wallet needs ${ethers.formatEther(gasNeeded)} ETH for gas. Has: ${ethers.formatEther(balance)}`,
      }, { status: 500 })
    }

    // Simulate before submitting
    try {
      await provider.call({
        to: claimerAddress,
        data: execData,
        from: relayWallet.address,
        value: 0n,
      })
    } catch (simErr: unknown) {
      return NextResponse.json({
        error: `Claim simulation failed: ${sanitizeErrorMessage(simErr)}`,
        simulationFailed: true,
      }, { status: 400 })
    }

    // Submit the transaction
    const tx = await relayWallet.sendTransaction({
      to: claimerAddress,
      data: execData,
      value: 0n,
      gasLimit: 400000n,
      maxFeePerGas,
      maxPriorityFeePerGas,
      nonce: relayNonce,
      chainId: BigInt(chainId),
      type: 2,
    })

    console.log(`✅ Relay TX submitted: ${tx.hash} (chain ${chainId})`)

    // Wait for confirmation
    const receipt = await tx.wait(1, 60000).catch(() => null)

    if (receipt && receipt.status === 1) {
      return NextResponse.json({
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        relayProvider: 'self',
        feePayment,
        message: 'Gasless claim executed via SweepGuard relay!',
      })
    }

    return NextResponse.json({
      error: `Transaction reverted. TX: ${tx.hash}`,
      txHash: tx.hash,
    })
  } catch (err: unknown) {
    console.error('Relay API error:', err)
    return NextResponse.json({
      error: sanitizeErrorMessage(err),
    }, { status: 500 })
  }
}
