import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { submitRecoveryBundle } from '@/lib/fundRecovery'

const PLATFORM_FEE_WALLET = '0x7A3725154a2E6468F9549334394802e9E2822C2A'
const PLATFORM_FEE_PERCENT = 20

// SECURITY: Never log private keys
function sanitizeBody(body: Record<string, unknown>) {
  const sanitized = { ...body }
  if (sanitized.privateKey) sanitized.privateKey = '[REDACTED]'
  if (sanitized.sponsorPrivateKey) sanitized.sponsorPrivateKey = '[REDACTED]'
  return sanitized
}

// Only Ethereum mainnet supported (Flashbots required)
const RPC_URLS: Record<number, string> = {
  1: 'https://eth.drpc.org',
}

const GAS_TOKENS: Record<number, string> = {
  1: 'ETH',
}

// ============================================================
// Detect airdrop info: token, eligibility, claimable amount
// ============================================================
async function detectAirdropInfo(
  provider: ethers.JsonRpcProvider,
  contractAddress: string,
  walletAddress: string,
  claimData?: string,
  merkleProof?: string,
  tokenAmount?: string
) {
  let tokenAddress = ''
  let tokenSymbol = 'TOKEN'
  let tokenDecimals = 18
  let claimableRaw = '0'
  let eligible: boolean | null = null // null = unable to verify
  let alreadyClaimed = false
  let needsMerkleProof = false
  let needsClaimData = false
  let claimDataUsed = ''

  const iface = new ethers.Interface([
    'function token() view returns (address)',
    'function rewardToken() view returns (address)',
    'function claimed(address) view returns (bool)',
    'function isClaimed(bytes32) view returns (bool)',
    'function claimable(address) view returns (uint256)',
    'function pending(address) view returns (uint256)',
    'function available(address) view returns (uint256)',
    'function rewards(address) view returns (uint256)',
    'function getReward(address) view returns (uint256)',
    'function merkleRoot() view returns (bytes32)',
    'function balanceOf(address) view returns (uint256)',
  ])

  // --- Step 1: Get token address ---
  for (const fn of ['token', 'rewardToken']) {
    try {
      const data = iface.encodeFunctionData(fn)
      const result = await provider.call({ to: contractAddress, data })
      const decoded = iface.decodeFunctionResult(fn, result)
      const addr = decoded[0] as string
      if (addr && addr !== ethers.ZeroAddress) {
        tokenAddress = addr
        break
      }
    } catch {}
  }

  // If no token found, check if contract itself is a token
  if (!tokenAddress || tokenAddress === ethers.ZeroAddress) {
    try {
      const tokenIface = new ethers.Interface([
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)',
      ])
      const symData = tokenIface.encodeFunctionData('symbol')
      const symResult = await provider.call({ to: contractAddress, data: symData })
      tokenSymbol = tokenIface.decodeFunctionResult('symbol', symResult)[0] as string
      tokenAddress = contractAddress
      try {
        const decData = tokenIface.encodeFunctionData('decimals')
        const decResult = await provider.call({ to: contractAddress, data: decData })
        tokenDecimals = Number(tokenIface.decodeFunctionResult('decimals', decResult)[0])
      } catch {}
    } catch {}
  }

  // Get token info if we have a separate token address
  if (tokenAddress && tokenAddress !== ethers.ZeroAddress && tokenAddress !== contractAddress) {
    try {
      const tokenIface = new ethers.Interface([
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)',
      ])
      const [symResult, decResult] = await Promise.all([
        provider.call({ to: tokenAddress, data: tokenIface.encodeFunctionData('symbol') }).catch(() => '0x'),
        provider.call({ to: tokenAddress, data: tokenIface.encodeFunctionData('decimals') }).catch(() => '0x'),
      ])
      try { tokenSymbol = tokenIface.decodeFunctionResult('symbol', symResult)[0] as string } catch {}
      try { tokenDecimals = Number(tokenIface.decodeFunctionResult('decimals', decResult)[0]) } catch {}
    } catch {}
  }

  // --- Step 2: Check eligibility (claimed status) ---
  // Try claimed(address) first
  try {
    const data = iface.encodeFunctionData('claimed', [walletAddress])
    const result = await provider.call({ to: contractAddress, data })
    const claimed = iface.decodeFunctionResult('claimed', result)[0]
    // Some contracts return bool, some return uint256
    if (typeof claimed === 'boolean') {
      alreadyClaimed = claimed
      eligible = !claimed
    } else {
      // uint256: 0 = not claimed, >0 = claimed amount/timestamp
      alreadyClaimed = BigInt(claimed as string | number | bigint) > 0n
      eligible = !alreadyClaimed
    }
  } catch {}

  // Try isClaimed(bytes32) if claimed() didn't work
  if (eligible === null) {
    try {
      // isClaimed usually takes a leaf hash; we'll check with zero hash as a heuristic
      const data = iface.encodeFunctionData('isClaimed', [ethers.ZeroHash])
      const result = await provider.call({ to: contractAddress, data })
      // If it doesn't revert, function exists — but we need the actual leaf to check
      // Mark as needing proof
      needsMerkleProof = true
    } catch {}
  }

  // --- Step 3: Get claimable amount ---
  if (!tokenAmount) {
    for (const fn of ['claimable', 'pending', 'available', 'rewards', 'getReward']) {
      try {
        const data = iface.encodeFunctionData(fn as 'claimable' | 'pending' | 'available' | 'rewards' | 'getReward', [walletAddress])
        const result = await provider.call({ to: contractAddress, data })
        const amount = iface.decodeFunctionResult(fn as 'claimable' | 'pending' | 'available' | 'rewards' | 'getReward', result)[0]
        const bigAmount = BigInt(amount as string | number | bigint)
        if (bigAmount > 0n) {
          claimableRaw = bigAmount.toString()
          break
        }
      } catch {}
    }
  } else {
    // User provided amount — parse it
    try {
      // If it looks like a raw wei amount (very large number), use directly
      if (tokenAmount.length > 10) {
        claimableRaw = tokenAmount
      } else {
        // Treat as human-readable, convert to raw
        claimableRaw = ethers.parseUnits(tokenAmount, tokenDecimals).toString()
      }
    } catch {
      claimableRaw = '0'
    }
  }

  // --- Step 4: Detect claim function ---
  // If user provided claimData, use it directly
  if (claimData && claimData !== '0x' && claimData.length > 10) {
    claimDataUsed = 'user-provided'
  } else {
    // Auto-detect by checking contract bytecode for known selectors
    const code = await provider.getCode(contractAddress)

    // Common claim function selectors
    const selectors: Record<string, { sig: string; needsAddress: boolean; needsProof: boolean }> = {
      '4e71d92d': { sig: 'claim()', needsAddress: false, needsProof: false },
      '27c8f835': { sig: 'claim()', needsAddress: false, needsProof: false },  // claim() alternative
      '48c54b9d': { sig: 'claim(address)', needsAddress: true, needsProof: false },
      'ba087652': { sig: 'claim(address,uint256,bytes32[])', needsAddress: true, needsProof: true },
      '379607f6': { sig: 'claim(address,uint256,bytes32[],uint256)', needsAddress: true, needsProof: true },
      '6a06f395': { sig: 'claimTo(address)', needsAddress: true, needsProof: false },
    }

    let detected = false
    for (const [selector, info] of Object.entries(selectors)) {
      if (code.toLowerCase().includes(selector.toLowerCase())) {
        needsMerkleProof = info.needsProof
        claimDataUsed = info.sig
        detected = true
        break
      }
    }

    if (!detected) {
      // Try encoding common claim functions and see which one doesn't revert
      const claimIface = new ethers.Interface([
        'function claim()',
        'function claim(address)',
        'function claim(address,uint256,bytes32[])',
        'function claimTo(address)',
      ])

      // Try claim() — simplest
      try {
        const data = claimIface.encodeFunctionData('claim')
        // Just encode, don't call (would fail without gas)
        claimDataUsed = 'claim() (assumed)'
      } catch {}

      // If we have a merkle root in the contract, it's likely a Merkle airdrop
      try {
        const mrData = iface.encodeFunctionData('merkleRoot')
        await provider.call({ to: contractAddress, data: mrData })
        needsMerkleProof = true
        claimDataUsed = 'claim(address,uint256,bytes32[]) (Merkle detected)'
      } catch {}

      if (!claimDataUsed) {
        needsClaimData = true
        claimDataUsed = 'unknown — paste claim data from project page'
      }
    }
  }

  return {
    tokenAddress: tokenAddress || contractAddress,
    tokenSymbol,
    tokenDecimals,
    claimableRaw,
    eligible,
    alreadyClaimed,
    needsMerkleProof,
    needsClaimData,
    claimDataUsed,
  }
}

// ============================================================
// Build claim transaction data
// ============================================================
function buildClaimTxData(
  walletAddress: string,
  claimableRaw: string,
  claimData?: string,
  merkleProof?: string
): string {
  // If user provided raw claim data, use it directly
  if (claimData && claimData !== '0x' && claimData.length > 10) {
    return claimData
  }

  // Parse merkle proof if provided
  let proofArray: string[] = []
  if (merkleProof) {
    try {
      const parsed = JSON.parse(merkleProof)
      if (Array.isArray(parsed)) {
        proofArray = parsed.map((p: string) => p.startsWith('0x') ? p : '0x' + p)
      }
    } catch {}
  }

  const claimIface = new ethers.Interface([
    'function claim()',
    'function claim(address to)',
    'function claim(address to, uint256 amount, bytes32[] proof)',
    'function claim(address to, uint256 amount, bytes32[] proof, uint256 deadline)',
    'function claimTo(address to)',
    'function claimReward()',
    'function getReward()',
    'function collectReward()',
  ])

  // If we have a proof, use Merkle claim
  if (proofArray.length > 0) {
    try {
      return claimIface.encodeFunctionData('claim', [
        walletAddress,
        BigInt(claimableRaw),
        proofArray,
      ])
    } catch {
      // Try with deadline
      try {
        return claimIface.encodeFunctionData('claim', [
          walletAddress,
          BigInt(claimableRaw),
          proofArray,
          Math.floor(Date.now() / 1000) + 3600, // 1 hour deadline
        ])
      } catch {}
    }
  }

  // Try simple claim(address) — some airdrops use this
  try {
    return claimIface.encodeFunctionData('claim', [walletAddress])
  } catch {}

  // Fallback: simple claim()
  try {
    return claimIface.encodeFunctionData('claim')
  } catch {}

  // Last resort
  return claimIface.encodeFunctionData('claim')
}

// ============================================================
// POST handler
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // SECURITY: Log sanitized body only
    console.log('Request:', sanitizeBody(body))

    const {
      action,
      contractAddress,
      chainId,
      safeWallet,
      walletAddress,
      privateKey,
      sponsorPrivateKey,
      claimableRaw,
      tokenAddress,
      claimData,
      merkleProof,
      tokenAmount,
    } = body

    // Only allow Ethereum mainnet
    if (chainId && chainId !== 1) {
      return NextResponse.json({
        error: 'Only Ethereum mainnet (chainId 1) is supported. L2 chains temporarily disabled — Flashbots protection only available on Ethereum mainnet.'
      }, { status: 400 })
    }

    if (!contractAddress || !chainId) {
      return NextResponse.json({ error: 'Contract address and chain required' }, { status: 400 })
    }

    const rpcUrl = RPC_URLS[chainId] || RPC_URLS[1]
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const gasToken = GAS_TOKENS[chainId] || 'ETH'

    // ============ PREVIEW ============
    if (action === 'preview') {
      if (!safeWallet || !sponsorPrivateKey || !walletAddress) {
        return NextResponse.json({ error: 'Safe wallet, wallet address, and sponsor key required' }, { status: 400 })
      }

      // Detect token + eligibility + amount
      const info = await detectAirdropInfo(
        provider,
        contractAddress,
        walletAddress,
        claimData,
        merkleProof,
        tokenAmount
      )

      // Get sponsor balance
      const sponsorWallet = new ethers.Wallet(sponsorPrivateKey)
      const sponsorBalance = await provider.getBalance(sponsorWallet.address)
      const feeData = await provider.getFeeData()

      // Use EIP-1559 fees
      const gasPrice = feeData.maxFeePerGas || feeData.gasPrice || ethers.parseUnits('20', 'gwei')
      const estimatedGas = gasPrice * 250000n // ~250k gas for fund + claim bundle
      const sponsorHasGas = sponsorBalance >= estimatedGas

      // Calculate split
      const claimAmount = BigInt(info.claimableRaw)
      const safeAmount = (claimAmount * BigInt(100 - PLATFORM_FEE_PERCENT)) / 100n
      const feeAmount = (claimAmount * BigInt(PLATFORM_FEE_PERCENT)) / 100n

      const formatAmount = (raw: bigint) => {
        if (raw === 0n) return '0'
        return parseFloat(ethers.formatUnits(raw, info.tokenDecimals)).toFixed(4)
      }

      return NextResponse.json({
        eligible: info.eligible,
        alreadyClaimed: info.alreadyClaimed,
        tokenAddress: info.tokenAddress,
        tokenSymbol: info.tokenSymbol,
        tokenDecimals: info.tokenDecimals,
        claimableAmount: formatAmount(claimAmount),
        claimableRaw: info.claimableRaw,
        safeWalletAmount: formatAmount(safeAmount),
        platformFeeAmount: formatAmount(feeAmount),
        sponsorBalance: parseFloat(ethers.formatEther(sponsorBalance)).toFixed(6),
        sponsorGasToken: gasToken,
        sponsorHasGas,
        estimatedGasCost: parseFloat(ethers.formatEther(estimatedGas)).toFixed(6),
        claimDataUsed: info.claimDataUsed,
        needsMerkleProof: info.needsMerkleProof,
        needsClaimData: info.needsClaimData,
      })
    }

    // ============ CLAIM ============
    if (action === 'claim') {
      if (!privateKey || !sponsorPrivateKey || !safeWallet || !walletAddress) {
        return NextResponse.json({ error: 'All fields required' }, { status: 400 })
      }

      const compromisedWallet = new ethers.Wallet(privateKey)
      const sponsorWallet = new ethers.Wallet(sponsorPrivateKey, provider)

      // Verify the private key matches the wallet address
      if (compromisedWallet.address.toLowerCase() !== walletAddress.toLowerCase()) {
        return NextResponse.json({
          error: `Private key doesn't match wallet address. Key: ${compromisedWallet.address}, Expected: ${walletAddress}`
        }, { status: 400 })
      }

      // Get current state — nonces RIGHT BEFORE signing (Bug #7)
      const [sponsorBalance, feeData, sponsorNonce, compromisedNonce] = await Promise.all([
        provider.getBalance(sponsorWallet.address),
        provider.getFeeData(),
        provider.getTransactionCount(sponsorWallet.address, 'latest'),
        provider.getTransactionCount(compromisedWallet.address, 'latest'),
      ])

      // EIP-1559 fees (Bug #9)
      const maxFeePerGas = feeData.maxFeePerGas || feeData.gasPrice || ethers.parseUnits('20', 'gwei')
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || ethers.parseUnits('2', 'gwei')

      const gasNeeded = maxFeePerGas * 250000n

      if (sponsorBalance < gasNeeded) {
        return NextResponse.json({
          error: `Sponsor wallet needs ${ethers.formatEther(gasNeeded)} ${gasToken} for gas. Has: ${ethers.formatEther(sponsorBalance)} ${gasToken}`
        })
      }

      // Build claim data
      const claimTxData = buildClaimTxData(
        walletAddress,
        claimableRaw || '0',
        claimData,
        merkleProof
      )

      // TX 1: Sponsor sends gas to compromised wallet
      const fundTx = await sponsorWallet.signTransaction({
        to: compromisedWallet.address,
        value: gasNeeded,
        gasLimit: 21000n,
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce: sponsorNonce,
        chainId: BigInt(chainId),
        type: 2, // EIP-1559
      })

      // TX 2: Compromised wallet claims airdrop
      const claimTx = await compromisedWallet.signTransaction({
        to: contractAddress,
        value: 0n,
        data: claimTxData,
        gasLimit: 200000n,
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce: compromisedNonce,
        chainId: BigInt(chainId),
        type: 2, // EIP-1559
      })

      // Submit as Flashbots atomic bundle (Bug #1)
      // Both TXs execute in the SAME block — drainer can't intercept
      console.log('🚀 Submitting Flashbots atomic bundle...')
      const bundleResult = await submitRecoveryBundle(
        [fundTx, claimTx],
        chainId,
        rpcUrl
      )

      if (bundleResult.success) {
        return NextResponse.json({
          success: true,
          bundleHash: bundleResult.bundleHash,
          blockNumber: bundleResult.blockNumber,
          message: 'Claim executed via Flashbots atomic bundle — both TXs in same block'
        })
      }

      // If Flashbots fails, return error (don't fall back to sequential — that's the bug)
      return NextResponse.json({
        error: `Flashbots submission failed: ${bundleResult.error}. Claim NOT executed to prevent drainer from stealing gas. Try again or use a different RPC.`
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Internal error'
    console.error('Airdrop claim error:', errMsg)
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}
