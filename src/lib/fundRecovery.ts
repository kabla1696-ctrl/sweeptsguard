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
