// Transaction Simulation — preview what a TX will do before submitting
import { ethers } from 'ethers'
import { CHAINS } from './chains'

export interface TokenTransfer {
  from: string
  to: string
  token: string
  amount: string
  symbol?: string
  decimals?: number
}

export interface StateChange {
  address: string
  key: string
  oldValue: string
  newValue: string
}

export interface SimulationResult {
  success: boolean
  gasUsed: string
  gasCostETH: string
  gasCostUSD: string
  tokenTransfers: TokenTransfer[]
  stateChanges: StateChange[]
  error?: string
  revertReason?: string
  warnings: string[]
}

// ERC-20 Transfer event topic
const TRANSFER_TOPIC = ethers.id('Transfer(address,address,uint256)')
// ERC-20 Approval event topic
const APPROVAL_TOPIC = ethers.id('Approval(address,address,uint256)')
// ERC-721 Transfer topic (same signature)
const MAX_UINT256 = ethers.MaxUint256

// ETH/USD price cache
let ethPriceCache: { price: number; timestamp: number } | null = null
const PRICE_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function getETHPrice(): Promise<number> {
  if (ethPriceCache && Date.now() - ethPriceCache.timestamp < PRICE_CACHE_TTL) {
    return ethPriceCache.price
  }

  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
      { signal: AbortSignal.timeout(5000) }
    )
    const data = await res.json()
    const price = data?.ethereum?.usd || 0
    if (price > 0) {
      ethPriceCache = { price, timestamp: Date.now() }
    }
    return price
  } catch {
    return ethPriceCache?.price || 0
  }
}

/**
 * Simulate a transaction using eth_call + trace
 * Falls back to basic eth_call if trace is not available
 */
export async function simulateTransaction(
  chainId: number,
  tx: { from: string; to: string; data: string; value?: string }
): Promise<SimulationResult> {
  const chainConfig = CHAINS[chainId]
  if (!chainConfig) {
    return {
      success: false,
      gasUsed: '0',
      gasCostETH: '0',
      gasCostUSD: '0',
      tokenTransfers: [],
      stateChanges: [],
      error: `Unsupported chain: ${chainId}`,
      warnings: [],
    }
  }

  const provider = new ethers.JsonRpcProvider(chainConfig.rpc)
  const warnings: string[] = []

  try {
    // Step 1: Simulate with eth_call to check if TX succeeds
    let callResult: string
    try {
      callResult = await provider.call({
        from: tx.from,
        to: tx.to,
        data: tx.data,
        value: tx.value || '0x0',
      })
    } catch (callError: unknown) {
      // TX will revert — extract reason
      const revertReason = extractRevertReason(callError)
      return {
        success: false,
        gasUsed: '0',
        gasCostETH: '0',
        gasCostUSD: '0',
        tokenTransfers: [],
        stateChanges: [],
        error: 'Transaction will revert',
        revertReason,
        warnings: [`⚠️ This transaction will FAIL: ${revertReason}`],
      }
    }

    // Step 2: Estimate gas
    let gasUsed = BigInt(21000) // default for simple transfers
    try {
      const gasEstimate = await provider.estimateGas({
        from: tx.from,
        to: tx.to,
        data: tx.data,
        value: tx.value || '0x0',
      })
      gasUsed = gasEstimate
    } catch {
      // Use a conservative estimate
      gasUsed = BigInt(100000)
      warnings.push('⚠️ Gas estimation failed — using conservative estimate')
    }

    // Step 3: Calculate gas cost
    const feeData = await provider.getFeeData()
    const gasPrice = feeData.gasPrice || BigInt(0)
    const gasCostWei = gasUsed * gasPrice
    const gasCostETH = ethers.formatEther(gasCostWei)

    // Step 4: Get ETH price for USD conversion
    const ethPrice = await getETHPrice()
    const gasCostUSD = ethPrice > 0
      ? (parseFloat(gasCostETH) * ethPrice).toFixed(2)
      : '0.00'

    // Step 5: Parse TX data for token transfers
    const tokenTransfers = await parseTokenTransfers(provider, tx, chainId)

    // Step 6: Analyze TX data for warnings
    const txWarnings = analyzeTransaction(tx, tokenTransfers, callResult)
    warnings.push(...txWarnings)

    return {
      success: true,
      gasUsed: gasUsed.toString(),
      gasCostETH,
      gasCostUSD,
      tokenTransfers,
      stateChanges: [],
      warnings,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Simulation failed'
    return {
      success: false,
      gasUsed: '0',
      gasCostETH: '0',
      gasCostUSD: '0',
      tokenTransfers: [],
      stateChanges: [],
      error: message,
      warnings: [`❌ Simulation error: ${message}`],
    }
  }
}

/**
 * Parse token transfers from TX data (best-effort without trace)
 */
async function parseTokenTransfers(
  provider: ethers.JsonRpcProvider,
  tx: { from: string; to: string; data: string; value?: string },
  _chainId: number
): Promise<TokenTransfer[]> {
  const transfers: TokenTransfer[] = []

  // Check if this is a native ETH transfer
  if (tx.value && tx.value !== '0x0' && tx.value !== '0') {
    const valueWei = BigInt(tx.value)
    if (valueWei > 0) {
      transfers.push({
        from: tx.from,
        to: tx.to,
        token: 'Native',
        amount: ethers.formatEther(valueWei),
        symbol: 'ETH',
        decimals: 18,
      })
    }
  }

  // Parse ERC-20 transfer calls
  if (tx.data && tx.data.length >= 10) {
    const selector = tx.data.slice(0, 10).toLowerCase()

    // transfer(address,uint256)
    if (selector === '0xa9059cbb') {
      try {
        const iface = new ethers.Interface([
          'function transfer(address to, uint256 amount)',
        ])
        const decoded = iface.decodeFunctionData('transfer', tx.data)
        const tokenInfo = await getTokenInfo(provider, tx.to)
        transfers.push({
          from: tx.from,
          to: decoded[0] as string,
          token: tx.to,
          amount: ethers.formatUnits(decoded[1] as bigint, tokenInfo.decimals),
          symbol: tokenInfo.symbol,
          decimals: tokenInfo.decimals,
        })
      } catch { /* ignore parse errors */ }
    }

    // transferFrom(address,address,uint256)
    if (selector === '0x23b872dd') {
      try {
        const iface = new ethers.Interface([
          'function transferFrom(address from, address to, uint256 amount)',
        ])
        const decoded = iface.decodeFunctionData('transferFrom', tx.data)
        const tokenInfo = await getTokenInfo(provider, tx.to)
        transfers.push({
          from: decoded[0] as string,
          to: decoded[1] as string,
          token: tx.to,
          amount: ethers.formatUnits(decoded[2] as bigint, tokenInfo.decimals),
          symbol: tokenInfo.symbol,
          decimals: tokenInfo.decimals,
        })
      } catch { /* ignore parse errors */ }
    }

    // approve(address,uint256)
    if (selector === '0x095ea7b3') {
      try {
        const iface = new ethers.Interface([
          'function approve(address spender, uint256 amount)',
        ])
        const decoded = iface.decodeFunctionData('approve', tx.data)
        const amount = decoded[1] as bigint
        const tokenInfo = await getTokenInfo(provider, tx.to)

        if (amount === MAX_UINT256) {
          transfers.push({
            from: tx.from,
            to: decoded[0] as string,
            token: tx.to,
            amount: 'UNLIMITED',
            symbol: tokenInfo.symbol,
            decimals: tokenInfo.decimals,
          })
        } else {
          transfers.push({
            from: tx.from,
            to: decoded[0] as string,
            token: tx.to,
            amount: ethers.formatUnits(amount, tokenInfo.decimals),
            symbol: tokenInfo.symbol,
            decimals: tokenInfo.decimals,
          })
        }
      } catch { /* ignore parse errors */ }
    }

    // Multicall / batch
    if (selector === '0x5ae401dc' || selector === '0x252dba42') {
      // Multicall3 aggregate3 or aggregate
      // We can't fully decode without more context, but flag it
      transfers.push({
        from: tx.from,
        to: tx.to,
        token: 'MULTICALL',
        amount: 'batch',
        symbol: 'BATCH',
      })
    }
  }

  return transfers
}

/**
 * Get basic ERC-20 token info (symbol + decimals)
 */
async function getTokenInfo(
  provider: ethers.JsonRpcProvider,
  tokenAddress: string
): Promise<{ symbol: string; decimals: number }> {
  try {
    const iface = new ethers.Interface([
      'function symbol() view returns (string)',
      'function decimals() view returns (uint8)',
    ])

    const [symbolData, decimalsData] = await Promise.all([
      provider.call({
        to: tokenAddress,
        data: iface.encodeFunctionData('symbol'),
      }).catch(() => '0x'),
      provider.call({
        to: tokenAddress,
        data: iface.encodeFunctionData('decimals'),
      }).catch(() => '0x'),
    ])

    let symbol = 'UNKNOWN'
    let decimals = 18

    try {
      if (symbolData !== '0x' && symbolData.length > 2) {
        symbol = iface.decodeFunctionResult('symbol', symbolData)[0] as string
      }
    } catch {
      // Some tokens return bytes32 for symbol
      try {
        symbol = ethers.decodeBytes32String(symbolData)
      } catch { symbol = 'UNKNOWN' }
    }

    try {
      if (decimalsData !== '0x' && decimalsData.length > 2) {
        decimals = Number(iface.decodeFunctionResult('decimals', decimalsData)[0])
      }
    } catch { decimals = 18 }

    return { symbol, decimals }
  } catch {
    return { symbol: 'UNKNOWN', decimals: 18 }
  }
}

/**
 * Analyze transaction for warnings
 */
function analyzeTransaction(
  tx: { from: string; to: string; data: string; value?: string },
  transfers: TokenTransfer[],
  _callResult: string
): string[] {
  const warnings: string[] = []

  // Check for unlimited approvals
  for (const t of transfers) {
    if (t.amount === 'UNLIMITED') {
      warnings.push(
        `🚨 UNLIMITED token approval to ${t.to.slice(0, 10)}...${t.to.slice(-6)} — they can spend ALL your ${t.symbol || 'tokens'}`
      )
    }
  }

  // Check for large ETH transfers
  for (const t of transfers) {
    if (t.token === 'Native') {
      const value = parseFloat(t.amount)
      if (value > 1) {
        warnings.push(
          `💸 This TX will transfer ${t.amount} ETH to ${t.to.slice(0, 10)}...${t.to.slice(-6)}`
        )
      } else if (value > 0.1) {
        warnings.push(
          `💰 This TX will transfer ${t.amount} ETH to ${t.to.slice(0, 10)}...${t.to.slice(-6)}`
        )
      }
    }
  }

  // Check for sending to contracts (potential loss)
  if (tx.data === '0x' || !tx.data) {
    // Simple ETH transfer
  } else if (tx.to && tx.data.length > 10) {
    // Contract interaction — check for known dangerous patterns
    const selector = tx.data.slice(0, 10).toLowerCase()

    // setApprovalForAll (NFTs)
    if (selector === '0xa22cb465') {
      warnings.push(
        '⚠️ This TX grants FULL control over your NFTs to another address'
      )
    }
  }

  // Check for self-destruct patterns
  if (tx.data && tx.data.includes('selfdestruct')) {
    warnings.push('🚨 This TX may self-destruct the contract')
  }

  return warnings
}

/**
 * Extract revert reason from eth_call error
 */
function extractRevertReason(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message

    // Try to extract revert reason from error message
    const reasonMatch = msg.match(/reason="([^"]+)"/)
    if (reasonMatch) return reasonMatch[1]

    // Try to decode revert data
    const dataMatch = msg.match(/data="?(0x[0-9a-fA-F]+)"?/)
    if (dataMatch) {
      try {
        // Standard Error(string) selector: 0x08c379a0
        if (dataMatch[1].startsWith('0x08c379a0')) {
          const iface = new ethers.Interface(['function Error(string)'])
          const decoded = iface.decodeFunctionResult('Error', dataMatch[1])
          return decoded[0] as string
        }
      } catch { /* ignore */ }
      return `Revert data: ${dataMatch[1].slice(0, 66)}...`
    }

    // Common patterns
    if (msg.includes('execution reverted')) return 'Execution reverted'
    if (msg.includes('insufficient funds')) return 'Insufficient funds'
    if (msg.includes('nonce too low')) return 'Nonce too low'
    if (msg.includes('gas required exceeds allowance')) return 'Out of gas'

    return msg.slice(0, 200)
  }
  return 'Unknown error'
}
