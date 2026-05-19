import { ethers } from 'ethers'
import { CHAINS } from './chains'
import { createAlertSystem, type AlertSystem } from './alerts'
import { isKnownDrainer, isExchangeWallet } from './draindb'
import { tracker, checkExchangeDeposit } from './tracker'

export interface MonitorConfig {
  address: string
  safeAddress: string
  privateKey: string
  chainIds: number[]
  checkIntervalMs: number
  telegramBotToken?: string
  telegramChatId?: string
  discordWebhookUrl?: string
  slackWebhookUrl?: string
  enableFlashbots?: boolean
  onAlert?: (alert: MonitorAlert) => void
  onSweep?: (result: SweepResult) => void
}

export interface MonitorAlert {
  type: 'balance_change' | 'incoming_transfer' | 'sweep_success' | 'sweep_failed' | 'drainer_detected' | 'exchange_deposit'
  chainId: number
  chainName: string
  message: string
  timestamp: number
  amount?: string
  asset?: string
  txHash?: string
  details?: Record<string, unknown>
}

export interface SweepResult {
  success: boolean
  chainId: number
  chainName: string
  asset: string
  amount: string
  txHash?: string
  error?: string
}

export interface MonitorState {
  running: boolean
  lastCheck: number
  balances: Map<string, bigint>
  alerts: MonitorAlert[]
  sweepResults: SweepResult[]
  exchangeDeposits: { exchange: string; txHash: string; timestamp: number }[]
}

export class WalletMonitor {
  private config: MonitorConfig
  private state: MonitorState
  private intervalId: ReturnType<typeof setInterval> | null = null
  private providers: Map<number, ethers.JsonRpcProvider> = new Map()
  private wallets: Map<number, ethers.Wallet> = new Map()
  private alerts: AlertSystem | null = null
  private onAlert?: (alert: MonitorAlert) => void
  private onSweep?: (result: SweepResult) => void

  constructor(config: MonitorConfig) {
    this.config = config
    this.onAlert = config.onAlert
    this.onSweep = config.onSweep
    this.state = {
      running: false,
      lastCheck: 0,
      balances: new Map(),
      alerts: [],
      sweepResults: [],
      exchangeDeposits: []
    }

    for (const chainId of config.chainIds) {
      const chain = CHAINS[chainId]
      if (chain) {
        const provider = new ethers.JsonRpcProvider(chain.rpc)
        const wallet = new ethers.Wallet(config.privateKey, provider)
        this.providers.set(chainId, provider)
        this.wallets.set(chainId, wallet)
      }
    }

    // Initialize alert system if any channel configured
    if (config.telegramBotToken || config.discordWebhookUrl || config.slackWebhookUrl) {
      this.alerts = createAlertSystem({
        telegramBotToken: config.telegramBotToken,
        telegramChatId: config.telegramChatId,
        discordWebhookUrl: config.discordWebhookUrl,
        slackWebhookUrl: config.slackWebhookUrl
      })
    }
  }

  private getBalanceKey(chainId: number): string {
    return `${chainId}-native`
  }

  // Check for balance changes
  async checkBalances(): Promise<void> {
    for (const [chainId, provider] of this.providers) {
      const chain = CHAINS[chainId]
      if (!chain) continue

      try {
        const balance = await provider.getBalance(this.config.address)
        const key = this.getBalanceKey(chainId)
        const prevBalance = this.state.balances.get(key)

        if (prevBalance !== undefined && balance > prevBalance) {
          const diff = balance - prevBalance
          const amount = ethers.formatEther(diff)

          const alert: MonitorAlert = {
            type: 'balance_change',
            chainId,
            chainName: chain.name,
            message: `Incoming ${amount} ${chain.nativeCurrency} detected!`,
            timestamp: Date.now(),
            amount,
            asset: chain.nativeCurrency
          }

          this.state.alerts.push(alert)

          // Send alerts
          if (this.alerts) {
            await this.alerts.sendIncomingTransfer(chain.name, chain.nativeCurrency, amount)
          }

          // Check if from drainer
          const block = await provider.getBlock('latest')
          if (block) {
            // Check recent logs for drainer addresses
            const recentLogs = await provider.getLogs({
              fromBlock: block.number - 100,
              toBlock: 'latest',
              topics: [ethers.id('Transfer(address,address,uint256)'), null, ethers.zeroPadValue(this.config.address, 32)]
            }).catch(() => [])

            for (const log of recentLogs) {
              const fromAddr = '0x' + log.topics[1].slice(26)
              const fromInfo = isKnownDrainer(fromAddr)
              if (fromInfo) {
                const drainerAlert: MonitorAlert = {
                  type: 'drainer_detected',
                  chainId,
                  chainName: chain.name,
                  message: `Known drainer detected: ${fromInfo.name}`,
                  timestamp: Date.now()
                }
                this.state.alerts.push(drainerAlert)
                this.onAlert?.(drainerAlert)

                if (this.alerts) {
                  await this.alerts.sendDrainerDetected(fromInfo.name, fromAddr)
                }
                break
              }
            }
          }

          // Auto-sweep
          await this.executeSweep(chainId)
        }

        this.state.balances.set(key, balance)
      } catch {
        // Skip failed chains
      }
    }

    // Check for exchange deposits (every 10 checks)
    if (this.state.lastCheck % 10 === 0) {
      await this.checkExchangeDeposits()
    }

    this.state.lastCheck = Date.now()
  }

  // Check if stolen funds reached an exchange
  async checkExchangeDeposits(): Promise<void> {
    try {
      const result = await checkExchangeDeposit(this.config.address, 1)
      if (result.deposited && result.exchange && result.txHash) {
        const existing = this.state.exchangeDeposits.find(d => d.txHash === result.txHash)
        if (!existing) {
          this.state.exchangeDeposits.push({
            exchange: result.exchange,
            txHash: result.txHash,
            timestamp: Date.now()
          })

          if (this.alerts) {
            await this.alerts.sendExchangeDeposit(result.exchange, '0', 'ETH', result.txHash)
          }
        }
      }
    } catch {
      // Skip errors
    }
  }

  // Execute sweep
  async executeSweep(chainId: number): Promise<void> {
    const provider = this.providers.get(chainId)
    const wallet = this.wallets.get(chainId)
    const chain = CHAINS[chainId]

    if (!provider || !wallet || !chain) return

    try {
      const balance = await provider.getBalance(this.config.address)
      const minKeep = ethers.parseEther('0.001')

      if (balance <= minKeep) return

      const gasEstimate = await provider.estimateGas({
        from: this.config.address,
        to: this.config.safeAddress,
        value: balance - minKeep
      })

      const feeData = await provider.getFeeData()
      const gasCost = gasEstimate * (feeData.gasPrice || BigInt(0))

      if (balance - minKeep <= gasCost) return

      const sweepAmount = balance - minKeep - gasCost

      const tx = await wallet.sendTransaction({
        from: this.config.address,
        to: this.config.safeAddress,
        value: sweepAmount,
        gasLimit: gasEstimate
      })

      const result: SweepResult = {
        success: true,
        chainId,
        chainName: chain.name,
        asset: chain.nativeCurrency,
        amount: ethers.formatEther(sweepAmount),
        txHash: tx.hash
      }

      this.state.sweepResults.push(result)

      if (this.alerts) {
        const explorerUrl = `${chain.explorer}/tx/${tx.hash}`
        await this.alerts.sendSweepSuccess(chain.name, chain.nativeCurrency, ethers.formatEther(sweepAmount), tx.hash, explorerUrl)
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      const result: SweepResult = {
        success: false,
        chainId,
        chainName: chain.name,
        asset: chain.nativeCurrency,
        amount: '0',
        error: errorMessage
      }

      this.state.sweepResults.push(result)

      if (this.alerts) {
        await this.alerts.sendSweepFailed(chain.name, chain.nativeCurrency, errorMessage)
      }
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

  getState(): MonitorState {
    return this.state
  }

  getAlerts(limit: number = 50): MonitorAlert[] {
    return this.state.alerts.slice(-limit)
  }

  getSweepResults(): SweepResult[] {
    return this.state.sweepResults
  }
}

export function createMonitor(config: MonitorConfig): WalletMonitor {
  return new WalletMonitor(config)
}
