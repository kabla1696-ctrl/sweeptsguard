/**
 * Gasless Claim API Route
 *
 * POST: Submit a gasless claim using meta-transactions.
 * The user signs an EIP-712 message, and the relay submits the TX.
 *
 * Request: { action, chainId, signedTx, targetAddress }
 * Response: { success, txHash, fee, error }
 */

import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { sanitizeErrorMessage } from '@/lib/validation'

const PLATFORM_FEE_WALLET = '0x7A3725154a2E6468F9549334394802e9E2822C2A'
const PLATFORM_FEE_PERCENT = 20

// SweepGuard Rescuer contracts (same as EIP-7702 rescue)
const SWEEPGUARD_RESCUER: Record<number, string> = {
  8453: '0xDB671f97bfB72e324A758588456373EEC141400F', // Base
}

// Server relay wallet (pays gas when no external relay available)
const RELAY_PRIVATE_KEY = process.env.RELAY_PRIVATE_KEY || ''

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
// EIP-712 Types for verification
// ============================================================

const META_TX_TYPES = {
  MetaTransaction: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'data', type: 'bytes' },
    { name: 'deadline', type: 'uint256' },
  ],
}

const CLAIM_AIRDROP_TYPES = {
  ClaimAirdrop: [
    { name: 'hackedWallet', type: 'address' },
    { name: 'safeWallet', type: 'address' },
    { name: 'tokenAddress', type: 'address' },
    { name: 'airdropContract', type: 'address' },
    { name: 'claimData', type: 'bytes' },
    { name: 'amount', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
  ],
}

// ============================================================
// POST Handler
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, chainId, signedTx, targetAddress, feePayment } = body

    if (!chainId) {
      return NextResponse.json({ error: 'chainId required' }, { status: 400 })
    }

    const rpcUrl = RPC_URLS[chainId]
    if (!rpcUrl) {
      return NextResponse.json({
        error: `Chain ${chainId} not supported for gasless claims`,
      }, { status: 400 })
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl)

    // ============ PREPARE ============
    // Return EIP-712 typed data for the user to sign
    if (action === 'prepare') {
      const {
        contractAddress,
        walletAddress,
        safeWallet,
        tokenAddress,
        claimableRaw,
        claimData,
      } = body

      if (!contractAddress || !walletAddress || !safeWallet) {
        return NextResponse.json({
          error: 'contractAddress, walletAddress, and safeWallet required',
        }, { status: 400 })
      }

      const claimerAddress = SWEEPGUARD_RESCUER[chainId]
      if (!claimerAddress) {
        return NextResponse.json({
          error: `Gasless claiming not available on chain ${chainId}. Deploy SweepGuardRescuer first.`,
        }, { status: 400 })
      }

      // Build claim calldata
      let finalClaimData = claimData || '0x'
      if (!claimData || claimData === '0x') {
        const iface = new ethers.Interface([
          'function claim()',
          'function claim(address to)',
        ])
        try {
          finalClaimData = iface.encodeFunctionData('claim', [walletAddress])
        } catch {
          finalClaimData = iface.encodeFunctionData('claim')
        }
      }

      // Get nonce from contract
      let nonce = 0
      try {
        const nonceIface = new ethers.Interface([
          'function getNonce(address) view returns (uint256)',
        ])
        const nonceData = nonceIface.encodeFunctionData('getNonce', [walletAddress])
        const nonceResult = await provider.call({ to: claimerAddress, data: nonceData })
        nonce = Number(nonceIface.decodeFunctionResult('getNonce', nonceResult)[0])
      } catch {
        // Contract may not have getNonce yet
      }

      const deadline = Math.floor(Date.now() / 1000) + 600 // 10 minutes

      // Estimate relay fee
      const feeData = await provider.getFeeData()
      const gasPrice = feeData.maxFeePerGas || feeData.gasPrice || ethers.parseUnits('20', 'gwei')
      const gasCost = gasPrice * 250000n
      const markup = gasCost * 10n / 100n
      const totalFee = gasCost + markup

      const typedData = {
        types: {
          EIP712Domain: [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' },
            { name: 'chainId', type: 'uint256' },
            { name: 'verifyingContract', type: 'address' },
          ],
          ClaimAirdrop: [
            { name: 'hackedWallet', type: 'address' },
            { name: 'safeWallet', type: 'address' },
            { name: 'tokenAddress', type: 'address' },
            { name: 'airdropContract', type: 'address' },
            { name: 'claimData', type: 'bytes' },
            { name: 'amount', type: 'uint256' },
            { name: 'deadline', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
          ],
        },
        primaryType: 'ClaimAirdrop',
        domain: {
          name: 'SweepGuard',
          version: '1',
          chainId,
          verifyingContract: claimerAddress,
        },
        message: {
          hackedWallet: ethers.getAddress(walletAddress),
          safeWallet: ethers.getAddress(safeWallet),
          tokenAddress: ethers.getAddress(tokenAddress || contractAddress),
          airdropContract: ethers.getAddress(contractAddress),
          claimData: finalClaimData,
          amount: (claimableRaw || '0').toString(),
          deadline,
          nonce,
        },
      }

      return NextResponse.json({
        typedData,
        claimerAddress,
        nonce,
        deadline,
        fee: {
          gasCostWei: gasCost.toString(),
          markupWei: markup.toString(),
          totalFeeWei: totalFee.toString(),
          totalFeeFormatted: `${parseFloat(ethers.formatEther(totalFee)).toFixed(6)} ETH`,
          markupPercent: 10,
        },
        message: 'Sign this EIP-712 message in your wallet to authorize gasless claim.',
      })
    }

    // ============ SUBMIT ============
    // Submit the signed meta-transaction via relay
    if (action === 'submit') {
      if (!signedTx) {
        return NextResponse.json({ error: 'signedTx required' }, { status: 400 })
      }

      const { typedData, signature } = signedTx

      if (!typedData || !signature) {
        return NextResponse.json({
          error: 'signedTx must contain typedData and signature',
        }, { status: 400 })
      }

      // Verify the signature
      const domain = typedData.domain
      const message = typedData.message
      const types = typedData.types

      // Remove EIP712Domain from types for verification
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

      // Verify recovered address matches the signer
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
          error: `Gasless claiming not available on chain ${chainId}`,
        }, { status: 400 })
      }

      // If we have a relay private key, submit via server wallet
      if (RELAY_PRIVATE_KEY) {
        const relayWallet = new ethers.Wallet(RELAY_PRIVATE_KEY, provider)

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

        // Get gas parameters
        const [balance, feeData, relayNonce] = await Promise.all([
          provider.getBalance(relayWallet.address),
          provider.getFeeData(),
          provider.getTransactionCount(relayWallet.address, 'latest'),
        ])

        const maxFeePerGas = feeData.maxFeePerGas || feeData.gasPrice || ethers.parseUnits('20', 'gwei')
        const gasNeeded = maxFeePerGas * 400000n

        if (balance < gasNeeded) {
          return NextResponse.json({
            error: `Relay wallet needs ${ethers.formatEther(gasNeeded)} ETH for gas. Has: ${ethers.formatEther(balance)}`,
          }, { status: 500 })
        }

        // Simulate first
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

        // Submit TX
        const tx = await relayWallet.sendTransaction({
          to: claimerAddress,
          data: execData,
          value: 0n,
          gasLimit: 400000n,
          maxFeePerGas,
          nonce: relayNonce,
          chainId: BigInt(chainId),
          type: 2,
        })

        const receipt = await tx.wait(1, 60000).catch(() => null)

        if (receipt && receipt.status === 1) {
          return NextResponse.json({
            success: true,
            txHash: tx.hash,
            blockNumber: receipt.blockNumber,
            relayProvider: 'self',
            message: 'Gasless claim executed via SweepGuard relay!',
          })
        }

        return NextResponse.json({
          error: `Transaction reverted. TX: ${tx.hash}`,
          txHash: tx.hash,
        })
      }

      // No relay key — return instruction to use external relay
      return NextResponse.json({
        error: 'Server relay not configured. Use Gelato or Biconomy relay instead.',
        fallbackRelay: 'gelato',
      })
    }

    // ============ ESTIMATE ============
    // Estimate relay fee for a gasless claim
    if (action === 'estimate') {
      const feeData = await provider.getFeeData()
      const gasPrice = feeData.maxFeePerGas || feeData.gasPrice || ethers.parseUnits('20', 'gwei')
      const gasCost = gasPrice * 250000n
      const markup = gasCost * 10n / 100n
      const totalFee = gasCost + markup

      return NextResponse.json({
        gasCostWei: gasCost.toString(),
        gasCostFormatted: `${parseFloat(ethers.formatEther(gasCost)).toFixed(6)} ETH`,
        markupWei: markup.toString(),
        markupFormatted: `${parseFloat(ethers.formatEther(markup)).toFixed(6)} ETH`,
        totalFeeWei: totalFee.toString(),
        totalFeeFormatted: `${parseFloat(ethers.formatEther(totalFee)).toFixed(6)} ETH`,
        markupPercent: 10,
        chainId,
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err: unknown) {
    console.error('Gasless API error:', err)
    return NextResponse.json({
      error: sanitizeErrorMessage(err),
    }, { status: 500 })
  }
}
