import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { submitRecoveryBundle } from '@/lib/fundRecovery'

const PLATFORM_FEE_WALLET = '0x7A3725154a2E6468F9549334394802e9E2822C2A'
const PLATFORM_FEE_PERCENT = 20

// SweepGuardClaimer contract addresses (deploy per chain via scripts/deploy-claimer.js)
// These contracts verify EIP-712 signatures and execute claims atomically
const CLAIMER_CONTRACTS: Record<number, string> = {
  // TODO: Deploy SweepGuardClaimer.sol on each chain and add address here
  // Use CREATE2 with salt 'sweeptsguard-claimer-v1' for deterministic addresses
  // 1: '0x...', // Ethereum
  // 8453: '0x...', // Base
  // 42161: '0x...', // Arbitrum
  // 56: '0x...', // BNB Chain
  // 137: '0x...', // Polygon
  // 10: '0x...', // Optimism
  // 43114: '0x...', // Avalanche
  // 250: '0x...', // Fantom
  // 25: '0x...', // Cronos
  // 81457: '0x...', // Blast
  // 7777777: '0x...', // Zora
  // 1101: '0x...', // Polygon zkEVM
  // 169: '0x...', // Manta Pacific
  // 324: '0x...', // zkSync Era
  // 59144: '0x...', // Linea
  // 5000: '0x...', // Mantle
  // 34443: '0x...', // Mode
  // 534352: '0x...', // Scroll
  // 100: '0x...', // Gnosis
  // 7000: '0x...', // ZetaChain
  // 1625: '0x...', // Gravity
  // 1116: '0x...', // Core
  // 1329: '0x...', // Sei
  // 80094: '0x...', // Berachain
  // 57073: '0x...', // Ink
  // 196: '0x...', // XLayer
  // 43111: '0x...', // Hemi
  // 8217: '0x...', // Kaia
  // 1868: '0x...', // Soneium
  // 2818: '0x...', // Morph
  // 1923: '0x...', // Swellchain
  // 10143: '0x...', // Monad Testnet
  // 16600: '0x...', // 0G
}

// SECURITY: Never log private keys
function sanitizeBody(body: Record<string, unknown>) {
  const sanitized = { ...body }
  if (sanitized.privateKey) sanitized.privateKey = '[REDACTED]'
  if (sanitized.sponsorPrivateKey) sanitized.sponsorPrivateKey = '[REDACTED]'
  return sanitized
}

// ============================================================
// Chain configuration — L2s with private sequencers are SAFE
// because drainer bots CANNOT see pending transactions.
// Only Ethereum/Polygon/BSC need special MEV protection.
// ============================================================

// Chains with PRIVATE sequencers (no public mempool — drainer can't frontrun)
const PRIVATE_SEQUENCER_CHAINS = new Set([
  8453,   // Base (Coinbase sequencer)
  42161,  // Arbitrum (Offchain Labs sequencer)
  10,     // Optimism (OP Labs sequencer)
  324,    // zkSync (Matter Labs sequencer)
  59144,  // Linea (ConsenSys sequencer)
  534352, // Scroll (Scroll sequencer)
  5000,   // Mantle (Mantle sequencer)
  34443,  // Mode (Mode sequencer)
  81457,  // Blast (Blast sequencer)
  7777777,// Zora (OP Stack sequencer)
  57073,  // Ink (OP Stack sequencer)
  1868,   // Soneium (Sony sequencer)
  1923,   // Swellchain (Swell sequencer)
  2818,   // Morph (Morph sequencer)
  43111,  // Hemi (Hemi sequencer)
  80094,  // Berachain (Berachain sequencer)
  1329,   // Sei (Sei sequencer)
])

// All supported RPC URLs
const RPC_URLS: Record<number, string> = {
  1: 'https://eth.drpc.org',
  8453: 'https://mainnet.base.org',
  42161: 'https://arb1.arbitrum.io/rpc',
  137: 'https://polygon-bor-rpc.publicnode.com',
  56: 'https://bsc-rpc.publicnode.com',
  10: 'https://mainnet.optimism.io',
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
  100: 'https://rpc.gnosis.gateway.fm',
  7000: 'https://zetachain-evm.blockpi.network/v1/rpc/public',
  1625: 'https://rpc.gravity.xyz',
  1116: 'https://rpc.coredao.org',
  1329: 'https://evm-rpc.sei-apis.com',
  80094: 'https://bera-testnet.nodefleet.org',
  57073: 'https://rpc-gel.inkonchain.com',
  196: 'https://rpc.xlayer.tech',
  43111: 'https://rpc.hemi.network/rpc',
  8217: 'https://public-en.node.kaia.io',
  1868: 'https://rpc.soneium.org',
  2818: 'https://rpc-quicknode.morphl2.io',
  1923: 'https://rpc.swellnetwork.io',
  10143: 'https://rpc.monad.xyz',
  16600: 'https://evmrpc.0g.ai',
}

const GAS_TOKENS: Record<number, string> = {
  1: 'ETH', 8453: 'ETH', 42161: 'ETH', 137: 'MATIC', 56: 'BNB',
  10: 'ETH', 43114: 'AVAX', 250: 'FTM', 25: 'CRO', 81457: 'ETH',
  7777777: 'ETH', 1101: 'ETH', 169: 'ETH', 324: 'ETH', 59144: 'ETH',
  5000: 'MNT', 34443: 'ETH', 534352: 'ETH', 100: 'xDai', 7000: 'ZETA',
  1625: 'G', 1116: 'CORE', 1329: 'SEI', 80094: 'BERA', 57073: 'ETH',
  196: 'OKB', 43111: 'ETH', 8217: 'KAIA', 1868: 'ETH', 2818: 'ETH',
  1923: 'ETH', 10143: 'MON', 16600: '0G',
}

// ============================================================
// Private/protected RPC endpoints for public mempool chains
// These help reduce (but not eliminate) MEV/frontrunning risk.
// ============================================================
const PROTECTED_RPCS: Record<number, { url: string; name: string }> = {
  // BSC: bloXroute Protect RPC — routes TXs through private relay
  56: { url: 'https://bsc.rpc.blxrbdn.com', name: 'bloXroute Protect (BSC)' },
  // Polygon: Private mempool RPC — hides TXs from public mempool
  137: { url: 'https://rpc-mainnet.polygon.private', name: 'Polygon Private Mempool' },
}

// Get execution strategy for a chain
function getExecutionStrategy(chainId: number): {
  method: 'flashbots' | 'rapid-fire'
  description: string
  safe: boolean
  riskLevel: 'none' | 'low' | 'high'
  protectedRpc?: string
} {
  if (chainId === 1) {
    return { method: 'flashbots', description: 'Flashbots atomic bundle (same block)', safe: true, riskLevel: 'none' }
  }
  if (PRIVATE_SEQUENCER_CHAINS.has(chainId)) {
    return { method: 'rapid-fire', description: 'Rapid-fire sequential TXs (private sequencer, no public mempool)', safe: true, riskLevel: 'low' }
  }
  // Public mempool chains with known private relays
  if (PROTECTED_RPCS[chainId]) {
    return {
      method: 'rapid-fire',
      description: `Rapid-fire via ${PROTECTED_RPCS[chainId].name} (reduced frontrun risk)`,
      safe: false,
      riskLevel: 'high',
      protectedRpc: PROTECTED_RPCS[chainId].url,
    }
  }
  // Public mempool chains with no known private relay — HONEST high-risk warning
  return {
    method: 'rapid-fire',
    description: 'Rapid-fire sequential TXs (PUBLIC mempool — drainer bots may see pending TXs)',
    safe: false,
    riskLevel: 'high',
  }
}

// ============================================================
// Detect pending transactions (nonce conflict detection)
// If the compromised wallet has pending TXs from the drainer,
// our nonce could be wrong. We use the higher nonce.
// ============================================================
async function detectPendingNonce(
  provider: ethers.JsonRpcProvider,
  address: string
): Promise<number | null> {
  try {
    // Compare pending vs latest nonce — if different, there are pending TXs
    const pendingCount = await provider.getTransactionCount(address, 'pending')
    const latestCount = await provider.getTransactionCount(address, 'latest')
    if (pendingCount > latestCount) {
      console.log(`⚠️ Nonce conflict: ${address} has ${pendingCount - latestCount} pending TX(s). Using pending nonce ${pendingCount}`)
      return pendingCount
    }
    return null
  } catch {
    return null
  }
}

// ============================================================
// SCAM / HONEYPOT CONTRACT DETECTION
// Verifies contract exists and has reasonable claim functionality.
// ============================================================
async function validateContractSafety(
  provider: ethers.JsonRpcProvider,
  contractAddress: string
): Promise<{ safe: boolean; warnings: string[] }> {
  const warnings: string[] = []

  // Check 1: Contract must have deployed code
  const code = await provider.getCode(contractAddress)
  if (!code || code === '0x' || code.length < 4) {
    return { safe: false, warnings: ['❌ No contract code at this address — it may be an EOA or destroyed contract'] }
  }

  // Check 2: Very short bytecode is suspicious (minimal proxy or self-destructed)
  if (code.length < 100) {
    warnings.push('⚠️ Very short contract bytecode — could be a minimal proxy or suspicious contract')
  }

  // Check 3: Look for known claim function selectors
  const knownClaimSelectors = [
    '4e71d92d', // claim()
    '27c8f835', // claim()
    '48c54b9d', // claim(address)
    'ba087652', // claim(address,uint256,bytes32[])
    '379607f6', // claim(address,uint256,bytes32[],uint256)
    '6a06f395', // claimTo(address)
    '1249c58b', // mint()
    'a694fc3a', // mint(uint256)
  ]
  const codeLower = code.toLowerCase()
  const hasClaimSelector = knownClaimSelectors.some(sel => codeLower.includes(sel))
  if (!hasClaimSelector) {
    warnings.push('⚠️ No known claim function selector found in bytecode — this may not be an airdrop contract')
  }

  // Check 4: Look for actual honeypot indicators (not generic patterns)
  // NOTE: selfdestruct opcode (0xff) appears in many legitimate contracts
  // and is NOT an indicator of a honeypot. We check for actual scam patterns instead.
  const scamIndicators = [
    'approve(address,uint256)', // suspicious if claim contract asks for token approval
    'transferOwnership', // ownership transfer could indicate rug pull capability
    'pause', // pausable contract could block claims
  ]
  // Only warn if the contract has MULTIPLE suspicious indicators
  let scamScore = 0
  for (const indicator of scamIndicators) {
    const selector = ethers.id(indicator).slice(0, 10)
    if (codeLower.includes(selector.slice(2).toLowerCase())) {
      scamScore++
    }
  }
  if (scamScore >= 2) {
    warnings.push('⚠️ Contract has multiple suspicious function selectors (approve/pause/transferOwnership) — verify this is the legitimate airdrop contract')
  }

  return { safe: warnings.length === 0, warnings }
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
  let eligible: boolean | null = null
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
      const data = iface.encodeFunctionData(fn as 'token' | 'rewardToken')
      const result = await provider.call({ to: contractAddress, data })
      const decoded = iface.decodeFunctionResult(fn as 'token' | 'rewardToken', result)
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
  try {
    const data = iface.encodeFunctionData('claimed', [walletAddress])
    const result = await provider.call({ to: contractAddress, data })
    const claimed = iface.decodeFunctionResult('claimed', result)[0]
    if (typeof claimed === 'boolean') {
      alreadyClaimed = claimed
      eligible = !claimed
    } else {
      alreadyClaimed = BigInt(claimed as string | number | bigint) > 0n
      eligible = !alreadyClaimed
    }
  } catch {}

  if (eligible === null) {
    try {
      const data = iface.encodeFunctionData('isClaimed', [ethers.ZeroHash])
      await provider.call({ to: contractAddress, data })
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
    try {
      if (tokenAmount.length > 10) {
        claimableRaw = tokenAmount
      } else {
        claimableRaw = ethers.parseUnits(tokenAmount, tokenDecimals).toString()
      }
    } catch {
      claimableRaw = '0'
    }
  }

  // --- Step 4: Detect claim function ---
  if (claimData && claimData !== '0x' && claimData.length > 10) {
    claimDataUsed = 'user-provided'
  } else {
    const code = await provider.getCode(contractAddress)

    const selectors: Record<string, { sig: string; needsAddress: boolean; needsProof: boolean }> = {
      '4e71d92d': { sig: 'claim()', needsAddress: false, needsProof: false },
      '27c8f835': { sig: 'claim()', needsAddress: false, needsProof: false },
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
  if (claimData && claimData !== '0x' && claimData.length > 10) {
    return claimData
  }

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

  if (proofArray.length > 0) {
    try {
      return claimIface.encodeFunctionData('claim', [
        walletAddress,
        BigInt(claimableRaw),
        proofArray,
      ])
    } catch {
      try {
        return claimIface.encodeFunctionData('claim', [
          walletAddress,
          BigInt(claimableRaw),
          proofArray,
          Math.floor(Date.now() / 1000) + 3600,
        ])
      } catch {}
    }
  }

  try {
    return claimIface.encodeFunctionData('claim', [walletAddress])
  } catch {}

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
      sponsorAddress,
      signature,
      claimableRaw,
      tokenAddress,
      claimData,
      merkleProof,
      tokenAmount,
    } = body

    if (!contractAddress || !chainId) {
      return NextResponse.json({ error: 'Contract address and chain required' }, { status: 400 })
    }

    // Validate chain is supported
    if (!RPC_URLS[chainId]) {
      return NextResponse.json({
        error: `Chain ${chainId} not supported. Supported chains: ${Object.keys(RPC_URLS).join(', ')}`
      }, { status: 400 })
    }

    const rpcUrl = RPC_URLS[chainId]
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const gasToken = GAS_TOKENS[chainId] || 'ETH'

    // ============ PREVIEW ============
    if (action === 'preview') {
      if (!safeWallet || !walletAddress) {
        return NextResponse.json({ error: 'Safe wallet and wallet address required' }, { status: 400 })
      }

      // Use sponsorAddress for balance check (no private key needed for preview)
      const sponsorAddr = sponsorAddress || (sponsorPrivateKey ? new ethers.Wallet(sponsorPrivateKey).address : null)

      // P0-2: SCAM/HONEYPOT CONTRACT CHECK
      // Verify contract exists and has reasonable claim functionality before
      // spending any gas or exposing user to risk.
      const contractValidation = await validateContractSafety(provider, contractAddress)
      if (!contractValidation.safe && contractValidation.warnings.some(w => w.includes('No contract code'))) {
        return NextResponse.json({
          error: 'Contract validation failed',
          contractWarnings: contractValidation.warnings,
        }, { status: 400 })
      }

      const info = await detectAirdropInfo(
        provider,
        contractAddress,
        walletAddress,
        claimData,
        merkleProof,
        tokenAmount
      )

      let sponsorBalance = 0n
      let sponsorWalletAddr = sponsorAddr
      if (sponsorPrivateKey) {
        const sw = new ethers.Wallet(sponsorPrivateKey)
        sponsorWalletAddr = sw.address
        sponsorBalance = await provider.getBalance(sw.address)
      } else if (sponsorAddr) {
        sponsorBalance = await provider.getBalance(sponsorAddr)
      }
      const feeData = await provider.getFeeData()

      const gasPrice = feeData.maxFeePerGas || feeData.gasPrice || ethers.parseUnits('20', 'gwei')
      const estimatedGas = gasPrice * 250000n
      // For public mempool chains, estimate higher gas (two TXs needed)
      const strategy = getExecutionStrategy(chainId)
      const totalEstimatedGas = strategy.riskLevel === 'high'
        ? estimatedGas * 2n // Fund TX + Claim TX both need gas on public mempool chains
        : estimatedGas
      const sponsorHasGas = sponsorBalance >= totalEstimatedGas

      const claimAmount = BigInt(info.claimableRaw)
      const safeAmount = (claimAmount * BigInt(100 - PLATFORM_FEE_PERCENT)) / 100n
      const feeAmount = (claimAmount * BigInt(PLATFORM_FEE_PERCENT)) / 100n

      const formatAmount = (raw: bigint) => {
        if (raw === 0n) return '0'
        return parseFloat(ethers.formatUnits(raw, info.tokenDecimals)).toFixed(4)
      }

      // P1-1: Build eligibility warning message
      let eligibilityWarning: string | undefined
      if (info.eligible === null) {
        eligibilityWarning = '⚠️ Unable to verify eligibility — claim may fail if already claimed. Proceed with caution.'
      }

      // P1-2: Build Merkle proof helper message
      let merkleProofHelp: string | undefined
      if (info.needsMerkleProof) {
        merkleProofHelp = '📝 You need a Merkle proof from the project. Check: 1) Project\'s claim page, 2) GitHub repo, 3) Discord/announcement channel. Paste the proof array in the optional field.'
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
        estimatedGasCost: parseFloat(ethers.formatEther(totalEstimatedGas)).toFixed(6),
        claimDataUsed: info.claimDataUsed,
        needsMerkleProof: info.needsMerkleProof,
        needsClaimData: info.needsClaimData,
        executionMethod: strategy.method,
        executionDescription: strategy.description,
        executionSafe: strategy.safe,
        riskLevel: strategy.riskLevel,
        // P0-2: Contract validation warnings (honeypot, scam, suspicious)
        contractWarnings: contractValidation.warnings,
        contractSafe: contractValidation.safe,
        // P1-1: Eligibility verification warning
        eligibilityWarning,
        // P1-2: Merkle proof helper
        merkleProofHelp,
      })
    }

    // ============ CLAIM ============
    if (action === 'claim') {
      if (!privateKey || !sponsorPrivateKey || !safeWallet || !walletAddress) {
        return NextResponse.json({ error: 'All fields required' }, { status: 400 })
      }

      const compromisedWallet = new ethers.Wallet(privateKey)
      const sponsorWallet = new ethers.Wallet(sponsorPrivateKey, provider)

      if (compromisedWallet.address.toLowerCase() !== walletAddress.toLowerCase()) {
        return NextResponse.json({
          error: `Private key doesn't match wallet address. Key: ${compromisedWallet.address}, Expected: ${walletAddress}`
        }, { status: 400 })
      }

      // CRITICAL: Safe wallet CANNOT be the compromised wallet
      try {
        const normalizedSafe = ethers.getAddress(safeWallet)
        const normalizedCompromised = ethers.getAddress(compromisedWallet.address)
        if (normalizedSafe === normalizedCompromised) {
          return NextResponse.json({
            error: 'Safe wallet CANNOT be the compromised wallet — tokens would go back to the drainer!'
          }, { status: 400 })
        }
      } catch {
        return NextResponse.json({ error: 'Invalid safe wallet address' }, { status: 400 })
      }

      // P1-3: NONCE CONFLICT DETECTION
      // If the compromised wallet has pending TXs from the drainer in the
      // mempool, our nonce could be wrong. We detect pending TXs and use
      // the higher nonce to avoid conflicts.
      const [sponsorBalance, feeData, sponsorNonce, compromisedLatestNonce] = await Promise.all([
        provider.getBalance(sponsorWallet.address),
        provider.getFeeData(),
        provider.getTransactionCount(sponsorWallet.address, 'latest'),
        provider.getTransactionCount(compromisedWallet.address, 'latest'),
      ])
      // Check for pending TXs that would conflict with our nonce
      const pendingNonce = await detectPendingNonce(provider, compromisedWallet.address)
      const compromisedNonce = pendingNonce !== null ? pendingNonce : compromisedLatestNonce
      if (pendingNonce !== null) {
        console.log(`⚠️ Using pending nonce ${compromisedNonce} instead of latest ${compromisedLatestNonce}`)
      }

      // EIP-1559 fees (Bug #9 fix)
      const maxFeePerGas = feeData.maxFeePerGas || feeData.gasPrice || ethers.parseUnits('20', 'gwei')
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || ethers.parseUnits('2', 'gwei')

      const gasNeeded = maxFeePerGas * 250000n

      if (sponsorBalance < gasNeeded) {
        return NextResponse.json({
          error: `Sponsor wallet needs ${ethers.formatEther(gasNeeded)} ${gasToken} for gas. Has: ${ethers.formatEther(sponsorBalance)} ${gasToken}`
        })
      }

      const claimTxData = buildClaimTxData(
        walletAddress,
        claimableRaw || '0',
        claimData,
        merkleProof
      )

      // P0-1: CLAIM SIMULATION BEFORE FUND TX
      // On L2s (rapid-fire), if the claim TX reverts, gas stays in the
      // compromised wallet and the drainer steals it. By simulating the
      // claim TX via eth_call BEFORE submitting the fund TX, we catch
      // failures early and prevent gas loss.
      try {
        console.log('🔍 Simulating claim TX before funding...')
        await provider.call({
          to: contractAddress,
          data: claimTxData,
          from: compromisedWallet.address,
        })
        console.log('✅ Claim simulation passed — safe to proceed')
      } catch (simErr: unknown) {
        const simMsg = simErr instanceof Error ? simErr.message : 'Unknown simulation error'
        console.error('❌ Claim simulation FAILED:', simMsg)
        return NextResponse.json({
          error: `Claim TX simulation failed — NOT submitting fund TX to prevent gas loss. Reason: ${simMsg}`,
          simulationFailed: true,
        }, { status: 400 })
      }

      // TX 1: Sponsor sends gas to compromised wallet
      const fundTx = await sponsorWallet.signTransaction({
        to: compromisedWallet.address,
        value: gasNeeded,
        gasLimit: 21000n,
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce: sponsorNonce,
        chainId: BigInt(chainId),
        type: 2,
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
        type: 2,
      })

      // ============ EXECUTION STRATEGY ============
      const strategy = getExecutionStrategy(chainId)
      console.log(`🚀 Execution: ${strategy.method} — ${strategy.description} (chain ${chainId})`)

      if (strategy.method === 'flashbots') {
        // Ethereum: Flashbots atomic bundle — both TXs in SAME block
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
            executionMethod: 'flashbots',
            message: 'Claim executed via Flashbots atomic bundle — both TXs in same block'
          })
        }

        return NextResponse.json({
          error: `Flashbots submission failed: ${bundleResult.error}. Claim NOT executed to prevent drainer from stealing gas. Try again.`
        })
      }

      // P0-3: USE PROTECTED RPC FOR PUBLIC MEMPOOL CHAINS
      // For BSC and Polygon, we route TXs through private mempool RPCs
      // to reduce frontrunning risk. For other public mempool chains,
      // we still proceed but the user was warned in preview.
      let broadcastProvider = provider
      if (strategy.protectedRpc) {
        console.log(`🔒 Using protected RPC: ${strategy.protectedRpc}`)
        broadcastProvider = new ethers.JsonRpcProvider(strategy.protectedRpc)
      }

      // L2s and other chains: Rapid-fire sequential TXs
      // Private sequencer chains (Base, Arbitrum, etc.) have NO public mempool.
      // Drainer bot CANNOT see pending TXs — it only polls wallet balance.
      // By sending fund + claim in rapid succession (zero delay), the claim
      // executes before the drainer can detect the funded wallet.
      console.log('⚡ Rapid-fire sequential TX submission...')

      // P1-3: RETRY LOGIC WITH INCREMENTED NONCE
      // If a TX fails due to nonce mismatch (pending TXs from drainer),
      // we retry with an incremented nonce.
      const MAX_NONCE_RETRIES = 3
      let fundTxResponse, claimTxResponse
      let currentCompromisedNonce = compromisedNonce

      for (let attempt = 0; attempt < MAX_NONCE_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            console.log(`🔄 Retry attempt ${attempt + 1} with nonce ${currentCompromisedNonce}`)
            // Re-sign claim TX with incremented nonce
            const retriedClaimTx = await compromisedWallet.signTransaction({
              to: contractAddress,
              value: 0n,
              data: claimTxData,
              gasLimit: 200000n,
              maxFeePerGas,
              maxPriorityFeePerGas,
              nonce: currentCompromisedNonce,
              chainId: BigInt(chainId),
              type: 2,
            })
            claimTxResponse = await broadcastProvider.broadcastTransaction(retriedClaimTx)
          } else {
            fundTxResponse = await broadcastProvider.broadcastTransaction(fundTx)
            console.log(`✅ Fund TX: ${fundTxResponse.hash}`)

            // IMMEDIATELY broadcast claim TX (zero delay)
            claimTxResponse = await broadcastProvider.broadcastTransaction(claimTx)
          }
          console.log(`✅ Claim TX: ${claimTxResponse.hash}`)
          break // Success — exit retry loop
        } catch (broadcastErr: unknown) {
          const errMsg = broadcastErr instanceof Error ? broadcastErr.message : 'Unknown error'
          if (errMsg.includes('nonce') && attempt < MAX_NONCE_RETRIES - 1) {
            console.log(`⚠️ Nonce conflict on attempt ${attempt + 1}: ${errMsg}`)
            currentCompromisedNonce++
            continue
          }
          throw broadcastErr
        }
      }

      if (!fundTxResponse || !claimTxResponse) {
        return NextResponse.json({
          error: 'Failed to broadcast transactions after retries'
        })
      }

      // Wait for both to confirm
      const [fundReceipt, claimReceipt] = await Promise.all([
        fundTxResponse.wait(1, 30000).catch(() => null),
        claimTxResponse.wait(1, 30000).catch(() => null),
      ])

      if (claimReceipt && claimReceipt.status === 1) {
        return NextResponse.json({
          success: true,
          fundTxHash: fundTxResponse.hash,
          claimTxHash: claimTxResponse.hash,
          blockNumber: claimReceipt.blockNumber,
          executionMethod: strategy.method,
          message: `Claim executed via ${strategy.description}`
        })
      }

      if (fundReceipt && fundReceipt.status === 1 && (!claimReceipt || claimReceipt.status === 0)) {
        return NextResponse.json({
          error: `Fund TX succeeded but claim TX failed. Gas is now in compromised wallet — drainer may steal it. Fund: ${fundTxResponse.hash}, Claim: ${claimTxResponse.hash}`,
          fundTxHash: fundTxResponse.hash,
          claimTxHash: claimTxResponse.hash,
        })
      }

      return NextResponse.json({
        error: `Both TXs may have failed. Fund: ${fundTxResponse.hash}, Claim: ${claimTxResponse.hash}`
      })
    }

    // ============ SIGN (EIP-712) ============
    // Generate EIP-712 typed data for the user to sign in MetaMask.
    // NO PRIVATE KEY NEEDED — user only signs a message, not a transaction.
    // The signature authorizes a specific claim with nonce + deadline.
    if (action === 'sign') {
      if (!safeWallet || !walletAddress) {
        return NextResponse.json({ error: 'Safe wallet and wallet address required' }, { status: 400 })
      }

      // Get claimer contract address for this chain
      const claimerAddress = CLAIMER_CONTRACTS[chainId]
      if (!claimerAddress) {
        return NextResponse.json({
          error: `SweepGuardClaimer not deployed on chain ${chainId}. Deploy contracts/SweepGuardClaimer.sol first.`
        }, { status: 400 })
      }

      // Get current nonce from the claimer contract for this wallet
      const claimerIface = new ethers.Interface([
        'function getNonce(address) view returns (uint256)',
      ])
      let currentNonce = 0
      try {
        const nonceData = claimerIface.encodeFunctionData('getNonce', [walletAddress])
        const nonceResult = await provider.call({ to: claimerAddress, data: nonceData })
        currentNonce = Number(claimerIface.decodeFunctionResult('getNonce', nonceResult)[0])
      } catch {
        // Contract may not be deployed yet — use nonce 0
        console.log('Could not fetch nonce from claimer contract, using 0')
      }

      // Deadline: 10 minutes from now
      const deadline = Math.floor(Date.now() / 1000) + 600

      // Build claim data (same logic as existing claim action)
      const builtClaimData = buildClaimTxData(
        walletAddress,
        claimableRaw || '0',
        claimData,
        merkleProof
      )

      // EIP-712 typed data object for MetaMask's eth_signTypedData_v4
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
          chainId: chainId,
          verifyingContract: claimerAddress,
        },
        message: {
          hackedWallet: walletAddress,
          safeWallet: safeWallet,
          tokenAddress: tokenAddress || contractAddress,
          airdropContract: contractAddress,
          claimData: builtClaimData,
          amount: (claimableRaw || '0').toString(),
          deadline: deadline,
          nonce: currentNonce,
        },
      }

      return NextResponse.json({
        typedData,
        claimerAddress,
        nonce: currentNonce,
        deadline,
        claimData: builtClaimData,
        message: 'Sign this message in MetaMask to authorize the claim. Your private key NEVER leaves your device.',
      })
    }

    // ============ EXECUTE-SIGNED (EIP-712 + Contract) ============
    // Submit the signed EIP-712 claim to the SweepGuardClaimer contract.
    // The contract verifies the signature and executes the claim atomically.
    // User only provided a signature — sponsor wallet pays gas.
    if (action === 'execute-signed') {
      const {
        signature,
        deadline: sigDeadline,
        nonce: sigNonce,
        claimData: signedClaimData,
        sponsorPrivateKey: sigSponsorKey,
      } = body

      if (!signature || !safeWallet || !walletAddress || !tokenAddress || !sigSponsorKey) {
        return NextResponse.json({
          error: 'Signature, safe wallet, wallet address, token address, and sponsor key required'
        }, { status: 400 })
      }

      // CRITICAL: Safe wallet CANNOT be the compromised wallet
      try {
        const normalizedSafe = ethers.getAddress(safeWallet)
        const normalizedWallet = ethers.getAddress(walletAddress)
        if (normalizedSafe === normalizedWallet) {
          return NextResponse.json({
            error: 'Safe wallet CANNOT be the compromised wallet — tokens would go back to the drainer!'
          }, { status: 400 })
        }
      } catch {
        return NextResponse.json({ error: 'Invalid safe wallet address' }, { status: 400 })
      }

      const claimerAddress = CLAIMER_CONTRACTS[chainId]
      if (!claimerAddress) {
        return NextResponse.json({
          error: `SweepGuardClaimer not deployed on chain ${chainId}`
        }, { status: 400 })
      }

      const sponsorWallet = new ethers.Wallet(sigSponsorKey, provider)
      const [sponsorBalance, feeData, sponsorNonce] = await Promise.all([
        provider.getBalance(sponsorWallet.address),
        provider.getFeeData(),
        provider.getTransactionCount(sponsorWallet.address, 'latest'),
      ])

      const maxFeePerGas = feeData.maxFeePerGas || feeData.gasPrice || ethers.parseUnits('20', 'gwei')
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || ethers.parseUnits('2', 'gwei')
      const gasNeeded = maxFeePerGas * 400000n // Higher gas limit for contract call

      if (sponsorBalance < gasNeeded) {
        return NextResponse.json({
          error: `Sponsor wallet needs ${ethers.formatEther(gasNeeded)} ${gasToken} for gas. Has: ${ethers.formatEther(sponsorBalance)} ${gasToken}`
        }, { status: 400 })
      }

      // Build the claimAndSplit calldata
      const builtClaimDataForExec = signedClaimData || buildClaimTxData(
        walletAddress,
        claimableRaw || '0',
        claimData,
        merkleProof
      )

      const claimerIface = new ethers.Interface([
        'function claimAndSplit(address hackedWallet, address safeWallet, address tokenAddress, address airdropContract, bytes claimData, uint256 amount, uint256 deadline, uint256 nonce, bytes signature)',
      ])

      const execData = claimerIface.encodeFunctionData('claimAndSplit', [
        walletAddress,
        safeWallet,
        tokenAddress,
        contractAddress,
        builtClaimDataForExec,
        BigInt(claimableRaw || '0'),
        sigDeadline,
        sigNonce,
        signature,
      ])

      // Simulate before submitting
      try {
        console.log('🔍 Simulating claimAndSplit on claimer contract...')
        await provider.call({
          to: claimerAddress,
          data: execData,
          from: sponsorWallet.address,
          value: 0n,
        })
        console.log('✅ Simulation passed')
      } catch (simErr: unknown) {
        const simMsg = simErr instanceof Error ? simErr.message : 'Unknown simulation error'
        console.error('❌ Simulation FAILED:', simMsg)
        return NextResponse.json({
          error: `Claim simulation failed: ${simMsg}`,
          simulationFailed: true,
        }, { status: 400 })
      }

      // Submit the transaction
      const tx = await sponsorWallet.sendTransaction({
        to: claimerAddress,
        data: execData,
        value: 0n,
        gasLimit: 400000n,
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce: sponsorNonce,
        chainId: BigInt(chainId),
        type: 2,
      })

      console.log(`✅ Claim TX submitted: ${tx.hash}`)

      // Wait for confirmation
      const receipt = await tx.wait(1, 60000).catch(() => null)

      if (receipt && receipt.status === 1) {
        return NextResponse.json({
          success: true,
          txHash: tx.hash,
          blockNumber: receipt.blockNumber,
          executionMethod: 'eip712-signature',
          message: 'Claim executed via EIP-712 signature — no private key exposed!',
        })
      }

      return NextResponse.json({
        error: `Transaction failed or reverted. TX: ${tx.hash}`,
        txHash: tx.hash,
      })
    }

    // ============ ANTIDRAIN RESCUE (EIP-7702) ============
    // The REAL solution — uses Antidrain contract (deployed on 18+ chains)
    // Compromised wallet signs EIP-7702 authorization LOCALLY (frontend)
    // Sponsor wallet broadcasts TX, pays gas, atomic claim + transfer
    // Key NEVER reaches the server!
    if (action === 'antidrain-rescue') {
      const {
        eip7702Auth,
        tokenAddress: rescueToken,
        claimableRaw: rescueAmount,
        claimData: rescueClaimData,
        merkleProof: rescueMerkleProof,
        sponsorPrivateKey: rescueSponsorKey,
      } = body

      if (!eip7702Auth || !rescueSponsorKey || !safeWallet || !walletAddress || !contractAddress) {
        return NextResponse.json({
          error: 'EIP-7702 authorization, sponsor key, safe wallet, wallet address, and contract address required'
        }, { status: 400 })
      }

      // Use SweepGuard's own contract if deployed, otherwise fallback to zun's Antidrain
      // ⚠️ Fallback sends 20% fee to zun's wallet — deploy our contract on all chains ASAP!
      const SWEEPGUARD_RESCUER_CONTRACTS: Record<number, string> = {
        // TODO: Fill in after deployment
        // 1: '0x...',     // Ethereum
        // 8453: '0x...',  // Base
        // 42161: '0x...', // Arbitrum
      }
      const ANTIDRAIN_FALLBACK = '0x0000004a25e070e8ca902cb5d6cb7c90dfd00000'
      const antidrainAddress = SWEEPGUARD_RESCUER_CONTRACTS[chainId] || ANTIDRAIN_FALLBACK
      const antidrainCode = await provider.getCode(antidrainAddress)
      if (!antidrainCode || antidrainCode === '0x') {
        return NextResponse.json({
          error: `Antidrain contract not deployed on chain ${chainId}. Use Direct Claim instead.`
        }, { status: 400 })
      }

      // CRITICAL: Safe wallet CANNOT be the compromised wallet
      try {
        const normalizedSafe = ethers.getAddress(safeWallet)
        const normalizedCompromised = ethers.getAddress(walletAddress)
        if (normalizedSafe === normalizedCompromised) {
          return NextResponse.json({
            error: 'Safe wallet CANNOT be the compromised wallet — tokens would go back to the drainer!'
          }, { status: 400 })
        }
      } catch {
        return NextResponse.json({ error: 'Invalid safe wallet address' }, { status: 400 })
      }

      const sponsorWallet = new ethers.Wallet(rescueSponsorKey, provider)
      const [sponsorBalance, feeData, sponsorNonce] = await Promise.all([
        provider.getBalance(sponsorWallet.address),
        provider.getFeeData(),
        provider.getTransactionCount(sponsorWallet.address, 'latest'),
      ])

      const maxFeePerGas = feeData.maxFeePerGas || feeData.gasPrice || ethers.parseUnits('20', 'gwei')
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || ethers.parseUnits('2', 'gwei')
      const gasNeeded = maxFeePerGas * 600000n // Higher gas for EIP-7702 + batch

      if (sponsorBalance < gasNeeded) {
        return NextResponse.json({
          error: `Sponsor wallet needs ${ethers.formatEther(gasNeeded)} ${gasToken} for gas. Has: ${ethers.formatEther(sponsorBalance)} ${gasToken}`
        }, { status: 400 })
      }

      // Build claim calldata for the airdrop contract
      const claimCalldata = rescueClaimData || buildClaimTxData(
        walletAddress,
        rescueAmount || '0',
        rescueClaimData,
        rescueMerkleProof
      )

      // Build Antidrain executeRescue calldata
      const antidrainIface = new ethers.Interface([
        'function executeRescue(address safeRecipient, address[] tokens, address claimTarget, bytes claimData, address fw) external payable',
      ])

      const rescueCalldata = antidrainIface.encodeFunctionData('executeRescue', [
        safeWallet,                                    // safeRecipient — where tokens go
        rescueToken ? [rescueToken] : [],              // tokens to rescue after claim
        contractAddress,                               // claimTarget — airdrop contract
        claimCalldata,                                 // claimData — the claim function calldata
        PLATFORM_FEE_WALLET,                           // fw — fee wallet (our platform gets 20%)
      ])

      // Simulate before submitting
      try {
        console.log('🔍 Simulating Antidrain executeRescue...')
        await provider.call({
          to: antidrainAddress,
          data: rescueCalldata,
          from: sponsorWallet.address,
          value: 0n,
        })
        console.log('✅ Antidrain simulation passed')
      } catch (simErr: unknown) {
        const simMsg = simErr instanceof Error ? simErr.message : 'Unknown simulation error'
        console.error('❌ Antidrain simulation FAILED:', simMsg)
        return NextResponse.json({
          error: `Antidrain rescue simulation failed: ${simMsg}`,
          simulationFailed: true,
        }, { status: 400 })
      }

      // Construct EIP-7702 transaction (Type 4)
      // The authorization list delegates the compromised wallet to Antidrain contract
      const eip7702Tx = {
        to: antidrainAddress,
        data: rescueCalldata,
        value: 0n,
        gasLimit: 600000n,
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce: sponsorNonce,
        chainId: BigInt(chainId),
        type: 4, // EIP-7702
        authorizationList: [{
          chainId: BigInt(eip7702Auth.chainId),
          address: eip7702Auth.address,
          nonce: BigInt(eip7702Auth.nonce),
          yParity: eip7702Auth.yParity,
          r: eip7702Auth.r,
          s: eip7702Auth.s,
        }],
      } as Record<string, unknown>

      // Submit via private sequencer (L2) or direct (Ethereum)
      // NOTE: EIP-7702 (Type 4) transactions may not be supported by Flashbots relay yet.
      // For Ethereum, we submit directly — the TX is atomic so drainer can't intercept.
      let txHash: string
      try {
        const txResponse = await sponsorWallet.sendTransaction(eip7702Tx as ethers.TransactionRequest)
        txHash = txResponse.hash
        const receipt = await txResponse.wait(1, 120000).catch(() => null)
        if (!receipt || receipt.status !== 1) {
          return NextResponse.json({
            error: `Transaction reverted. TX: ${txHash}`,
            txHash,
          })
        }
      } catch (submitErr: unknown) {
        const submitMsg = submitErr instanceof Error ? submitErr.message : 'TX submission failed'
        return NextResponse.json({ error: `EIP-7702 TX failed: ${submitMsg}` }, { status: 500 })
      }

      console.log(`✅ Antidrain EIP-7702 rescue TX: ${txHash}`)

      return NextResponse.json({
        success: true,
        txHash,
        executionMethod: 'eip7702-antidrain',
        message: 'Rescued via EIP-7702 + Antidrain — key never left browser!',
        antidrainContract: antidrainAddress,
        feePercent: 20,
        feeWallet: PLATFORM_FEE_WALLET,
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Internal error'
    console.error('Airdrop claim error:', errMsg)
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}
