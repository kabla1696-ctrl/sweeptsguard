// Gas Tracker - Real-time gas prices for all chains
import { ethers } from 'ethers'
import { CHAINS, type ChainConfig } from './chains'

export interface GasPrice {
  chainId: number
  chainName: string
  icon: string
  low: string
  average: string
  high: string
  unit: string
  baseFee?: string
  lastUpdated: string
}

export interface GasEstimate {
  chainId: number
  chainName: string
  estimatedCost: {
    low: string
    average: string
    high: string
  }
  nativeCurrency: string
}

export class GasTracker {
  private providers: Map<number, ethers.JsonRpcProvider> = new Map()

  constructor() {
    for (const [id, chain] of Object.entries(CHAINS)) {
      this.providers.set(Number(id), new ethers.JsonRpcProvider(chain.rpc))
    }
  }

  async getGasPrice(chainId: number): Promise<GasPrice | null> {
    const provider = this.providers.get(chainId)
    const chain = CHAINS[chainId]
    if (!provider || !chain) return null

    try {
      const feeData = await provider.getFeeData()
      const gasPrice = feeData.gasPrice || BigInt(0)
      const maxFeePerGas = feeData.maxFeePerGas || gasPrice
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || BigInt(0)

      // Calculate low/average/high
      const low = gasPrice
      const average = gasPrice * 120n / 100n // +20%
      const high = gasPrice * 150n / 100n // +50%

      return {
        chainId,
        chainName: chain.name,
        icon: chain.icon,
        low: ethers.formatUnits(low, 'gwei'),
        average: ethers.formatUnits(average, 'gwei'),
        high: ethers.formatUnits(high, 'gwei'),
        unit: 'Gwei',
        baseFee: feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') : undefined,
        lastUpdated: new Date().toISOString()
      }
    } catch {
      return null
    }
  }

  async getAllGasPrices(): Promise<GasPrice[]> {
    const promises = Object.keys(CHAINS).map(id => this.getGasPrice(Number(id)))
    const results = await Promise.all(promises)
    return results.filter((r): r is GasPrice => r !== null)
  }

  async estimateTransferCost(chainId: number, gasLimit: bigint = 21000n): Promise<GasEstimate | null> {
    const provider = this.providers.get(chainId)
    const chain = CHAINS[chainId]
    if (!provider || !chain) return null

    try {
      const feeData = await provider.getFeeData()
      const gasPrice = feeData.gasPrice || BigInt(0)

      const lowCost = gasPrice * gasLimit * 90n / 100n
      const avgCost = gasPrice * gasLimit
      const highCost = gasPrice * gasLimit * 150n / 100n

      return {
        chainId,
        chainName: chain.name,
        estimatedCost: {
          low: ethers.formatEther(lowCost),
          average: ethers.formatEther(avgCost),
          high: ethers.formatEther(highCost)
        },
        nativeCurrency: chain.nativeCurrency
      }
    } catch {
      return null
    }
  }
}

export const gasTracker = new GasTracker()
