// Gas Fee Optimizer — Best time to transact, gas history, auto-execute, alerts
import { ethers } from 'ethers'
import { CHAINS } from './chains'

export interface GasDataPoint {
  timestamp: number
  gasPrice: number // in Gwei
  blockNumber: number
}

export interface GasPrediction {
  chainId: number
  chainName: string
  currentGas: number
  predictedBestTime: string // ISO date
  predictedBestGas: number
  confidence: number // 0-100
  savingsEstimate: string // e.g. "23%"
  recommendation: 'transact_now' | 'wait' | 'optimal_window'
}

export interface GasAlert {
  id: string
  chainId: number
  chainName: string
  thresholdGwei: number
  condition: 'below' | 'above'
  enabled: boolean
  createdAt: string
  triggeredAt?: string
}

export interface GasSavingsEstimate {
  currentCost: string
  optimizedCost: string
  savedAmount: string
  savedPercent: string
  chainName: string
  txType: string
}

export interface AutoExecuteConfig {
  enabled: boolean
  chainId: number
  maxGasGwei: number
  txData: string
  toAddress: string
  value: string
  createdAt: string
}

// Simulated historical gas data (in production, fetched from indexer/subgraph)
function generateHistoricalData(chainId: number, days: number): GasDataPoint[] {
  const now = Date.now()
  const points: GasDataPoint[] = []
  const interval = (days * 24 * 60 * 60 * 1000) / 200

  // Base gas varies by chain
  const baseGas: Record<number, number> = {
    1: 25,      // Ethereum
    8453: 0.005,// Base
    42161: 0.1, // Arbitrum
    137: 30,    // Polygon
    10: 0.003,  // Optimism
    56: 3,      // BSC
    43114: 25,  // Avalanche
    81457: 0.005,
  }
  const base = baseGas[chainId] || 10

  for (let i = 0; i < 200; i++) {
    const timestamp = now - (200 - i) * interval
    const hour = new Date(timestamp).getUTCHours()
    // Simulate daily patterns: lower gas 2-6 UTC, higher 12-18 UTC
    const hourFactor = hour >= 2 && hour <= 6 ? 0.6 : hour >= 12 && hour <= 18 ? 1.4 : 1.0
    const noise = (Math.random() - 0.5) * base * 0.5
    const spike = Math.random() > 0.95 ? base * 2 * Math.random() : 0
    const gasPrice = Math.max(0.001, base * hourFactor + noise + spike)

    points.push({
      timestamp,
      gasPrice: parseFloat(gasPrice.toFixed(6)),
      blockNumber: 18000000 + i * 100,
    })
  }
  return points
}

export function getHistoricalGas(chainId: number, period: '24h' | '7d' | '30d'): GasDataPoint[] {
  const days = period === '24h' ? 1 : period === '7d' ? 7 : 30
  return generateHistoricalData(chainId, days)
}

export function predictBestTime(chainId: number): GasPrediction {
  const chain = CHAINS[chainId]
  const chainName = chain?.name || `Chain ${chainId}`
  const history = getHistoricalGas(chainId, '7d')

  // Find the average gas by hour
  const hourlyAvg: Record<number, number[]> = {}
  for (const point of history) {
    const hour = new Date(point.timestamp).getUTCHours()
    if (!hourlyAvg[hour]) hourlyAvg[hour] = []
    hourlyAvg[hour].push(point.gasPrice)
  }

  let bestHour = 0
  let bestAvg = Infinity
  for (const [hour, prices] of Object.entries(hourlyAvg)) {
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length
    if (avg < bestAvg) {
      bestAvg = avg
      bestHour = parseInt(hour)
    }
  }

  const currentGas = history[history.length - 1]?.gasPrice || 0
  const avgGas = history.reduce((s, p) => s + p.gasPrice, 0) / history.length

  // Calculate next best window
  const now = new Date()
  const nextBest = new Date(now)
  if (bestHour <= now.getUTCHours()) {
    nextBest.setUTCDate(nextBest.getUTCDate() + 1)
  }
  nextBest.setUTCHours(bestHour, 0, 0, 0)

  const savingsPct = avgGas > 0 ? ((avgGas - bestAvg) / avgGas * 100) : 0

  let recommendation: GasPrediction['recommendation'] = 'wait'
  if (currentGas <= bestAvg * 1.1) recommendation = 'optimal_window'
  else if (currentGas <= avgGas * 0.8) recommendation = 'transact_now'

  return {
    chainId,
    chainName,
    currentGas: parseFloat(currentGas.toFixed(4)),
    predictedBestTime: nextBest.toISOString(),
    predictedBestGas: parseFloat(bestAvg.toFixed(4)),
    confidence: Math.round(65 + Math.random() * 25),
    savingsEstimate: `${Math.round(savingsPct)}%`,
    recommendation,
  }
}

export function calculateGasSavings(
  chainId: number,
  gasLimit: number = 21000,
  txType: string = 'Transfer'
): GasSavingsEstimate {
  const history = getHistoricalGas(chainId, '7d')
  const currentGas = history[history.length - 1]?.gasPrice || 0
  const avgGas = history.reduce((s, p) => s + p.gasPrice, 0) / history.length

  // Find the 10th percentile (low gas window)
  const sorted = [...history].sort((a, b) => a.gasPrice - b.gasPrice)
  const lowGas = sorted[Math.floor(sorted.length * 0.1)]?.gasPrice || avgGas * 0.5

  const currentCostEth = (currentGas * gasLimit) / 1e9
  const optimizedCostEth = (lowGas * gasLimit) / 1e9
  const savedEth = currentCostEth - optimizedCostEth

  const chain = CHAINS[chainId]
  const nativeSymbol = chain?.name === 'Polygon' ? 'MATIC' : chain?.name === 'BSC' ? 'BNB' : 'ETH'

  return {
    currentCost: `${currentCostEth.toFixed(6)} ${nativeSymbol}`,
    optimizedCost: `${optimizedCostEth.toFixed(6)} ${nativeSymbol}`,
    savedAmount: `${Math.max(0, savedEth).toFixed(6)} ${nativeSymbol}`,
    savedPercent: avgGas > 0 ? `${Math.round(((avgGas - lowGas) / avgGas) * 100)}%` : '0%',
    chainName: chain?.name || `Chain ${chainId}`,
    txType,
  }
}

export function getAllPredictions(): GasPrediction[] {
  const chainIds = Object.keys(CHAINS).map(Number)
  return chainIds.map(id => predictBestTime(id))
}

// Alert management (in-memory for demo; production would use DB)
const gasAlerts: Map<string, GasAlert> = new Map()

export function createGasAlert(
  chainId: number,
  thresholdGwei: number,
  condition: 'below' | 'above'
): GasAlert {
  const chain = CHAINS[chainId]
  const id = `alert_${chainId}_${Date.now()}`
  const alert: GasAlert = {
    id,
    chainId,
    chainName: chain?.name || `Chain ${chainId}`,
    thresholdGwei,
    condition,
    enabled: true,
    createdAt: new Date().toISOString(),
  }
  gasAlerts.set(id, alert)
  return alert
}

export function getGasAlerts(): GasAlert[] {
  return Array.from(gasAlerts.values())
}

export function toggleGasAlert(id: string): GasAlert | null {
  const alert = gasAlerts.get(id)
  if (!alert) return null
  alert.enabled = !alert.enabled
  return alert
}

export function deleteGasAlert(id: string): boolean {
  return gasAlerts.delete(id)
}

// Auto-execute configs
const autoExecuteConfigs: Map<string, AutoExecuteConfig> = new Map()

export function createAutoExecute(
  chainId: number,
  maxGasGwei: number,
  toAddress: string,
  txData: string,
  value: string
): AutoExecuteConfig {
  const config: AutoExecuteConfig = {
    enabled: true,
    chainId,
    maxGasGwei,
    txData,
    toAddress,
    value,
    createdAt: new Date().toISOString(),
  }
  const id = `auto_${chainId}_${Date.now()}`
  autoExecuteConfigs.set(id, config)
  return config
}

export function getAutoExecuteConfigs(): AutoExecuteConfig[] {
  return Array.from(autoExecuteConfigs.values())
}

export function getSupportedChains() {
  return Object.entries(CHAINS).map(([id, chain]) => ({
    id: Number(id),
    name: chain.name,
    icon: chain.icon,
  }))
}
