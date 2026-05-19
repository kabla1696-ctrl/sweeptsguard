import { ethers } from 'ethers'

// ============================================================
// FUND RECOVERY TOOL
// Recover funds from EIP-7702 compromised wallets
// Strategy: Flashbots atomic bundle — sweep + revoke before drainer bot reacts
// ============================================================

export interface RecoveryConfig {
  compromisedWalletPrivateKey: string  // The hacked wallet's private key
  safeWalletAddress: string            // Where to send recovered funds
  chainId: number
  rpcUrl: string
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
    ? '0x' + code.slice(8) // ef0100 + 20 byte address
    : null

  // Scan for ERC-20 tokens (common ones + check via events)
  const tokens: TokenBalance[] = []

  // Common token contracts to check
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

  return {
    ethBalance,
    ethFormatted,
    tokens,
    hasDelegation,
    delegatedTo
  }
}

// ============================================================
// STEP 2: Create recovery transactions
// ============================================================
export async function createRecoveryTransactions(
  config: RecoveryConfig
): Promise<{
  success: boolean
  transactions: string[] // Signed transactions
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
    const feeData = await provider.getFeeData()
    const gasPrice = feeData.gasPrice || feeData.maxFeePerGas || BigInt(0)
    let nonce = await provider.getTransactionCount(walletAddress)

    // TX 1: Sweep ETH to safe wallet
    if (assets.ethBalance > BigInt(0)) {
      const gasLimit = 21000n
      const gasCost = gasLimit * gasPrice
      const sweepAmount = assets.ethBalance - gasCost - ethers.parseEther('0.001') // Keep small buffer

      if (sweepAmount > BigInt(0)) {
        const ethTx = await wallet.signTransaction({
          to: config.safeWalletAddress,
          value: sweepAmount,
          gasLimit,
          gasPrice,
          nonce: nonce++,
          chainId: config.chainId
        })
        signedTxs.push(ethTx)
      }
    }

    // TX 2-N: Sweep each token
    for (const token of assets.tokens) {
      try {
        const erc20Interface = new ethers.Interface([
          'function transfer(address to, uint256 amount) returns (bool)'
        ])
        const data = erc20Interface.encodeFunctionData('transfer', [
          config.safeWalletAddress,
          token.balance
        ])

        const tokenTx = await wallet.signTransaction({
          to: token.address,
          data,
          value: 0n,
          gasLimit: 100000n,
          gasPrice,
          nonce: nonce++,
          chainId: config.chainId
        })
        signedTxs.push(tokenTx)
      } catch {
        // Skip failed token sweeps
      }
    }

    // Final TX: Revoke EIP-7702 delegation (if exists)
    if (assets.hasDelegation) {
      try {
        // EIP-7702 type-4 transaction to revoke delegation
        // Send delegation list with empty delegate (revokes)
        const revokeTx = await wallet.signTransaction({
          to: walletAddress, // Self
          value: 0n,
          gasLimit: 50000n,
          gasPrice,
          nonce: nonce++,
          chainId: config.chainId,
          type: 4, // EIP-7702 type
          // Authorization list with empty delegate = revoke
          authorizationList: []
        } as ethers.TransactionRequest)
        signedTxs.push(revokeTx)
      } catch {
        // If type-4 not supported, try regular self-tx
        const revokeTx = await wallet.signTransaction({
          to: walletAddress,
          value: 0n,
          gasLimit: 21000n,
          gasPrice,
          nonce: nonce++,
          chainId: config.chainId
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
// STEP 3: Submit via Flashbots (private mempool)
// ============================================================
export async function submitRecoveryBundle(
  signedTxs: string[],
  chainId: number,
  rpcUrl: string
): Promise<{ success: boolean; bundleHash?: string; blockNumber?: number; error?: string }> {
  const provider = new ethers.JsonRpcProvider(rpcUrl)
  const currentBlock = await provider.getBlockNumber()
  const targetBlock = currentBlock + 1

  // Flashbots relay
  const relayUrl = chainId === 11155111
    ? 'https://relay-sepolia.flashbots.net'
    : 'https://relay.flashbots.net'

  // Auth signer
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
// STEP 4: Fallback — submit directly (if Flashbots fails)
// ============================================================
export async function submitDirectRecovery(
  signedTxs: string[],
  rpcUrl: string
): Promise<{ success: boolean; txHashes?: string[]; error?: string }> {
  const provider = new ethers.JsonRpcProvider(rpcUrl)
  const txHashes: string[] = []

  try {
    for (const signedTx of signedTxs) {
      const tx = await provider.broadcastTransaction(signedTx)
      txHashes.push(tx.hash)
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    return { success: true, txHashes }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Direct submission failed'
    return { success: false, txHashes, error: errorMessage }
  }
}

// Create provider with fallback RPCs
function getProvider(rpcUrl: string, chainId: number): ethers.JsonRpcProvider {
  const fallbacks: Record<number, string> = {
    1: 'https://eth.drpc.org',
    8453: 'https://base.drpc.org',
    56: 'https://bsc.drpc.org',
    42161: 'https://arbitrum.drpc.org',
    137: 'https://polygon.drpc.org',
    10: 'https://optimism.drpc.org'
  }
  return new ethers.JsonRpcProvider(rpcUrl || fallbacks[chainId] || fallbacks[1])
}

// ============================================================
// FULL RECOVERY: Scan → Create → Submit
// ============================================================
export async function executeFullRecovery(
  config: RecoveryConfig
): Promise<RecoveryResult> {
  console.log('🔍 Scanning recoverable assets...')

  const wallet = new ethers.Wallet(config.compromisedWalletPrivateKey)
  const assets = await scanRecoverableAssets(wallet.address, config.rpcUrl)

  console.log(`💰 Found: ${assets.ethFormatted} ETH, ${assets.tokens.length} tokens`)
  if (assets.hasDelegation) {
    console.log(`⚠️ Delegation active to: ${assets.delegatedTo}`)
  }

  if (assets.ethBalance === BigInt(0) && assets.tokens.length === 0) {
    return {
      success: false,
      error: 'No recoverable assets found in wallet'
    }
  }

  console.log('📝 Creating recovery transactions...')
  const txResult = await createRecoveryTransactions(config)

  if (!txResult.success || txResult.transactions.length === 0) {
    return {
      success: false,
      error: txResult.error || 'No transactions to submit'
    }
  }

  console.log(`⚡ Created ${txResult.transactions.length} transactions`)

  // Try Flashbots first (private mempool — drainer can't see)
  console.log('🚀 Submitting via Flashbots (private)...')
  let result = await submitRecoveryBundle(
    txResult.transactions,
    config.chainId,
    config.rpcUrl
  )

  if (result.success) {
    return {
      success: true,
      ethRecovered: assets.ethFormatted,
      tokensRecovered: assets.tokens.map(t => ({
        symbol: t.symbol,
        amount: t.balanceFormatted,
        txHash: 'bundle'
      })),
      delegationRevoked: assets.hasDelegation,
      txHashes: result.bundleHash ? [result.bundleHash] : []
    }
  }

  // Fallback: direct submission
  console.log('⚠️ Flashbots failed, trying direct submission...')
  console.log('🏃 RACE MODE — submitting before drainer bot reacts!')

  const directResult = await submitDirectRecovery(
    txResult.transactions,
    config.rpcUrl
  )

  if (directResult.success) {
    return {
      success: true,
      ethRecovered: assets.ethFormatted,
      tokensRecovered: assets.tokens.map((t, i) => ({
        symbol: t.symbol,
        amount: t.balanceFormatted,
        txHash: directResult.txHashes?.[i + 1] || ''
      })),
      delegationRevoked: assets.hasDelegation,
      txHashes: directResult.txHashes
    }
  }

  return {
    success: false,
    error: `Both methods failed. Flashbots: ${result.error}. Direct: ${directResult.error}`,
    txHashes: directResult.txHashes
  }
}

// ============================================================
// REVOKE DELEGATION ONLY: For wallets with 0 balance but active delegation
// Uses sponsor wallet to fund gas, then revokes in same atomic bundle
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
  console.log(`💰 Sponsor: ${sponsorWallet.address}`)

  // Check delegation
  const code = await provider.getCode(compromisedAddress)
  if (!code.startsWith('0xef0100')) {
    return { success: true, delegationRevoked: false, error: 'No delegation found on this chain' }
  }

  const delegatedTo = '0x' + code.slice(8)
  console.log(`⚠️ Delegation active to: ${delegatedTo}`)

  // Get gas price
  const feeData = await provider.getFeeData()
  const gasPrice = feeData.gasPrice || feeData.maxFeePerGas || ethers.parseUnits('30', 'gwei')

  // Gas needed: ~21000 for fund transfer + ~50000 for revoke + 20% buffer
  const gasLimit = 71000n // 21000 + 50000
  const gasNeeded = (gasPrice * gasLimit * 120n) / 100n // 20% buffer
  
  // Minimum gas per chain (in wei) - fallback if calculation is too low
  const minGasPerChain: Record<number, bigint> = {
    1: ethers.parseEther('0.003'),      // ETH mainnet - expensive
    8453: ethers.parseEther('0.0001'),   // Base - very cheap
    56: ethers.parseEther('0.001'),      // BSC
    42161: ethers.parseEther('0.0001'),  // Arbitrum - cheap
    137: ethers.parseEther('0.01'),      // Polygon - high gas
    10: ethers.parseEther('0.0001'),     // Optimism - cheap
    5000: ethers.parseEther('0.001'),    // Mantle
    534352: ethers.parseEther('0.0001'), // Scroll
    100: ethers.parseEther('0.01'),      // Gnosis
    7000: ethers.parseEther('0.01'),     // ZetaChain
    1625: ethers.parseEther('0.01'),     // Gravity
    1116: ethers.parseEther('0.01'),     // Core
    1329: ethers.parseEther('0.01'),     // Sei
    80094: ethers.parseEther('0.001'),   // Berachain
    57073: ethers.parseEther('0.0001'),  // Ink
    196: ethers.parseEther('0.001'),     // XLayer
    43111: ethers.parseEther('0.0001'),  // Hemi
    8217: ethers.parseEther('0.01'),     // Kaia
  }
  
  const minGas = minGasPerChain[chainId] || ethers.parseEther('0.001')
  const finalGasNeeded = gasNeeded > minGas ? gasNeeded : minGas

  // Get sponsor balance
  const sponsorBalance = await provider.getBalance(sponsorWallet.address)
  if (sponsorBalance < finalGasNeeded) {
    return {
      success: false,
      error: `Sponsor needs ${ethers.formatEther(finalGasNeeded)} ${gasToken} for gas. Current: ${ethers.formatEther(sponsorBalance)} ${gasToken}`
    }
  }

  const compromisedNonce = await provider.getTransactionCount(compromisedAddress)
  const sponsorNonce = await provider.getTransactionCount(sponsorWallet.address)

  // TX 1 (from sponsor): Send gas token to compromised wallet
  const fundTx = await sponsorWallet.signTransaction({
    to: compromisedAddress,
    value: finalGasNeeded,
    gasLimit: 21000n,
    gasPrice,
    nonce: sponsorNonce,
    chainId
  })

  // TX 2 (from compromised): Revoke delegation via self-tx
  // Try EIP-7702 type-4 tx first, fallback to regular self-tx
  let revokeTx: string
  try {
    revokeTx = await compromisedWallet.signTransaction({
      to: compromisedAddress, // Self
      value: 0n,
      gasLimit: 50000n,
      gasPrice,
      nonce: compromisedNonce,
      chainId,
      type: 4, // EIP-7702 type
      authorizationList: [] // Empty auth list = revoke
    } as ethers.TransactionRequest)
  } catch {
    // Fallback: regular self-tx clears delegation too
    revokeTx = await compromisedWallet.signTransaction({
      to: compromisedAddress,
      value: 0n,
      gasLimit: 21000n,
      gasPrice,
      nonce: compromisedNonce,
      chainId
    })
  }

  // Submit as Flashbots atomic bundle
  // Both txs execute in SAME block — drainer can't intercept
  console.log('🚀 Submitting revoke via Flashbots atomic bundle...')
  const bundleResult = await submitRecoveryBundle(
    [fundTx, revokeTx],
    chainId,
    rpcUrl
  )

  if (bundleResult.success) {
    console.log('✅ Delegation revoked via Flashbots!')
    return {
      success: true,
      delegationRevoked: true,
      txHashes: bundleResult.bundleHash ? [bundleResult.bundleHash] : []
    }
  }

  // Fallback: direct submission (sequential — small risk window)
  console.log('⚠️ Flashbots failed, trying direct...')
  const directResult = await submitDirectRecovery([fundTx, revokeTx], rpcUrl)

  if (directResult.success) {
    return {
      success: true,
      delegationRevoked: true,
      txHashes: directResult.txHashes
    }
  }

  return {
    success: false,
    error: `Revoke failed. Flashbots: ${bundleResult.error}. Direct: ${directResult.error}`
  }
}
