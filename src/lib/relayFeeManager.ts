/**
 * Relay Fee Manager for SweepGuard
 *
 * Calculates transparent relay fees for gasless claiming.
 * Fee = gas cost + 10% markup
 * Payment options: deduct from claim, USDC, or free tier
 */

import { ethers } from 'ethers'
import { CHAINS } from './chains'

// ============================================================
// Fee Configuration
// ============================================================

const RELAY_MARKUP_PERCENT = 10 // 10% markup on gas cost
const FREE_TIER_MAX_GAS = ethers.parseEther('0.001') // Free if gas < 0.001 ETH equivalent
const MIN_FEE_USD = 0.01 // Minimum fee in USD

// Approximate native token prices in USD (for fee display)
// Updated periodically; used for display purposes only
const TOKEN_PRICES_USD: Record<string, number> = {
  ETH: 3500,
  MATIC: 0.7,
  BNB: 600,
  AVAX: 35,
  FTM: 0.4,
  CRO: 0.08,
  MNT: 1.2,
  xDai: 1,
  ZETA: 1.5,
  G: 0.03,
  CORE: 1.5,
  SEI: 0.5,
  BERA: 8,
  OKB: 50,
  KAIA: 0.15,
  MON: 0.1,
  '0G': 1,
}

// ============================================================
// Types
// ============================================================

export type FeePaymentMethod = 'deduct' | 'usdc' | 'free'

export interface RelayFeeEstimate {
  /** Gas cost in native token (wei) */
  gasCostWei: string
  /** Gas cost in native token (human-readable) */
  gasCostFormatted: string
  /** Markup amount in native token (wei) */
  markupWei: string
  /** Markup amount in native token (human-readable) */
  markupFormatted: string
  /** Total fee in native token (wei) */
  totalFeeWei: string
  /** Total fee in native token (human-readable) */
  totalFeeFormatted: string
  /** Approximate fee in USD */
  feeUsd: number
  /** Native token symbol */
  nativeToken: string
  /** Whether this qualifies for free tier */
  isFreeTier: boolean
  /** Recommended payment method */
  recommendedPayment: FeePaymentMethod
  /** Fee breakdown for transparency */
  breakdown: {
    baseGas: string
    markup: string
    total: string
    markupPercent: number
  }
}

export interface FeePaymentOption {
  method: FeePaymentMethod
  label: string
  description: string
  amount: string
  amountUsd: number
  available: boolean
  recommended: boolean
}

// ============================================================
// Gas Price Fetching
// ============================================================

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

const GAS_TOKENS: Record<number, string> = {
  1: 'ETH', 8453: 'ETH', 42161: 'ETH', 137: 'MATIC', 56: 'BNB',
  10: 'ETH', 43114: 'AVAX', 250: 'FTM', 81457: 'ETH',
  324: 'ETH', 59144: 'ETH', 5000: 'MNT', 534352: 'ETH',
  80094: 'BERA', 1329: 'SEI',
}

/**
 * Fetch current gas price for a chain.
 * Falls back to a reasonable default if RPC fails.
 */
async function fetchGasPrice(chainId: number): Promise<bigint> {
  const rpcUrl = RPC_URLS[chainId]
  if (!rpcUrl) {
    return ethers.parseUnits('20', 'gwei') // Default fallback
  }

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const feeData = await provider.getFeeData()
    return feeData.maxFeePerGas || feeData.gasPrice || ethers.parseUnits('20', 'gwei')
  } catch {
    return ethers.parseUnits('20', 'gwei')
  }
}

// ============================================================
// Fee Calculation
// ============================================================

/**
 * Calculate the relay fee for a gasless transaction.
 *
 * Formula: fee = gasEstimate × gasPrice × (1 + markup%)
 *
 * @param chainId - The chain ID
 * @param gasEstimate - Estimated gas units (default: 250,000)
 * @returns Detailed fee estimate
 */
export async function calculateRelayFee(
  chainId: number,
  gasEstimate: bigint = 250000n
): Promise<RelayFeeEstimate> {
  const gasPrice = await fetchGasPrice(chainId)
  const nativeToken = GAS_TOKENS[chainId] || 'ETH'
  const tokenPrice = TOKEN_PRICES_USD[nativeToken] || 3500

  // Base gas cost
  const gasCost = gasEstimate * gasPrice

  // Markup (10%)
  const markup = gasCost * BigInt(RELAY_MARKUP_PERCENT) / 100n

  // Total fee
  const totalFee = gasCost + markup

  // Check free tier (gas cost < threshold)
  const isFreeTier = gasCost < FREE_TIER_MAX_GAS

  // USD approximation
  const feeUsd = parseFloat(ethers.formatEther(totalFee)) * tokenPrice

  // Format helper
  const format = (wei: bigint) => {
    const formatted = ethers.formatEther(wei)
    const num = parseFloat(formatted)
    if (num < 0.0001) return '< 0.0001'
    return num.toFixed(6)
  }

  return {
    gasCostWei: gasCost.toString(),
    gasCostFormatted: `${format(gasCost)} ${nativeToken}`,
    markupWei: markup.toString(),
    markupFormatted: `${format(markup)} ${nativeToken}`,
    totalFeeWei: isFreeTier ? '0' : totalFee.toString(),
    totalFeeFormatted: isFreeTier ? 'FREE' : `${format(totalFee)} ${nativeToken}`,
    feeUsd: isFreeTier ? 0 : Math.max(feeUsd, MIN_FEE_USD),
    nativeToken,
    isFreeTier,
    recommendedPayment: isFreeTier ? 'free' : 'deduct',
    breakdown: {
      baseGas: `${format(gasCost)} ${nativeToken}`,
      markup: `${format(markup)} ${nativeToken} (${RELAY_MARKUP_PERCENT}%)`,
      total: isFreeTier ? 'FREE' : `${format(totalFee)} ${nativeToken}`,
      markupPercent: RELAY_MARKUP_PERCENT,
    },
  }
}

// ============================================================
// Fee Payment Options
// ============================================================

/**
 * Get available fee payment options for a claim.
 */
export async function getFeePaymentOptions(
  chainId: number,
  claimAmountWei: string,
  tokenDecimals: number = 18
): Promise<FeePaymentOption[]> {
  const fee = await calculateRelayFee(chainId)
  const claimAmount = BigInt(claimAmountWei)

  // Calculate fee as token amount (if deducting from claim)
  // We need the token/native exchange rate for this
  // For simplicity, use the gas cost in native token as the fee
  const feeWei = BigInt(fee.totalFeeWei)

  // Check if claim amount covers the fee
  const claimCoversFee = claimAmount > feeWei

  const options: FeePaymentOption[] = []

  // Option 1: Deduct from claimed tokens
  options.push({
    method: 'deduct',
    label: 'Deduct from Claim',
    description: `Fee (${fee.totalFeeFormatted}) deducted from your claimed tokens`,
    amount: fee.totalFeeFormatted,
    amountUsd: fee.feeUsd,
    available: claimCoversFee,
    recommended: claimCoversFee && !fee.isFreeTier,
  })

  // Option 2: Pay via USDC
  options.push({
    method: 'usdc',
    label: 'Pay with USDC',
    description: `Pay ${fee.feeUsd.toFixed(4)} USDC from your wallet`,
    amount: `$${fee.feeUsd.toFixed(4)} USDC`,
    amountUsd: fee.feeUsd,
    available: true, // Always available if user has USDC
    recommended: false,
  })

  // Option 3: Free tier
  if (fee.isFreeTier) {
    options.push({
      method: 'free',
      label: 'FREE',
      description: 'Gas cost is low enough — relay is free!',
      amount: 'FREE',
      amountUsd: 0,
      available: true,
      recommended: true,
    })
  }

  return options
}

// ============================================================
// Fee Transparency
// ============================================================

/**
 * Generate a human-readable fee summary for display to the user.
 */
export async function getFeeSummary(chainId: number): Promise<{
  title: string
  lines: string[]
  total: string
  warning?: string
}> {
  const fee = await calculateRelayFee(chainId)

  const lines: string[] = [
    `Base gas cost: ${fee.breakdown.baseGas}`,
    `Relay markup: ${fee.breakdown.markup}`,
    `─────────────────`,
    `Total: ${fee.breakdown.total}`,
  ]

  if (fee.feeUsd > 0) {
    lines.push(`≈ $${fee.feeUsd.toFixed(4)} USD`)
  }

  if (fee.isFreeTier) {
    lines.push(`🎉 This claim qualifies for FREE relay!`)
  }

  return {
    title: `Relay Fee (${fee.nativeToken})`,
    lines,
    total: fee.totalFeeFormatted,
    warning: fee.feeUsd > 1
      ? `⚠️ High gas cost on this chain. Consider waiting for lower gas prices.`
      : undefined,
  }
}
