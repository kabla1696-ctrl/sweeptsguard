import { ethers } from 'ethers'
import { CHAINS } from './chains'
import { createAlertSystem, type AlertSystem } from './alerts'
import { isKnownDrainer, isExchangeWallet } from './draindb'
import { tracker, checkExchangeDeposit } from './tracker'
import { scanNFTs, batchNFTTransfer, getNFTGasParams, type NFTItem } from './nftRescue'

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
  nfts: Map<number, NFTItem[]>
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
  private checkCount = 0 // Track check cycles for periodic tasks

  constructor(config: MonitorConfig) {
    this.config = config
    this.onAlert = config.onAlert
    this.onSweep = config.onSweep
    this.state = {
      running: false,
      lastCheck: 0,
      balances: new Map(),
      nfts: new Map(),
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
    this.checkCount++
    if (this.checkCount % 10 === 0) {
      await this.checkExchangeDeposits()
    }

    // Check for NFTs (every 5 checks)
    if (this.checkCount % 5 === 0) {
      await this.checkNFTs()
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
      // BUG FIX: Sweep BOTH native AND ERC-20 tokens
      // First, sweep native balance
      const balance = await provider.getBalance(this.config.address)
      const minKeep = ethers.parseEther('0.001')

      if (balance > minKeep) {
        const gasEstimate = await provider.estimateGas({
          from: this.config.address,
          to: this.config.safeAddress,
          value: balance - minKeep
        })

        const feeData = await provider.getFeeData()
        const gasCost = gasEstimate * (feeData.gasPrice || BigInt(0))

        if (balance - minKeep > gasCost) {
          const sweepAmount = balance - minKeep - gasCost

          // BUG FIX: Sweep native balance
          // NOTE: Ethereum uses direct TX — Flashbots integration for monitor pending
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
          this.onSweep?.(result)

          if (this.alerts) {
            const explorerUrl = `${chain.explorer}/tx/${tx.hash}`
            await this.alerts.sendSweepSuccess(chain.name, chain.nativeCurrency, ethers.formatEther(sweepAmount), tx.hash, explorerUrl)
          }
        }
      }

      // BUG FIX: Also sweep ERC-20 tokens
      await this.sweepERC20Tokens(chainId)

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
      this.onSweep?.(result)

      if (this.alerts) {
        await this.alerts.sendSweepFailed(chain.name, chain.nativeCurrency, errorMessage)
      }
    }
  }

  // BUG FIX: Sweep ERC-20 tokens from compromised wallet
  private async sweepERC20Tokens(chainId: number): Promise<void> {
    const provider = this.providers.get(chainId)
    const wallet = this.wallets.get(chainId)
    const chain = CHAINS[chainId]
    if (!provider || !wallet || !chain) return

    // Common token addresses per chain
    const TOKENS: Record<number, { address: string; symbol: string; decimals: number }[]> = {
      1: [
        { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', decimals: 6 },
        { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', decimals: 6 },
        { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol: 'WETH', decimals: 18 },
      ],
      8453: [
        { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', decimals: 6 },
        { address: '0x4200000000000000000000000000000000000006', symbol: 'WETH', decimals: 18 },
      ],
      42161: [
        { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', symbol: 'USDT', decimals: 6 },
        { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', symbol: 'USDC', decimals: 6 },
        { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', symbol: 'WETH', decimals: 18 },
      ],
      137: [
        { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', symbol: 'USDT', decimals: 6 },
        { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', symbol: 'USDC', decimals: 6 },
      ],
    }

    const tokens = TOKENS[chainId] || []
    for (const token of tokens) {
      try {
        const contract = new ethers.Contract(token.address, [
          'function balanceOf(address) view returns (uint256)',
          'function transfer(address to, uint256 amount) returns (bool)',
          'function decimals() view returns (uint8)'
        ], wallet)

        const balance = await contract.balanceOf(this.config.address)
        if (balance > BigInt(0)) {
          // Need gas for the TX
          const gasPrice = (await provider.getFeeData()).gasPrice || BigInt(0)
          const gasEstimate = await contract.transfer.estimateGas(this.config.safeAddress, balance)
          const gasCost = gasEstimate * gasPrice

          // Check if we have enough gas
          const nativeBalance = await provider.getBalance(this.config.address)
          if (nativeBalance < gasCost) continue // Not enough gas, skip

          const tx = await contract.transfer(this.config.safeAddress, balance)
          const result: SweepResult = {
            success: true,
            chainId,
            chainName: chain.name,
            asset: token.symbol,
            amount: ethers.formatUnits(balance, token.decimals),
            txHash: tx.hash
          }
          this.state.sweepResults.push(result)
          this.onSweep?.(result)
        }
      } catch {
        // Skip failed tokens
      }
    }
  }

  // Check for new NFTs
  async checkNFTs(): Promise<void> {
    for (const [chainId] of this.providers) {
      try {
        const nfts = await scanNFTs(this.config.address, chainId)
        const prevNfts = this.state.nfts.get(chainId) || []

        // Detect new NFTs
        const prevSet = new Set(prevNfts.map(n => `${n.contractAddress}-${n.tokenId}`))
        const newNfts = nfts.filter(n => !prevSet.has(`${n.contractAddress}-${n.tokenId}`))

        if (newNfts.length > 0) {
          const chain = CHAINS[chainId]
          const alert: MonitorAlert = {
            type: 'incoming_transfer',
            chainId,
            chainName: chain?.name || `Chain ${chainId}`,
            message: `${newNfts.length} new NFT(s) detected!`,
            timestamp: Date.now(),
            asset: 'NFT'
          }
          this.state.alerts.push(alert)
          this.onAlert?.(alert)

          if (this.alerts) {
            await this.alerts.sendIncomingTransfer(
              chain?.name || `Chain ${chainId}`,
              'NFT',
              `${newNfts.length} NFT(s)`
            )
          }

          // Auto-sweep new NFTs
          await this.sweepNFTs(chainId, newNfts)
        }

        this.state.nfts.set(chainId, nfts)
      } catch {
        // Skip failed chains
      }
    }
  }

  // Sweep NFTs to safe wallet
  async sweepNFTs(chainId: number, nfts?: NFTItem[]): Promise<void> {
    const provider = this.providers.get(chainId)
    const wallet = this.wallets.get(chainId)
    const chain = CHAINS[chainId]
    if (!provider || !wallet || !chain) return

    const nftsToSweep = nfts || this.state.nfts.get(chainId) || []
    if (nftsToSweep.length === 0) return

    try {
      const gasParams = await getNFTGasParams(provider, chainId)
      const nonce = await provider.getTransactionCount(this.config.address, 'pending')

      const transferTxs = batchNFTTransfer(
        nftsToSweep,
        this.config.address,
        this.config.safeAddress,
        nonce,
        gasParams
      )

      let currentNonce = nonce
      for (const tx of transferTxs) {
        try {
          const signedTx = await wallet.signTransaction({
            to: tx.to,
            data: tx.data,
            value: tx.value,
            gasLimit: tx.gasLimit,
            chainId,
            nonce: currentNonce++,
            ...(gasParams.type === 2
              ? { type: 2, maxFeePerGas: gasParams.maxFeePerGas, maxPriorityFeePerGas: gasParams.maxPriorityFeePerGas }
              : { gasPrice: gasParams.gasPrice })
          })

          const broadcast = await provider.broadcastTransaction(signedTx)

          const result: SweepResult = {
            success: true,
            chainId,
            chainName: chain.name,
            asset: `NFT #${tx.nft.tokenId}`,
            amount: '1',
            txHash: broadcast.hash
          }
          this.state.sweepResults.push(result)
          this.onSweep?.(result)

          if (this.alerts) {
            const explorerUrl = `${chain.explorer}/tx/${broadcast.hash}`
            await this.alerts.sendSweepSuccess(
              chain.name,
              `NFT #${tx.nft.tokenId}`,
              '1',
              broadcast.hash,
              explorerUrl
            )
          }
        } catch (err) {
          const result: SweepResult = {
            success: false,
            chainId,
            chainName: chain.name,
            asset: `NFT #${tx.nft.tokenId}`,
            amount: '0',
            error: err instanceof Error ? err.message : 'NFT transfer failed'
          }
          this.state.sweepResults.push(result)
          this.onSweep?.(result)
        }
      }
    } catch (err) {
      const result: SweepResult = {
        success: false,
        chainId,
        chainName: chain.name,
        asset: 'NFT',
        amount: '0',
        error: err instanceof Error ? err.message : 'NFT sweep failed'
      }
      this.state.sweepResults.push(result)
      this.onSweep?.(result)
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
