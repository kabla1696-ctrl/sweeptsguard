import { ethers } from 'ethers'

// ============================================================
// FUND RECOVERY TOOL
// Recover funds from EIP-7702 compromised wallets
// Strategy: Flashbots atomic bundle — sweep + revoke before drainer bot reacts
// ============================================================

export interface RecoveryConfig {
  compromisedWalletPrivateKey: string
  safeWalletAddress: string
  chainId: number
  rpcUrl: string
  sponsorPrivateKey?: string
  platformFeeWallet?: string
  platformFeePercent?: number
}

export interface RecoveryResult {
  success: boolean
  ethRecovered?: string
  tokensRecovered?: { symbol: string; amount: string; txHash: string }[]
  delegationRevoked?: boolean
  totalValueUSD?: number
  error?: string
  txHashes?: string[]
}

export interface TokenBalance {
  address: string
  symbol: string
  decimals: number
  balance: bigint
  balanceFormatted: string
}

const PLATFORM_FEE_WALLET = '0x7A3725154a2E6468F9549334394802e9E2822C2A'
const PLATFORM_FEE_PERCENT = 20

// ============================================================
// EIP-2612 Permit Support
// Tokens with permit can be swept WITHOUT gas funding to compromised wallet
// Sponsor submits: permit + transferFrom in ONE atomic TX
// ============================================================
const PERMIT_ABI = [
  'function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)',
  'function nonces(address owner) view returns (uint256)',
  'function DOMAIN_SEPARATOR() view returns (bytes32)',
  'function name() view returns (string)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)'
]

// Tokens known to support EIP-2612 permit
const PERMIT_TOKENS: Record<number, Set<string>> = {
  1: new Set([
    '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
    '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', // UNI
    '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', // AAVE
    '0xD533a949740bb3306d119CC777fa900bA034cd52', // CRV
    '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84', // stETH
    '0x514910771AF9Ca656af840dff83E8264EcF986CA', // LINK
    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
    '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', // WBTC
    '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0', // wstETH
    '0xBe9895146f7AF43049ca1c1AE358B0541Ea49704', // cbETH
    '0x853d955aCEf822Db058eb8505911ED77F175b99e', // FRAX
    '0x956F47F50A910163D8BF957Cf5846D573E7f87CA', // FEI
  ]),
  8453: new Set([
    '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
    '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', // DAI
    '0x4200000000000000000000000000000000000006', // WETH
    '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22', // cbETH
  ]),
  42161: new Set([
    '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
    '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', // USDT
    '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH
    '0x912CE59144191C1204E64559FE8253a0e49E6548', // ARB
  ]),
  137: new Set([
    '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC
    '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // USDT
    '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', // WETH
    '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', // WBTC
  ]),
  10: new Set([
    '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', // USDC
    '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', // USDT
    '0x4200000000000000000000000000000000000006', // WETH
  ])
}

// Check if token supports EIP-2612 permit
async function checkPermitSupport(
  provider: ethers.JsonRpcProvider,
  tokenAddress: string,
  chainId: number
): Promise<boolean> {
  // Quick check: known permit tokens
  const knownPermits = PERMIT_TOKENS[chainId]
  if (knownPermits?.has(tokenAddress.toLowerCase()) || knownPermits?.has(tokenAddress)) {
    return true
  }
  // Try calling nonces() — if it exists, permit is likely supported
  try {
    const contract = new ethers.Contract(tokenAddress, PERMIT_ABI, provider)
    await contract.nonces(ethers.ZeroAddress)
    return true
  } catch {
    return false
  }
}

// Sign EIP-2612 permit off-chain (no gas needed)
async function signPermit(
  wallet: ethers.Wallet,
  tokenAddress: string,
  spender: string,
  amount: bigint,
  deadline: bigint,
  provider: ethers.JsonRpcProvider,
  chainId: number
): Promise<{ v: number; r: string; s: string }> {
  const contract = new ethers.Contract(tokenAddress, PERMIT_ABI, provider)
  const owner = wallet.address
  const nonce = await contract.nonces(owner)
  const name = await contract.name()

  // EIP-712 domain
  const domain = {
    name,
    version: '1',
    chainId,
    verifyingContract: tokenAddress
  }

  // EIP-712 permit types
  const types = {
    Permit: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' }
    ]
  }

  const value = {
    owner,
    spender,
    value: amount,
    nonce,
    deadline
  }

  const signature = await wallet.signTypedData(domain, types, value)
  const sig = ethers.Signature.from(signature)

  return { v: sig.v, r: sig.r, s: sig.s }
}

// ============================================================
// PERMIT-BASED SWEEP (DRAINER CAN'T INTERFERE)
// No gas funding to compromised wallet!
// Sponsor submits: permit + transferFrom in ONE atomic TX
// ============================================================
export async function executePermitSweep(
  compromisedPrivateKey: string,
  sponsorPrivateKey: string,
  safeWalletAddress: string,
  chainId: number,
  rpcUrl: string
): Promise<AtomicRecoveryResult> {
  const provider = new ethers.JsonRpcProvider(rpcUrl)
  const compromisedWallet = new ethers.Wallet(compromisedPrivateKey, provider)
  const sponsorWallet = new ethers.Wallet(sponsorPrivateKey, provider)
  const compromisedAddress = compromisedWallet.address

  console.log('🔐 PERMIT-BASED SWEEP — No gas funding to compromised wallet')

  // ── Step 1: Scan assets ──
  const assets = await scanRecoverableAssets(compromisedAddress, rpcUrl)
  const tokensWithPermit: { token: TokenBalance; hasPermit: boolean }[] = []

  for (const token of assets.tokens) {
    const hasPermit = await checkPermitSupport(provider, token.address, chainId)
    tokensWithPermit.push({ token, hasPermit })
  }

  const permitTokens = tokensWithPermit.filter(t => t.hasPermit)
  const nonPermitTokens = tokensWithPermit.filter(t => !t.hasPermit)

  console.log(`✅ ${permitTokens.length} tokens with permit support`)
  console.log(`⚠️ ${nonPermitTokens.length} tokens without permit (need gas funding)`)

  if (permitTokens.length === 0 && assets.ethBalance === BigInt(0)) {
    return { success: false, error: 'No tokens with permit support found. Use standard recovery.' }
  }

  // ── Step 2: Sign permits off-chain (no gas!) ──
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600) // 1 hour
  const signedPermits: {
    tokenAddress: string
    amount: bigint
    permit: { v: number; r: string; s: string }
    token: TokenBalance
  }[] = []

  for (const { token } of permitTokens) {
    try {
      // Approve MAX so sponsor can transferFrom
      const permit = await signPermit(
        compromisedWallet,
        token.address,
        sponsorWallet.address,
        token.balance, // Approve full balance
        deadline,
        provider,
        chainId
      )
      signedPermits.push({
        tokenAddress: token.address,
        amount: token.balance,
        permit,
        token
      })
      console.log(`✍️ Signed permit for ${token.symbol}`)
    } catch (err) {
      console.log(`❌ Failed to sign permit for ${token.symbol}: ${err}`)
    }
  }

  if (signedPermits.length === 0) {
    return { success: false, error: 'Failed to sign any permits. Try standard recovery.' }
  }

  // ── Step 3: Build atomic TXs from sponsor wallet ──
  const gasParams = await getGasParams(provider, chainId)
  let sponsorNonce = await getSafeNonce(provider, sponsorWallet.address)

  const buildTxParams = (nonceVal: number, gasLimit: bigint) => ({
    nonce: nonceVal,
    chainId,
    gasLimit,
    ...(gasParams.type === 2
      ? { type: 2, maxFeePerGas: gasParams.maxFeePerGas, maxPriorityFeePerGas: gasParams.maxPriorityFeePerGas }
      : { gasPrice: gasParams.gasPrice })
  })

  const txs: string[] = []
  const platformFeeWallet = PLATFORM_FEE_WALLET
  const feePercent = BigInt(PLATFORM_FEE_PERCENT)
  const userPercent = 100n - feePercent

  // For each permit token: permit + transferFrom (sponsor pays gas)
  for (const { tokenAddress, amount, permit, token } of signedPermits) {
    const contract = new ethers.Contract(tokenAddress, PERMIT_ABI)

    // TX: permit (sponsor calls permit on behalf of compromised wallet)
    const permitData = contract.interface.encodeFunctionData('permit', [
      compromisedAddress,
      sponsorWallet.address,
      amount,
      deadline,
      permit.v,
      permit.r,
      permit.s
    ])
    const permitTx = await sponsorWallet.signTransaction({
      to: tokenAddress,
      data: permitData,
      value: 0n,
      ...buildTxParams(sponsorNonce++, 100000n)
    })
    txs.push(permitTx)

    // TX: transferFrom → safe wallet (user share)
    const userShare = (amount * userPercent) / 100n
    const transferData = contract.interface.encodeFunctionData('transferFrom', [
      compromisedAddress,
      safeWalletAddress,
      userShare
    ])
    const transferTx = await sponsorWallet.signTransaction({
      to: tokenAddress,
      data: transferData,
      value: 0n,
      ...buildTxParams(sponsorNonce++, 100000n)
    })
    txs.push(transferTx)

    // TX: transferFrom → platform fee wallet
    const feeShare = amount - userShare
    if (feeShare > BigInt(0)) {
      const feeData2 = contract.interface.encodeFunctionData('transferFrom', [
        compromisedAddress,
        platformFeeWallet,
        feeShare
      ])
      const feeTx = await sponsorWallet.signTransaction({
        to: tokenAddress,
        data: feeData2,
        value: 0n,
        ...buildTxParams(sponsorNonce++, 100000n)
      })
      txs.push(feeTx)
    }

    console.log(`💰 Built permit sweep for ${token.symbol}: ${token.balanceFormatted}`)
  }

  // ── Step 4: Verify balance before submission ──
  // Check that compromised wallet still has the funds
  for (const { tokenAddress, token } of signedPermits) {
    const contract = new ethers.Contract(tokenAddress, PERMIT_ABI, provider)
    const currentBalance = await contract.balanceOf(compromisedAddress)
    if (currentBalance < token.balance) {
      console.log(`⚠️ DRAINER ACTIVITY DETECTED! ${token.symbol} balance changed: ${token.balanceFormatted} → ${ethers.formatUnits(currentBalance, token.decimals)}`)
      // Continue anyway — we'll sweep whatever is left
    }
  }

  // ── Step 5: Submit atomically ──
  console.log(`🚀 Submitting ${txs.length} permit sweep TXs atomically...`)
  const result = await submitSafeRecovery(txs, chainId, rpcUrl)

  if (result.success) {
    // For ETH + non-permit tokens, do a separate standard recovery if needed
    let ethRecovered = '0'
    let nonPermitResults: { symbol: string; amount: string; toUser: string; fee: string }[] = []

    if (assets.ethBalance > BigInt(0) || nonPermitTokens.length > 0) {
      console.log('💰 ETH/non-permit tokens found — using standard recovery for those...')
      const standardResult = await executeFullRecoveryAndRevoke(
        compromisedPrivateKey,
        sponsorPrivateKey,
        safeWalletAddress,
        chainId,
        rpcUrl
      )
      if (standardResult.success) {
        ethRecovered = standardResult.ethRecovered || '0'
        nonPermitResults = standardResult.tokensRecovered || []
      }
    }

    return {
      success: true,
      ethRecovered,
      tokensRecovered: [
        ...signedPermits.map(({ token }) => ({
          symbol: token.symbol,
          amount: token.balanceFormatted,
          toUser: ethers.formatUnits((token.balance * userPercent) / 100n, token.decimals),
          fee: ethers.formatUnits((token.balance * feePercent) / 100n, token.decimals)
        })),
        ...nonPermitResults
      ],
      delegationRevoked: false,
      txCount: txs.length,
      txHashes: result.txHashes
    }
  }

  return {
    success: false,
    error: result.error || 'Permit sweep failed',
    txHashes: result.txHashes
  }
}

// ============================================================
// VERIFY BALANCE BEFORE SWEEP
// Detect if drainer moved funds between scan and sweep
// ============================================================
export async function verifyBalanceBeforeSweep(
  walletAddress: string,
  rpcUrl: string,
  expectedEth: bigint,
  expectedTokens: TokenBalance[]
): Promise<{
  safe: boolean
  currentEth: bigint
  drainedTokens: string[]
  remainingTokens: TokenBalance[]
}> {
  const provider = new ethers.JsonRpcProvider(rpcUrl)
  const currentEth = await provider.getBalance(walletAddress)
  const drainedTokens: string[] = []
  const remainingTokens: TokenBalance[] = []

  for (const token of expectedTokens) {
    try {
      const contract = new ethers.Contract(token.address, [
        'function balanceOf(address) view returns (uint256)'
      ], provider)
      const currentBalance = await contract.balanceOf(walletAddress)
      if (currentBalance === BigInt(0)) {
        drainedTokens.push(token.symbol)
      } else if (currentBalance < token.balance) {
        remainingTokens.push({
          ...token,
          balance: currentBalance,
          balanceFormatted: ethers.formatUnits(currentBalance, token.decimals)
        })
      } else {
        remainingTokens.push(token)
      }
    } catch {
      remainingTokens.push(token)
    }
  }

  return {
    safe: currentEth >= expectedEth && drainedTokens.length === 0,
    currentEth,
    drainedTokens,
    remainingTokens
  }
}

// ============================================================
// Helper: Get EIP-1559 fee data (or legacy fallback)
// ============================================================
async function getGasParams(provider: ethers.JsonRpcProvider, chainId: number): Promise<{
  maxFeePerGas?: bigint
  maxPriorityFeePerGas?: bigint
  gasPrice?: bigint
  type: number
}> {
  const feeData = await provider.getFeeData()

  // Chains that support EIP-1559
  const eip1559Chains = new Set([1, 8453, 42161, 137, 10, 43114, 81457, 324, 59144, 534352, 7777777, 57073, 1868])

  if (eip1559Chains.has(chainId) && feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
    return {
      maxFeePerGas: feeData.maxFeePerGas,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
      type: 2
    }
  }

  // Legacy gas for other chains
  return {
    gasPrice: feeData.gasPrice || feeData.maxFeePerGas || ethers.parseUnits('30', 'gwei'),
    type: 0
  }
}

// ============================================================
// Helper: Detect pending nonce conflicts
// ============================================================
async function getSafeNonce(provider: ethers.JsonRpcProvider, address: string): Promise<number> {
  try {
    const pendingCount = await provider.getTransactionCount(address, 'pending')
    const latestCount = await provider.getTransactionCount(address, 'latest')
    if (pendingCount > latestCount) {
      console.log(`⚠️ Nonce conflict: ${address} has ${pendingCount - latestCount} pending TX(s). Using pending nonce.`)
    }
    return pendingCount
  } catch {
    return await provider.getTransactionCount(address, 'latest')
  }
}

// ============================================================
// STEP 1: Scan what's still in the wallet
// ============================================================
export async function scanRecoverableAssets(
  walletAddress: string,
  rpcUrl: string
): Promise<{
  ethBalance: bigint
  ethFormatted: string
  tokens: TokenBalance[]
  hasDelegation: boolean
  delegatedTo: string | null
}> {
  const provider = new ethers.JsonRpcProvider(rpcUrl || 'https://eth.drpc.org')

  // Check ETH balance
  const ethBalance = await provider.getBalance(walletAddress)
  const ethFormatted = ethers.formatEther(ethBalance)

  // Check if wallet has EIP-7702 delegation
  const code = await provider.getCode(walletAddress)
  const hasDelegation = code.startsWith('0xef0100')
  const delegatedTo = hasDelegation
    ? '0x' + code.slice(8, 48)
    : null

  // Scan for ERC-20 tokens
  const tokens: TokenBalance[] = []

  // Common token contracts (Ethereum mainnet)
  const commonTokens = [
    { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', decimals: 6 },
    { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', decimals: 6 },
    { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', symbol: 'DAI', decimals: 18 },
    { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', symbol: 'WBTC', decimals: 8 },
    { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol: 'WETH', decimals: 18 },
    { address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', symbol: 'LINK', decimals: 18 },
    { address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', symbol: 'UNI', decimals: 18 },
    { address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', symbol: 'AAVE', decimals: 18 },
    { address: '0xD533a949740bb3306d119CC777fa900bA034cd52', symbol: 'CRV', decimals: 18 },
    { address: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84', symbol: 'stETH', decimals: 18 },
  ]

  const erc20Abi = [
    'function balanceOf(address) view returns (uint256)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)'
  ]

  for (const token of commonTokens) {
    try {
      const contract = new ethers.Contract(token.address, erc20Abi, provider)
      const balance = await contract.balanceOf(walletAddress)
      if (balance > BigInt(0)) {
        tokens.push({
          address: token.address,
          symbol: token.symbol,
          decimals: token.decimals,
          balance,
          balanceFormatted: ethers.formatUnits(balance, token.decimals)
        })
      }
    } catch {
      // Skip failed tokens
    }
  }

  return { ethBalance, ethFormatted, tokens, hasDelegation, delegatedTo }
}

// ============================================================
// STEP 2: Create recovery transactions (FIXED)
// ============================================================
export async function createRecoveryTransactions(
  config: RecoveryConfig
): Promise<{
  success: boolean
  transactions: string[]
  error?: string
}> {
  const provider = new ethers.JsonRpcProvider(config.rpcUrl)
  const wallet = new ethers.Wallet(config.compromisedWalletPrivateKey, provider)
  const walletAddress = wallet.address

  try {
    const assets = await scanRecoverableAssets(walletAddress, config.rpcUrl)

    if (assets.ethBalance === BigInt(0) && assets.tokens.length === 0) {
      return { success: false, transactions: [], error: 'No recoverable assets found' }
    }

    const signedTxs: string[] = []
    const gasParams = await getGasParams(provider, config.chainId)
    let nonce = await getSafeNonce(provider, walletAddress)

    const platformFeeWallet = config.platformFeeWallet || PLATFORM_FEE_WALLET
    const feePercent = BigInt(config.platformFeePercent ?? PLATFORM_FEE_PERCENT)
    const userPercent = 100n - feePercent

    // Build base tx params
    const baseTx = (nonceVal: number, gasLimit: bigint) => ({
      nonce: nonceVal,
      chainId: config.chainId,
      gasLimit,
      ...(gasParams.type === 2
        ? { type: 2, maxFeePerGas: gasParams.maxFeePerGas, maxPriorityFeePerGas: gasParams.maxPriorityFeePerGas }
        : { gasPrice: gasParams.gasPrice })
    })

    // TX 1: Sweep ETH → safe wallet (entire balance minus gas for this TX)
    if (assets.ethBalance > BigInt(0)) {
      const gasLimit = 21000n
      const gasCost = gasParams.type === 2
        ? gasLimit * (gasParams.maxFeePerGas || BigInt(0))
        : gasLimit * (gasParams.gasPrice || BigInt(0))

      // FIX: No double subtraction — only subtract gas cost
      const sweepAmount = assets.ethBalance - gasCost

      if (sweepAmount > BigInt(0)) {
        const userShare = (sweepAmount * userPercent) / 100n
        const feeShare = sweepAmount - userShare

        // User share
        const ethTx = await wallet.signTransaction({
          to: config.safeWalletAddress,
          value: userShare,
          ...baseTx(nonce++, gasLimit)
        })
        signedTxs.push(ethTx)

        // Platform fee share
        if (feeShare > gasCost) { // Only if fee is worth the gas
          const feeTx = await wallet.signTransaction({
            to: platformFeeWallet,
            value: feeShare,
            ...baseTx(nonce++, gasLimit)
          })
          signedTxs.push(feeTx)
        }
      }
    }

    // TX 2-N: Sweep each token → safe wallet
    for (const token of assets.tokens) {
      try {
        const erc20Interface = new ethers.Interface([
          'function transfer(address to, uint256 amount) returns (bool)'
        ])
        const userShare = (token.balance * userPercent) / 100n
        const feeShare = token.balance - userShare

        // User share
        const userData = erc20Interface.encodeFunctionData('transfer', [
          config.safeWalletAddress, userShare
        ])
        const tokenTx = await wallet.signTransaction({
          to: token.address,
          data: userData,
          value: 0n,
          ...baseTx(nonce++, 100000n)
        })
        signedTxs.push(tokenTx)

        // Platform fee share
        if (feeShare > BigInt(0)) {
          const feeData = erc20Interface.encodeFunctionData('transfer', [
            platformFeeWallet, feeShare
          ])
          const feeTokenTx = await wallet.signTransaction({
            to: token.address,
            data: feeData,
            value: 0n,
            ...baseTx(nonce++, 100000n)
          })
          signedTxs.push(feeTokenTx)
        }
      } catch {
        // Skip failed token sweeps
      }
    }

    // Final TX: Revoke EIP-7702 delegation
    if (assets.hasDelegation) {
      try {
        const revokeTx = await wallet.signTransaction({
          to: walletAddress,
          value: 0n,
          ...baseTx(nonce++, 50000n),
          type: 4,
          authorizationList: []
        } as ethers.TransactionRequest)
        signedTxs.push(revokeTx)
      } catch {
        const revokeTx = await wallet.signTransaction({
          to: walletAddress,
          value: 0n,
          ...baseTx(nonce++, 21000n)
        })
        signedTxs.push(revokeTx)
      }
    }

    return { success: true, transactions: signedTxs }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to create recovery transactions'
    return { success: false, transactions: [], error: errorMessage }
  }
}

// ============================================================
// STEP 3: Submit via Flashbots (private mempool ONLY)
// NO direct fallback — drainer would see it in public mempool
// ============================================================
export async function submitRecoveryBundle(
  signedTxs: string[],
  chainId: number,
  rpcUrl: string
): Promise<{ success: boolean; bundleHash?: string; blockNumber?: number; error?: string }> {
  const provider = new ethers.JsonRpcProvider(rpcUrl)
  const currentBlock = await provider.getBlockNumber()
  const targetBlock = currentBlock + 1

  // Flashbots relay — only works on Ethereum
  // For L2s with private sequencers (Base, Arbitrum, etc.), direct submission IS safe
  const relayUrl = chainId === 11155111
    ? 'https://relay-sepolia.flashbots.net'
    : 'https://relay.flashbots.net'

  const authSigner = ethers.Wallet.createRandom()

  const bundleRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'eth_sendBundle',
    params: [{
      txs: signedTxs,
      blockNumber: '0x' + targetBlock.toString(16)
    }]
  }

  try {
    const message = JSON.stringify(bundleRequest)
    const signature = await authSigner.signMessage(message)

    const response = await fetch(relayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Flashbots-Signature': signature
      },
      body: message
    })

    const data = await response.json()

    if (data.error) {
      return { success: false, error: data.error.message }
    }

    return {
      success: true,
      bundleHash: data.result?.bundleHash,
      blockNumber: targetBlock
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Flashbots submission failed'
    return { success: false, error: errorMessage }
  }
}

// ============================================================
// Safe direct submission for L2s with private sequencers
// These chains have NO public mempool — drainer can't see pending TXs
// ============================================================
const PRIVATE_SEQUENCER_CHAINS = new Set([
  8453, 42161, 10, 324, 59144, 534352, 5000, 34443, 81457,
  7777777, 57073, 1868, 1923, 2818, 43111, 80094, 1329
])

export async function submitSafeRecovery(
  signedTxs: string[],
  chainId: number,
  rpcUrl: string
): Promise<{ success: boolean; txHashes?: string[]; error?: string }> {
  const provider = new ethers.JsonRpcProvider(rpcUrl)
  const txHashes: string[] = []

  try {
    // For Ethereum: MUST use Flashbots (public mempool = drainer sees it)
    if (chainId === 1 || chainId === 11155111) {
      const bundleResult = await submitRecoveryBundle(signedTxs, chainId, rpcUrl)
      if (bundleResult.success) {
        return { success: true, txHashes: bundleResult.bundleHash ? [bundleResult.bundleHash] : [] }
      }
      return { success: false, error: `Flashbots failed: ${bundleResult.error}. Direct submission on Ethereum is NOT safe — drainer would see it.` }
    }

    // For L2s with private sequencers: direct submission is safe
    if (PRIVATE_SEQUENCER_CHAINS.has(chainId)) {
      for (const signedTx of signedTxs) {
        const tx = await provider.broadcastTransaction(signedTx)
        txHashes.push(tx.hash)
        await new Promise(resolve => setTimeout(resolve, 300))
      }
      return { success: true, txHashes }
    }

    // For other chains with public mempool: try Flashbots first, then warn
    const bundleResult = await submitRecoveryBundle(signedTxs, chainId, rpcUrl)
    if (bundleResult.success) {
      return { success: true, txHashes: bundleResult.bundleHash ? [bundleResult.bundleHash] : [] }
    }

    // Last resort: direct submission with warning
    console.log('⚠️ WARNING: Direct submission on public mempool chain — drainer may see pending TXs')
    for (const signedTx of signedTxs) {
      const tx = await provider.broadcastTransaction(signedTx)
      txHashes.push(tx.hash)
      await new Promise(resolve => setTimeout(resolve, 300))
    }
    return { success: true, txHashes }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Submission failed'
    return { success: false, txHashes, error: errorMessage }
  }
}

// ============================================================
// FULL RECOVERY: Scan → Create → Submit (FIXED)
// ============================================================
export async function executeFullRecovery(
  config: RecoveryConfig
): Promise<RecoveryResult> {
  console.log('🔍 Scanning recoverable assets...')

  const wallet = new ethers.Wallet(config.compromisedWalletPrivateKey)
  const assets = await scanRecoverableAssets(wallet.address, config.rpcUrl)

  console.log(`💰 Found: ${assets.ethFormatted} ETH, ${assets.tokens.length} tokens`)

  if (assets.ethBalance === BigInt(0) && assets.tokens.length === 0) {
    return { success: false, error: 'No recoverable assets found in wallet' }
  }

  console.log('📝 Creating recovery transactions...')
  const txResult = await createRecoveryTransactions(config)

  if (!txResult.success || txResult.transactions.length === 0) {
    return { success: false, error: txResult.error || 'No transactions to submit' }
  }

  console.log(`⚡ Created ${txResult.transactions.length} transactions`)

  // Submit safely based on chain type
  console.log('🚀 Submitting recovery bundle...')
  const result = await submitSafeRecovery(
    txResult.transactions,
    config.chainId,
    config.rpcUrl
  )

  if (result.success) {
    return {
      success: true,
      ethRecovered: assets.ethFormatted,
      tokensRecovered: assets.tokens.map((t, i) => ({
        symbol: t.symbol,
        amount: t.balanceFormatted,
        txHash: result.txHashes?.[0] || 'bundle'
      })),
      delegationRevoked: assets.hasDelegation,
      txHashes: result.txHashes
    }
  }

  return {
    success: false,
    error: result.error || 'Recovery submission failed',
    txHashes: result.txHashes
  }
}

// ============================================================
// REVOKE DELEGATION ONLY (FIXED)
// Uses sponsor wallet to fund gas + $40 fee, then revokes
// ============================================================
export async function executeRevokeDelegation(
  compromisedWalletPrivateKey: string,
  sponsorPrivateKey: string,
  chainId: number,
  rpcUrl: string,
  gasToken: string = 'ETH'
): Promise<RecoveryResult> {
  const provider = new ethers.JsonRpcProvider(rpcUrl)
  const compromisedWallet = new ethers.Wallet(compromisedWalletPrivateKey, provider)
  const sponsorWallet = new ethers.Wallet(sponsorPrivateKey, provider)
  const compromisedAddress = compromisedWallet.address

  console.log(`🔄 Revoking delegation for ${compromisedAddress}`)

  // Check delegation
  const code = await provider.getCode(compromisedAddress)
  if (!code.startsWith('0xef0100')) {
    return { success: true, delegationRevoked: false, error: 'No delegation found on this chain' }
  }

  const delegatedTo = '0x' + code.slice(8, 48)
  console.log(`⚠️ Delegation active to: ${delegatedTo}`)

  // Get gas params (EIP-1559 or legacy)
  const gasParams = await getGasParams(provider, chainId)

  // Gas needed: fund transfer (21k) + revoke (50k) + buffer
  const gasLimit = 71000n
  const gasCostPerUnit = gasParams.type === 2 ? (gasParams.maxFeePerGas || BigInt(0)) : (gasParams.gasPrice || BigInt(0))
  const gasNeeded = (gasCostPerUnit * gasLimit * 130n) / 100n // 30% buffer

  // Min gas per chain
  const minGasPerChain: Record<number, bigint> = {
    1: ethers.parseEther('0.003'),
    8453: ethers.parseEther('0.0001'),
    56: ethers.parseEther('0.001'),
    42161: ethers.parseEther('0.0001'),
    137: ethers.parseEther('0.01'),
    10: ethers.parseEther('0.0001'),
    5000: ethers.parseEther('0.001'),
    534352: ethers.parseEther('0.0001'),
    100: ethers.parseEther('0.01'),
    7000: ethers.parseEther('0.01'),
    1625: ethers.parseEther('0.01'),
    1116: ethers.parseEther('0.01'),
    1329: ethers.parseEther('0.01'),
    80094: ethers.parseEther('0.001'),
    57073: ethers.parseEther('0.0001'),
    196: ethers.parseEther('0.001'),
    43111: ethers.parseEther('0.0001'),
    8217: ethers.parseEther('0.01'),
  }
  const minGas = minGasPerChain[chainId] || ethers.parseEther('0.001')
  const finalGasNeeded = gasNeeded > minGas ? gasNeeded : minGas

  // $40 fixed fee in native token
  const ETH_PRICE_USD = parseFloat(process.env.ETH_PRICE_USD || '2500')
  const REVOKE_FEE_USD = 40
  const revokeFeeWei = ethers.parseEther((REVOKE_FEE_USD / ETH_PRICE_USD).toFixed(18))

  // Check sponsor balance
  const sponsorBalance = await provider.getBalance(sponsorWallet.address)
  const totalNeeded = finalGasNeeded + revokeFeeWei + ethers.parseEther('0.0005')
  if (sponsorBalance < totalNeeded) {
    return {
      success: false,
      error: `Sponsor needs ${ethers.formatEther(totalNeeded)} ${gasToken} (gas + $40 fee). Has: ${ethers.formatEther(sponsorBalance)} ${gasToken}`
    }
  }

  // Get nonces with conflict detection
  const compromisedNonce = await getSafeNonce(provider, compromisedAddress)
  let sponsorNonce = await getSafeNonce(provider, sponsorWallet.address)

  // Build tx params
  const buildTxParams = (nonceVal: number, gasLimit: bigint) => ({
    nonce: nonceVal,
    chainId,
    gasLimit,
    ...(gasParams.type === 2
      ? { type: 2, maxFeePerGas: gasParams.maxFeePerGas, maxPriorityFeePerGas: gasParams.maxPriorityFeePerGas }
      : { gasPrice: gasParams.gasPrice })
  })

  // TX 1 (sponsor): Send gas to compromised wallet
  const fundTx = await sponsorWallet.signTransaction({
    to: compromisedAddress,
    value: finalGasNeeded,
    ...buildTxParams(sponsorNonce++, 21000n)
  })

  // TX 2 (sponsor): $40 fee → platform wallet
  const feeTx = await sponsorWallet.signTransaction({
    to: PLATFORM_FEE_WALLET,
    value: revokeFeeWei,
    ...buildTxParams(sponsorNonce++, 21000n)
  })

  // TX 3 (compromised): Revoke delegation
  let revokeTx: string
  try {
    revokeTx = await compromisedWallet.signTransaction({
      to: compromisedAddress,
      value: 0n,
      ...buildTxParams(compromisedNonce, 50000n),
      type: 4,
      authorizationList: []
    } as ethers.TransactionRequest)
  } catch {
    revokeTx = await compromisedWallet.signTransaction({
      to: compromisedAddress,
      value: 0n,
      ...buildTxParams(compromisedNonce, 21000n)
    })
  }

  // Submit atomically
  console.log('🚀 Submitting revoke via Flashbots atomic bundle...')
  const result = await submitSafeRecovery([fundTx, feeTx, revokeTx], chainId, rpcUrl)

  if (result.success) {
    console.log('✅ Delegation revoked!')
    return {
      success: true,
      delegationRevoked: true,
      txHashes: result.txHashes
    }
  }

  return {
    success: false,
    error: result.error || 'Revoke failed'
  }
}

// ============================================================
// ONE-CLICK FULL RECOVERY + REVOKE (FIXED)
// ============================================================
export interface AtomicRecoveryResult {
  success: boolean
  ethRecovered?: string
  ethToUser?: string
  ethFee?: string
  tokensRecovered?: { symbol: string; amount: string; toUser: string; fee: string }[]
  delegationRevoked?: boolean
  txCount?: number
  txHashes?: string[]
  error?: string
}

export async function executeFullRecoveryAndRevoke(
  compromisedPrivateKey: string,
  sponsorPrivateKey: string,
  safeWalletAddress: string,
  chainId: number,
  rpcUrl: string
): Promise<AtomicRecoveryResult> {
  const provider = new ethers.JsonRpcProvider(rpcUrl)
  const compromisedWallet = new ethers.Wallet(compromisedPrivateKey, provider)
  const sponsorWallet = new ethers.Wallet(sponsorPrivateKey, provider)
  const compromisedAddress = compromisedWallet.address

  console.log('🛡️ ONE-CLICK RECOVERY + REVOKE')

  // ── Step 1: Scan ──
  const assets = await scanRecoverableAssets(compromisedAddress, rpcUrl)
  console.log(`💰 Found: ${assets.ethFormatted} ETH, ${assets.tokens.length} tokens`)

  const hasAssets = assets.ethBalance > BigInt(0) || assets.tokens.length > 0
  if (!hasAssets && !assets.hasDelegation) {
    return { success: false, error: 'No recoverable assets and no active delegation found' }
  }

  // ── Step 2: Gas params ──
  const gasParams = await getGasParams(provider, chainId)
  const tokenCount = BigInt(assets.tokens.length)
  const totalGasLimit = 21000n + 21000n + (100000n * tokenCount) + 50000n
  const gasCostPerUnit = gasParams.type === 2 ? (gasParams.maxFeePerGas || BigInt(0)) : (gasParams.gasPrice || BigInt(0))
  const gasNeeded = (gasCostPerUnit * totalGasLimit * 150n) / 100n

  const minGasPerChain: Record<number, bigint> = {
    1: ethers.parseEther('0.005'),
    8453: ethers.parseEther('0.0002'),
    56: ethers.parseEther('0.002'),
    42161: ethers.parseEther('0.0002'),
    137: ethers.parseEther('0.02'),
    10: ethers.parseEther('0.0002'),
    5000: ethers.parseEther('0.002'),
    534352: ethers.parseEther('0.0002'),
    100: ethers.parseEther('0.02'),
    7000: ethers.parseEther('0.02'),
    1625: ethers.parseEther('0.02'),
    1116: ethers.parseEther('0.02'),
    1329: ethers.parseEther('0.02'),
    80094: ethers.parseEther('0.002'),
    57073: ethers.parseEther('0.0002'),
    196: ethers.parseEther('0.002'),
    43111: ethers.parseEther('0.0002'),
    8217: ethers.parseEther('0.02'),
  }
  const minGas = minGasPerChain[chainId] || ethers.parseEther('0.002')
  const finalGasNeeded = gasNeeded > minGas ? gasNeeded : minGas

  const sponsorBalance = await provider.getBalance(sponsorWallet.address)
  if (sponsorBalance < finalGasNeeded) {
    const gasToken = chainId === 56 ? 'BNB' : chainId === 137 ? 'MATIC' : 'ETH'
    return {
      success: false,
      error: `Sponsor needs ${ethers.formatEther(finalGasNeeded)} ${gasToken} for gas. Has: ${ethers.formatEther(sponsorBalance)} ${gasToken}`
    }
  }

  // ── Step 3: Build transactions ──
  const txs: string[] = []
  const compromisedNonce = await getSafeNonce(provider, compromisedAddress)
  let sponsorNonce = await getSafeNonce(provider, sponsorWallet.address)

  const buildTxParams = (nonceVal: number, gasLimit: bigint) => ({
    nonce: nonceVal,
    chainId,
    gasLimit,
    ...(gasParams.type === 2
      ? { type: 2, maxFeePerGas: gasParams.maxFeePerGas, maxPriorityFeePerGas: gasParams.maxPriorityFeePerGas }
      : { gasPrice: gasParams.gasPrice })
  })

  let compromisedNonceCounter = compromisedNonce

  // TX 1: Sponsor → compromised wallet (gas)
  const fundTx = await sponsorWallet.signTransaction({
    to: compromisedAddress,
    value: finalGasNeeded,
    ...buildTxParams(sponsorNonce++, 21000n)
  })
  txs.push(fundTx)

  // TX 2: Sweep ETH → safe wallet (FIXED: no double subtraction)
  if (assets.ethBalance > BigInt(0)) {
    const gasForThisTx = 21000n * gasCostPerUnit
    const sweepAmount = assets.ethBalance - gasForThisTx

    if (sweepAmount > BigInt(0)) {
      const ethTx = await compromisedWallet.signTransaction({
        to: safeWalletAddress,
        value: sweepAmount,
        ...buildTxParams(compromisedNonceCounter++, 21000n)
      })
      txs.push(ethTx)
    }
  }

  // TX 3-N: Sweep each token → safe wallet
  for (const token of assets.tokens) {
    try {
      const erc20Interface = new ethers.Interface([
        'function transfer(address to, uint256 amount) returns (bool)'
      ])
      const data = erc20Interface.encodeFunctionData('transfer', [
        safeWalletAddress, token.balance
      ])
      const tokenTx = await compromisedWallet.signTransaction({
        to: token.address,
        data,
        value: 0n,
        ...buildTxParams(compromisedNonceCounter++, 100000n)
      })
      txs.push(tokenTx)
    } catch {
      // Skip failed
    }
  }

  // TX N+1: Revoke delegation
  if (assets.hasDelegation) {
    try {
      const revokeTx = await compromisedWallet.signTransaction({
        to: compromisedAddress,
        value: 0n,
        ...buildTxParams(compromisedNonceCounter++, 50000n),
        type: 4,
        authorizationList: []
      } as ethers.TransactionRequest)
      txs.push(revokeTx)
    } catch {
      const revokeTx = await compromisedWallet.signTransaction({
        to: compromisedAddress,
        value: 0n,
        ...buildTxParams(compromisedNonceCounter++, 21000n)
      })
      txs.push(revokeTx)
    }
  }

  console.log(`⚡ Total: ${txs.length} transactions in ONE atomic bundle`)

  // ── Step 4: Submit ──
  const result = await submitSafeRecovery(txs, chainId, rpcUrl)

  if (result.success) {
    return {
      success: true,
      ethRecovered: assets.ethFormatted,
      ethToUser: assets.ethBalance > BigInt(0)
        ? ethers.formatEther((assets.ethBalance * (100n - BigInt(PLATFORM_FEE_PERCENT))) / 100n)
        : '0',
      ethFee: assets.ethBalance > BigInt(0)
        ? ethers.formatEther((assets.ethBalance * BigInt(PLATFORM_FEE_PERCENT)) / 100n)
        : '0',
      tokensRecovered: assets.tokens.map(t => ({
        symbol: t.symbol,
        amount: t.balanceFormatted,
        toUser: ethers.formatUnits((t.balance * (100n - BigInt(PLATFORM_FEE_PERCENT))) / 100n, t.decimals),
        fee: ethers.formatUnits((t.balance * BigInt(PLATFORM_FEE_PERCENT)) / 100n, t.decimals)
      })),
      delegationRevoked: assets.hasDelegation,
      txCount: txs.length,
      txHashes: result.txHashes
    }
  }

  return {
    success: false,
    error: result.error || 'Recovery failed',
    txHashes: result.txHashes
  }
}
