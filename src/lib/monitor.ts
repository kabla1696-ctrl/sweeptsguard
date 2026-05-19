import { ethers } from 'ethers'
import { CHAINS, DEFAULT_CHAINS } from './chains'
import { scanner, type DelegationInfo } from './scanner'
import { createSweepEngine, type SweepConfig, type SweepResult } from './sweeper'

export interface MonitorConfig {
  address: string
  safeAddress: string
  privateKey: string
  chainIds: number[]
  checkIntervalMs: number
  onAlert?: (alert: MonitorAlert) => void
  onSweep?: (result: SweepResult) => void
}

export interface MonitorAlert {
  type: 'balance_change' | 'new_token' | 'incoming_transfer' | 'delegation_detected' | 'drainer_active'
  chainId: number
  chainName: string
  message: string
  timestamp: number
  details?: Record<string, unknown>
}

export interface MonitorState {
  running: boolean
  lastCheck: number
  balances: Map<string, bigint>
  alerts: MonitorAlert[]
  sweepResults: SweepResult[]
}

export class WalletMonitor {
  private config: MonitorConfig
  private state: MonitorState
  private intervalId: ReturnType<typeof setInterval> | null = null
  private providers: Map<number, ethers.JsonRpcProvider> = new Map()

  constructor(config: MonitorConfig) {
    this.config = config
    this.state = {
      running: false,
      lastCheck: 0,
      balances: new Map(),
      alerts: [],
      sweepResults: []
    }

    for (const chainId of config.chainIds) {
      const chain = CHAINS[chainId]
      if (chain) {
        this.providers.set(chainId, new ethers.JsonRpcProvider(chain.rpc))
      }
    }
  }

  // Get balance key for storage
  private getBalanceKey(chainId: number, tokenAddress?: string): string {
    return `${chainId}-${tokenAddress || 'native'}`
  }

  // Check for balance changes
  async checkBalances(): Promise<void> {
    for (const [chainId, provider] of this.providers) {
      const chain = CHAINS[chainId]
      if (!chain) continue

      try {
        // Check native balance
        const balance = await provider.getBalance(this.config.address)
        const key = this.getBalanceKey(chainId)
        const prevBalance = this.state.balances.get(key)

        if (prevBalance !== undefined && balance > prevBalance) {
          const diff = balance - prevBalance
          const alert: MonitorAlert = {
            type: 'balance_change',
            chainId,
            chainName: chain.name,
            message: `Incoming ${ethers.formatEther(diff)} ${chain.nativeCurrency} detected on ${chain.name}!`,
            timestamp: Date.now(),
            details: {
              previous: ethers.formatEther(prevBalance),
              current: ethers.formatEther(balance),
              diff: ethers.formatEther(diff)
            }
          }

          this.state.alerts.push(alert)
          this.config.onAlert?.(alert)

          // Auto-sweep if balance increased
          await this.executeSweep(chainId)
        }

        this.state.balances.set(key, balance)
      } catch {
        // Skip failed chains
      }
    }

    this.state.lastCheck = Date.now()
  }

  // Execute sweep on a chain
  async executeSweep(chainId: number): Promise<void> {
    const sweepConfig: SweepConfig = {
      compromisedAddress: this.config.address,
      safeAddress: this.config.safeAddress,
      privateKey: this.config.privateKey,
      chainIds: [chainId],
      sweepNative: true,
      sweepTokens: true,
      minEthBalance: '0.001'
    }

    const engine = createSweepEngine(sweepConfig)
    const results = await engine.sweepChain(chainId)

    for (const result of results) {
      this.state.sweepResults.push(result)
      this.config.onSweep?.(result)
    }
  }

  // Start monitoring
  start(): void {
    if (this.state.running) return

    this.state.running = true
    this.intervalId = setInterval(() => {
      this.checkBalances().catch(() => {})
    }, this.config.checkIntervalMs)

    // Initial check
    this.checkBalances().catch(() => {})
  }

  // Stop monitoring
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.state.running = false
  }

  // Get current state
  getState(): MonitorState {
    return this.state
  }

  // Get recent alerts
  getAlerts(limit: number = 50): MonitorAlert[] {
    return this.state.alerts.slice(-limit)
  }

  // Get sweep results
  getSweepResults(): SweepResult[] {
    return this.state.sweepResults
  }
}

export function createMonitor(config: MonitorConfig): WalletMonitor {
  return new WalletMonitor(config)
}
