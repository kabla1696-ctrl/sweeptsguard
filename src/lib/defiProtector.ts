// DeFi Position Protector — Health factor monitoring, liquidation alerts, auto-repay
import { ethers } from 'ethers'
import { CHAINS } from './chains'

export interface DeFiPosition {
  id: string
  protocol: 'aave' | 'compound' | 'maker' | 'morpho' | 'spark'
  protocolDisplayName: string
  chainId: number
  chainName: string
  healthFactor: number
  suppliedAssets: SuppliedAsset[]
  borrowedAssets: BorrowedAsset[]
  liquidationPrice: number
  liquidationThreshold: number
  netAPY: number
  collateralValue: number
  borrowValue: number
  lastUpdated: string
}

export interface SuppliedAsset {
  symbol: string
  amount: number
  valueUSD: number
  apy: number
  icon: string
}

export interface BorrowedAsset {
  symbol: string
  amount: number
  valueUSD: number
  apy: number
  icon: string
}

export interface LiquidationAlert {
  id: string
  positionId: string
  protocol: string
  chainName: string
  healthFactor: number
  threshold: number
  status: 'active' | 'triggered' | 'resolved'
  createdAt: string
  triggeredAt?: string
}

export interface AutoRepayConfig {
  id: string
  positionId: string
  enabled: boolean
  targetHealthFactor: number // trigger when health factor drops below this
  repayAsset: string
  maxRepayAmount: number
  source: 'wallet' | 'yield' | 'reserve'
  createdAt: string
}

export interface YieldSuggestion {
  protocol: string
  chain: string
  asset: string
  currentAPY: number
  suggestedAPY: number
  improvement: string
  risk: 'low' | 'medium' | 'high'
  description: string
}

// Simulated DeFi positions for demo
function getSimulatedPositions(address: string): DeFiPosition[] {
  // Generate deterministic-ish data from address
  const seed = parseInt(address.slice(2, 10), 16)
  const rng = (n: number) => ((seed * 9301 + 49297 + n * 233) % 233280) / 233280

  const positions: DeFiPosition[] = []

  // Aave position
  const aaveHF = 1.2 + rng(1) * 3
  positions.push({
    id: `aave_${address.slice(0, 10)}`,
    protocol: 'aave',
    protocolDisplayName: 'Aave V3',
    chainId: 1,
    chainName: 'Ethereum',
    healthFactor: parseFloat(aaveHF.toFixed(3)),
    suppliedAssets: [
      { symbol: 'ETH', amount: 10 + rng(2) * 90, valueUSD: 0, apy: 2.5 + rng(3) * 3, icon: '⟠' },
      { symbol: 'USDC', amount: 5000 + rng(4) * 50000, valueUSD: 0, apy: 4 + rng(5) * 4, icon: '💲' },
    ],
    borrowedAssets: [
      { symbol: 'USDC', amount: 2000 + rng(6) * 20000, valueUSD: 0, apy: 5 + rng(7) * 3, icon: '💲' },
    ],
    liquidationPrice: 1800 + rng(8) * 1000,
    liquidationThreshold: 0.825,
    netAPY: parseFloat((1 + rng(9) * 5).toFixed(2)),
    collateralValue: 0,
    borrowValue: 0,
    lastUpdated: new Date().toISOString(),
  })

  // Compound position
  const compoundHF = 1.3 + rng(10) * 2.5
  positions.push({
    id: `compound_${address.slice(0, 10)}`,
    protocol: 'compound',
    protocolDisplayName: 'Compound V3',
    chainId: 1,
    chainName: 'Ethereum',
    healthFactor: parseFloat(compoundHF.toFixed(3)),
    suppliedAssets: [
      { symbol: 'ETH', amount: 5 + rng(11) * 45, valueUSD: 0, apy: 1.8 + rng(12) * 2, icon: '⟠' },
    ],
    borrowedAssets: [
      { symbol: 'USDC', amount: 1000 + rng(13) * 10000, valueUSD: 0, apy: 4.5 + rng(14) * 3, icon: '💲' },
    ],
    liquidationPrice: 1600 + rng(15) * 800,
    liquidationThreshold: 0.80,
    netAPY: parseFloat((0.5 + rng(16) * 4).toFixed(2)),
    collateralValue: 0,
    borrowValue: 0,
    lastUpdated: new Date().toISOString(),
  })

  // Calculate USD values (use ETH ~$3000 for demo)
  const ethPrice = 3000
  for (const pos of positions) {
    for (const asset of pos.suppliedAssets) {
      asset.valueUSD = asset.symbol === 'ETH' ? asset.amount * ethPrice : asset.amount
    }
    for (const asset of pos.borrowedAssets) {
      asset.valueUSD = asset.symbol === 'ETH' ? asset.amount * ethPrice : asset.amount
    }
    pos.collateralValue = pos.suppliedAssets.reduce((s, a) => s + a.valueUSD, 0)
    pos.borrowValue = pos.borrowedAssets.reduce((s, a) => s + a.valueUSD, 0)
  }

  return positions
}

export async function getDeFiPositions(address: string): Promise<DeFiPosition[]> {
  // In production: query on-chain positions via Aave/Compound subgraph or direct RPC
  // For demo: return simulated data
  return getSimulatedPositions(address)
}

export function getHealthFactorColor(hf: number): string {
  if (hf >= 2.0) return 'text-green-400'
  if (hf >= 1.5) return 'text-emerald-400'
  if (hf >= 1.2) return 'text-yellow-400'
  if (hf >= 1.0) return 'text-orange-400'
  return 'text-red-400'
}

export function getHealthFactorStatus(hf: number): string {
  if (hf >= 2.0) return 'Safe'
  if (hf >= 1.5) return 'Healthy'
  if (hf >= 1.2) return 'Caution'
  if (hf >= 1.0) return 'Danger'
  return 'Liquidatable'
}

export function getHealthFactorBg(hf: number): string {
  if (hf >= 2.0) return 'bg-green-500/10 border-green-500/20'
  if (hf >= 1.5) return 'bg-emerald-500/10 border-emerald-500/20'
  if (hf >= 1.2) return 'bg-yellow-500/10 border-yellow-500/20'
  if (hf >= 1.0) return 'bg-orange-500/10 border-orange-500/20'
  return 'bg-red-500/10 border-red-500/20'
}

export function calculateLiquidationPrice(
  collateralAmount: number,
  borrowAmount: number,
  liquidationThreshold: number,
  collateralPrice: number
): number {
  if (collateralAmount === 0 || liquidationThreshold === 0) return 0
  return borrowAmount / (collateralAmount * liquidationThreshold)
}

export function calculateRepayAmount(
  currentHF: number,
  targetHF: number,
  borrowValue: number,
  collateralValue: number,
  liquidationThreshold: number
): number {
  if (currentHF >= targetHF || currentHF <= 0) return 0
  // repay = borrow * (1 - currentHF/targetHF)
  return borrowValue * (1 - currentHF / targetHF)
}

// Alert management
const liquidationAlerts: Map<string, LiquidationAlert> = new Map()

export function createLiquidationAlert(
  positionId: string,
  protocol: string,
  chainName: string,
  healthFactor: number,
  threshold: number
): LiquidationAlert {
  const id = `liq_alert_${Date.now()}`
  const alert: LiquidationAlert = {
    id,
    positionId,
    protocol,
    chainName,
    healthFactor,
    threshold,
    status: 'active',
    createdAt: new Date().toISOString(),
  }
  liquidationAlerts.set(id, alert)
  return alert
}

export function getLiquidationAlerts(): LiquidationAlert[] {
  return Array.from(liquidationAlerts.values())
}

// Auto-repay configs
const autoRepayConfigs: Map<string, AutoRepayConfig> = new Map()

export function createAutoRepayConfig(
  positionId: string,
  targetHealthFactor: number,
  repayAsset: string,
  maxRepayAmount: number,
  source: 'wallet' | 'yield' | 'reserve'
): AutoRepayConfig {
  const id = `repay_${Date.now()}`
  const config: AutoRepayConfig = {
    id,
    positionId,
    enabled: true,
    targetHealthFactor,
    repayAsset,
    maxRepayAmount,
    source,
    createdAt: new Date().toISOString(),
  }
  autoRepayConfigs.set(id, config)
  return config
}

export function getAutoRepayConfigs(): AutoRepayConfig[] {
  return Array.from(autoRepayConfigs.values())
}

export function toggleAutoRepay(id: string): AutoRepayConfig | null {
  const config = autoRepayConfigs.get(id)
  if (!config) return null
  config.enabled = !config.enabled
  return config
}

// Yield optimization suggestions
export function getYieldSuggestions(positions: DeFiPosition[]): YieldSuggestion[] {
  const suggestions: YieldSuggestion[] = []

  for (const pos of positions) {
    for (const supplied of pos.suppliedAssets) {
      // Suggest higher yield alternatives
      if (supplied.symbol === 'ETH' && supplied.apy < 3.5) {
        suggestions.push({
          protocol: 'Lido',
          chain: pos.chainName,
          asset: 'stETH',
          currentAPY: supplied.apy,
          suggestedAPY: 3.5,
          improvement: `+${(3.5 - supplied.apy).toFixed(1)}%`,
          risk: 'low',
          description: 'Stake ETH with Lido for liquid staking rewards. stETH can be used as Aave collateral.',
        })
      }
      if (supplied.symbol === 'USDC' && supplied.apy < 5) {
        suggestions.push({
          protocol: 'Aave V3',
          chain: pos.chainName,
          asset: 'aUSDC',
          currentAPY: supplied.apy,
          suggestedAPY: 6.2,
          improvement: `+${(6.2 - supplied.apy).toFixed(1)}%`,
          risk: 'low',
          description: 'Move USDC to Aave V3 for higher supply APY with battle-tested security.',
        })
      }
    }
  }

  return suggestions
}

export function getProtocolIcon(protocol: string): string {
  switch (protocol) {
    case 'aave': return '👻'
    case 'compound': return '🏦'
    case 'maker': return '🏛️'
    case 'morpho': return '🔵'
    case 'spark': return '⚡'
    default: return '📊'
  }
}
