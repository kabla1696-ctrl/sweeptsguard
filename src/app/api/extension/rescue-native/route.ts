import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'

// ── RPC URLs ──────────────────────────────────────────────────────────
const RPC_URLS: Record<number, string> = {
  1: 'https://eth.drpc.org',
  8453: 'https://mainnet.base.org',
  42161: 'https://arb1.arbitrum.io/rpc',
  137: 'https://polygon-bor-rpc.publicnode.com',
  56: 'https://bsc-rpc.publicnode.com',
  10: 'https://mainnet.optimism.io',
  43114: 'https://api.avax.network/ext/bc/C/rpc',
  324: 'https://mainnet.era.zksync.io',
  59144: 'https://rpc.linea.build',
  81457: 'https://rpc.blast.io',
  7777777: 'https://rpc.zora.energy',
  5000: 'https://rpc.mantle.xyz',
  34443: 'https://mainnet.mode.network',
  534352: 'https://rpc.scroll.io',
  80094: 'https://rpc.berachain.com',
  1329: 'https://evm-rpc.sei-apis.com',
  57073: 'https://rpc-gel.inkonchain.com',
}

const GAS_TOKENS: Record<number, string> = {
  1: 'ETH', 8453: 'ETH', 42161: 'ETH', 137: 'MATIC', 56: 'BNB',
  10: 'ETH', 43114: 'AVAX', 324: 'ETH', 59144: 'ETH', 81457: 'ETH',
  7777777: 'ETH', 5000: 'MNT', 34443: 'ETH', 534352: 'ETH',
  80094: 'BERA', 1329: 'SEI', 57073: 'ETH',
}

// ── Rate limiting ─────────────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; windowStart: number }>()
const WINDOW_MS = 60_000
const MAX_REQ = 5

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now })
    return true
  }
  if (entry.count >= MAX_REQ) return false
  entry.count++
  return true
}

function isValidPrivateKey(key: string): boolean {
  try {
    new ethers.Wallet(key)
    return true
  } catch {
    return false
  }
}

// ── POST /api/extension/rescue-native ─────────────────────────────────
// Rescue native tokens (ETH, BNB, MATIC, etc.) from compromised wallet
// Strategy: Sponsor wallet sends gas to compromised wallet, then compromised
// wallet sends all native tokens to safe recipient in a rapid-fire sequence.
// On private sequencer chains (Base, Arbitrum, Optimism), this is safe from
// drainer bots because they can't see pending transactions.
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Rate limit exceeded. Try again in 1 minute.' }, { status: 429 })
    }

    const body = await request.json()
    const { privateKey, sponsorPrivateKey, safeRecipient, chainId } = body

    if (!privateKey || !sponsorPrivateKey || !safeRecipient || !chainId) {
      return NextResponse.json({
        error: 'Missing required fields: privateKey, sponsorPrivateKey, safeRecipient, chainId'
      }, { status: 400 })
    }

    if (!isValidPrivateKey(privateKey)) {
      return NextResponse.json({ error: 'Invalid compromised wallet private key' }, { status: 400 })
    }
    if (!isValidPrivateKey(sponsorPrivateKey)) {
      return NextResponse.json({ error: 'Invalid sponsor wallet private key' }, { status: 400 })
    }
    if (!ethers.isAddress(safeRecipient)) {
      return NextResponse.json({ error: 'Invalid safe recipient address' }, { status: 400 })
    }

    const rpcUrl = RPC_URLS[chainId]
    if (!rpcUrl) {
      return NextResponse.json({ error: `Chain ${chainId} not supported` }, { status: 400 })
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const compromisedWallet = new ethers.Wallet(privateKey, provider)
    const sponsorWallet = new ethers.Wallet(sponsorPrivateKey, provider)
    const gasToken = GAS_TOKENS[chainId] || 'ETH'

    // ── Check balances ────────────────────────────────────────────────
    const [compromisedBalance, sponsorBalance] = await Promise.all([
      provider.getBalance(compromisedWallet.address),
      provider.getBalance(sponsorWallet.address),
    ])

    if (compromisedBalance === 0n) {
      return NextResponse.json({
        error: `No ${gasToken} to rescue — balance is 0`,
      }, { status: 400 })
    }

    // Estimate gas for the rescue TX
    const gasEstimate = 21000n // simple transfer
    const feeData = await provider.getFeeData()
    const maxFeePerGas = feeData.maxFeePerGas || ethers.parseUnits('20', 'gwei')
    const gasCost = gasEstimate * maxFeePerGas

    // Sponsor needs to cover gas
    if (sponsorBalance < gasCost) {
      return NextResponse.json({
        error: `Sponsor wallet needs gas. Has ${ethers.formatEther(sponsorBalance)} ${gasToken}, need at least ${ethers.formatEther(gasCost)} ${gasToken}`,
      }, { status: 400 })
    }

    // ── Safety: Safe recipient should not be the compromised wallet ───
    if (safeRecipient.toLowerCase() === compromisedWallet.address.toLowerCase()) {
      return NextResponse.json({
        error: 'Safe recipient cannot be the compromised wallet itself',
      }, { status: 400 })
    }

    // ── Step 1: Sponsor sends gas to compromised wallet ───────────────
    // Send just enough gas to cover the transfer TX
    const gasToSend = gasCost + ethers.parseEther('0.0001') // small buffer
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || ethers.parseUnits('1', 'gwei')

    console.log(`[RescueNative] Step 1: Sponsor sending ${ethers.formatEther(gasToSend)} ${gasToken} for gas...`)

    const gasTx = await sponsorWallet.sendTransaction({
      to: compromisedWallet.address,
      value: gasToSend,
      gasLimit: 21000n,
      maxFeePerGas,
      maxPriorityFeePerGas,
      chainId: BigInt(chainId),
      type: 2,
    })

    const gasReceipt = await gasTx.wait(1, 60000).catch(() => null)
    if (!gasReceipt || gasReceipt.status !== 1) {
      return NextResponse.json({
        error: 'Failed to send gas to compromised wallet',
        txHash: gasTx.hash,
      }, { status: 500 })
    }

    console.log(`[RescueNative] Step 1 done: Gas TX ${gasTx.hash}`)

    // ── Step 2: Compromised wallet sends all native tokens to safe recipient ──
    // Get updated balance (original balance + gas received)
    const updatedBalance = await provider.getBalance(compromisedWallet.address)
    // Send everything minus gas cost
    const sendAmount = updatedBalance - gasCost

    if (sendAmount <= 0n) {
      return NextResponse.json({
        error: 'Insufficient balance after gas deduction',
        balance: ethers.formatEther(updatedBalance),
        gasCost: ethers.formatEther(gasCost),
      }, { status: 400 })
    }

    console.log(`[RescueNative] Step 2: Sending ${ethers.formatEther(sendAmount)} ${gasToken} to safe wallet...`)

    const transferTx = await compromisedWallet.sendTransaction({
      to: safeRecipient,
      value: sendAmount,
      gasLimit: 21000n,
      maxFeePerGas,
      maxPriorityFeePerGas,
      chainId: BigInt(chainId),
      type: 2,
    })

    const transferReceipt = await transferTx.wait(1, 60000).catch(() => null)

    if (transferReceipt && transferReceipt.status === 1) {
      return NextResponse.json({
        success: true,
        gasTxHash: gasTx.hash,
        txHash: transferTx.hash,
        blockNumber: transferReceipt.blockNumber,
        amount: ethers.formatEther(sendAmount),
        amountRaw: sendAmount.toString(),
        gasToken,
        from: compromisedWallet.address,
        to: safeRecipient,
        chainId,
        explorerUrl: `https://basescan.org/tx/${transferTx.hash}`,
      })
    }

    return NextResponse.json({
      error: 'Transfer transaction failed',
      txHash: transferTx.hash,
      gasTxHash: gasTx.hash,
    }, { status: 500 })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[RescueNative] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
