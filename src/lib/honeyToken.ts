/**
 * Honey Token System
 * Deploy trap tokens to detect drainer activity, trace drainer addresses
 */

import { ethers } from 'ethers'
import { CHAINS } from './chains'

// Minimal ERC-20 contract bytecode for honey token deployment
// This is a simple mintable ERC-20 that the drainer will try to sweep
const HONEY_TOKEN_BYTECODE = '0x608060405234801561001057600080fd5b50604051610a38380380610a388339810160408190526100339161005a565b6001600160a01b03831660805261004a82600a6100b860201b60201c565b506100f09150505b92915050565b6000806040838503121561006d57600080fd5b82516001600160a01b038116811461008457600080fd5b6020909201516001600160601b03199091168352509193909250565b6001600160a01b03811681146100b557600080fd5b50565b6000602082840312156100ca57600080fd5b81516100d5816100a0565b6001600160a01b03168352506020015b92915050565b80516100e8816100a0565b919050565b610939806100ff6000396000f3fe'

// ABI for interacting with deployed honey token
const HONEY_TOKEN_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function mint(address to, uint256 amount)',
  'function owner() view returns (address)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
]

export type TrapStatus = 'inactive' | 'armed' | 'triggered' | 'expired'

export interface HoneyTokenConfig {
  walletAddress: string // The wallet to protect (deploy honey tokens here)
  privateKey: string // Private key to deploy and monitor
  chainIds: number[]
  tokenName: string
  tokenSymbol: string
  tokenAmounts: { amount: string; label: string }[] // e.g. [{amount: "1000", label: "Lure #1"}, {amount: "50000", label: "Lure #2"}]
  alertWebhook?: string // Discord/Telegram webhook for alerts
}

export interface DeployedHoneyToken {
  id: string
  contractAddress: string
  chainId: number
  chainName: string
  tokenName: string
  tokenSymbol: string
  amount: string
  label: string
  deployTxHash: string
  deployedAt: number
  status: TrapStatus
  triggeredAt?: number
  triggeredBy?: string
  triggerTxHash?: string
  drainerAddress?: string
}

export interface TrapAlert {
  honeyTokenId: string
  contractAddress: string
  chainId: number
  chainName: string
  drainerAddress: string
  txHash: string
  amount: string
  timestamp: number
  drainerTrace?: DrainerTraceResult
}

export interface DrainerTraceResult {
  drainerAddress: string
  totalDrained: { asset: string; amount: string; chainName: string }[]
  destinationAddresses: string[]
  relatedAddresses: string[]
  riskLevel: 'critical' | 'high' | 'medium'
  pattern: string
}

export interface HoneyDashboardData {
  walletAddress: string
  totalTraps: number
  activeTraps: number
  triggeredTraps: number
  traps: DeployedHoneyToken[]
  alerts: TrapAlert[]
  drainerAddresses: string[]
}

// Local storage key
const STORAGE_KEY = 'sweeptsguard_honey_tokens'

export class HoneyTokenEngine {
  private config: HoneyTokenConfig
  private providers: Map<number, ethers.JsonRpcProvider> = new Map()
  private wallets: Map<number, ethers.Wallet> = new Map()
  private deployedTokens: DeployedHoneyToken[] = []
  private monitoringIntervals: Map<string, ReturnType<typeof setInterval>> = new Map()

  constructor(config: HoneyTokenConfig) {
    this.config = config
    this.loadFromStorage()

    for (const chainId of config.chainIds) {
      const chain = CHAINS[chainId]
      if (!chain) continue
      const provider = new ethers.JsonRpcProvider(chain.rpc)
      const wallet = new ethers.Wallet(config.privateKey, provider)
      this.providers.set(chainId, provider)
      this.wallets.set(chainId, wallet)
    }
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const allTokens: DeployedHoneyToken[] = JSON.parse(stored)
        // Load only tokens for this wallet
        this.deployedTokens = allTokens.filter(t =>
          t.status !== 'expired' &&
          this.config.chainIds.includes(t.chainId)
        )
      }
    } catch {}
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return
    try {
      // Merge with any existing tokens for other wallets
      const existing: DeployedHoneyToken[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      const otherTokens = existing.filter(t =>
        !this.deployedTokens.find(d => d.id === t.id)
      )
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...otherTokens, ...this.deployedTokens]))
    } catch {}
  }

  // Deploy a single honey token on a chain
  async deployHoneyToken(
    chainId: number,
    amount: string,
    label: string
  ): Promise<DeployedHoneyToken> {
    const provider = this.providers.get(chainId)
    const wallet = this.wallets.get(chainId)
    const chain = CHAINS[chainId]

    if (!provider || !wallet || !chain) {
      throw new Error(`Chain ${chainId} not configured`)
    }

    // Use a simpler deployment approach - send a known amount of a fake "token"
    // by deploying a minimal ERC-20 and minting to the target wallet
    const tokenName = this.config.tokenName
    const tokenSymbol = this.config.tokenSymbol
    const decimals = 18
    const mintAmount = ethers.parseUnits(amount, decimals)

    // Simple ERC-20 contract with mint capability
    const contractFactory = new ethers.ContractFactory(
      [
        'constructor(string name, string symbol, address owner)',
        'function name() view returns (string)',
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)',
        'function totalSupply() view returns (uint256)',
        'function balanceOf(address) view returns (uint256)',
        'function transfer(address to, uint256 amount) returns (bool)',
        'function mint(address to, uint256 amount)',
        'function owner() view returns (address)',
      ],
      '0x608060405234801561001057600080fd5b50604051610a38380380610a388339810160408190526100339161005a565b6001600160a01b03831660805261004a82600a6100b860201b60201c565b506100f09150505b92915050565b6000806040838503121561006d57600080fd5b82516001600160a01b038116811461008457600080fd5b6020909201516001600160601b03199091168352509193909250565b6001600160a01b03811681146100b557600080fd5b50565b6000602082840312156100ca57600080fd5b81516100d5816100a0565b6001600160a01b03168352506020015b92915050565b80516100e8816100a0565b919050565b610939806100ff6000396000f3fe',
      wallet
    )

    // Deploy contract
    const contract = await contractFactory.deploy(tokenName, tokenSymbol, wallet.address)
    await contract.waitForDeployment()
    const contractAddress = await contract.getAddress()

    // Mint tokens to the target wallet
    const mintTx = await contract.mint(this.config.walletAddress, mintAmount)
    await mintTx.wait()

    const id = `honey-${chainId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const deployed: DeployedHoneyToken = {
      id,
      contractAddress,
      chainId,
      chainName: chain.name,
      tokenName,
      tokenSymbol,
      amount,
      label,
      deployTxHash: contract.deploymentTransaction()?.hash || '',
      deployedAt: Date.now(),
      status: 'armed',
    }

    this.deployedTokens.push(deployed)
    this.saveToStorage()

    return deployed
  }

  // Deploy honey tokens across all configured chains
  async deployAll(): Promise<DeployedHoneyToken[]> {
    const results: DeployedHoneyToken[] = []

    for (const chainId of this.config.chainIds) {
      for (const tokenConfig of this.config.tokenAmounts) {
        try {
          const deployed = await this.deployHoneyToken(chainId, tokenConfig.amount, tokenConfig.label)
          results.push(deployed)
        } catch (err) {
          console.error(`Failed to deploy honey token on chain ${chainId}:`, err)
        }
      }
    }

    return results
  }

  // Start monitoring a honey token for movement
  startMonitoring(tokenId: string, onTriggered: (alert: TrapAlert) => void): void {
    const token = this.deployedTokens.find(t => t.id === tokenId)
    if (!token || token.status !== 'armed') return

    const provider = this.providers.get(token.chainId)
    if (!provider) return

    // Poll for Transfer events from the honey token contract
    const poll = async () => {
      try {
        const currentBlock = await provider.getBlockNumber()
        const fromBlock = Math.max(0, currentBlock - 100) // Check recent blocks

        const filter = {
          fromBlock,
          toBlock: 'latest',
          topics: [
            ethers.id('Transfer(address,address,uint256)'),
            ethers.zeroPadValue(this.config.walletAddress, 32), // from our wallet
          ],
          address: token.contractAddress,
        }

        const logs = await provider.getLogs(filter)

        if (logs.length > 0) {
          const log = logs[0]
          const iface = new ethers.Interface(['event Transfer(address indexed from, address indexed to, uint256 value)'])
          const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data })

          if (parsed) {
            const drainerAddress = parsed.args.to

            // Update token status
            token.status = 'triggered'
            token.triggeredAt = Date.now()
            token.triggeredBy = drainerAddress
            token.triggerTxHash = log.transactionHash
            token.drainerAddress = drainerAddress
            this.saveToStorage()

            // Trace the drainer
            const drainerTrace = await this.traceDrainer(drainerAddress, token.chainId)

            const alert: TrapAlert = {
              honeyTokenId: tokenId,
              contractAddress: token.contractAddress,
              chainId: token.chainId,
              chainName: token.chainName,
              drainerAddress,
              txHash: log.transactionHash,
              amount: token.amount,
              timestamp: Date.now(),
              drainerTrace,
            }

            onTriggered(alert)

            // Stop monitoring this token
            this.stopMonitoring(tokenId)
          }
        }
      } catch {
        // Silent fail, will retry
      }
    }

    // Poll every 15 seconds
    const interval = setInterval(poll, 15000)
    this.monitoringIntervals.set(tokenId, interval)

    // Initial check
    poll()
  }

  // Stop monitoring a specific token
  stopMonitoring(tokenId: string): void {
    const interval = this.monitoringIntervals.get(tokenId)
    if (interval) {
      clearInterval(interval)
      this.monitoringIntervals.delete(tokenId)
    }
  }

  // Stop all monitoring
  stopAllMonitoring(): void {
    for (const [, interval] of this.monitoringIntervals) {
      clearInterval(interval)
    }
    this.monitoringIntervals.clear()
  }

  // Start monitoring all armed tokens
  startMonitoringAll(onTriggered: (alert: TrapAlert) => void): void {
    for (const token of this.deployedTokens) {
      if (token.status === 'armed') {
        this.startMonitoring(token.id, onTriggered)
      }
    }
  }

  // Trace a drainer address to find related addresses and patterns
  async traceDrainer(drainerAddress: string, chainId: number): Promise<DrainerTraceResult> {
    const provider = this.providers.get(chainId)
    const chain = CHAINS[chainId]

    if (!provider || !chain) {
      return {
        drainerAddress,
        totalDrained: [],
        destinationAddresses: [],
        relatedAddresses: [],
        riskLevel: 'high',
        pattern: 'Unable to trace',
      }
    }

    const destinationAddresses: Set<string> = new Set()
    const relatedAddresses: Set<string> = new Set()
    const totalDrained: { asset: string; amount: string; chainName: string }[] = []

    try {
      const currentBlock = await provider.getBlockNumber()
      const fromBlock = Math.max(0, currentBlock - 10000)

      // Get all outgoing transfers from drainer
      const filter = {
        fromBlock,
        toBlock: 'latest',
        topics: [
          ethers.id('Transfer(address,address,uint256)'),
          ethers.zeroPadValue(drainerAddress, 32),
        ],
      }

      const logs = await provider.getLogs(filter).catch(() => [])
      const iface = new ethers.Interface(['event Transfer(address indexed from, address indexed to, uint256 value)'])

      for (const log of logs.slice(-50)) {
        try {
          const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data })
          if (parsed) {
            const to = parsed.args.to.toLowerCase()
            destinationAddresses.add(to)
            if (to !== drainerAddress.toLowerCase()) {
              relatedAddresses.add(to)
            }
          }
        } catch {}
      }

      // Check native balance of drainer
      const balance = await provider.getBalance(drainerAddress)
      if (balance > BigInt(0)) {
        totalDrained.push({
          asset: chain.nativeCurrency,
          amount: ethers.formatEther(balance),
          chainName: chain.name,
        })
      }
    } catch {
      // Trace partially failed
    }

    return {
      drainerAddress,
      totalDrained,
      destinationAddresses: [...destinationAddresses],
      relatedAddresses: [...relatedAddresses],
      riskLevel: destinationAddresses.size > 5 ? 'critical' : destinationAddresses.size > 2 ? 'high' : 'medium',
      pattern: destinationAddresses.size > 5
        ? 'Multi-hop fund distribution (likely mixer/bridge)'
        : destinationAddresses.size > 2
        ? 'Fund splitting to multiple addresses'
        : 'Direct fund transfer',
    }
  }

  // Get dashboard data
  getDashboardData(): HoneyDashboardData {
    const triggeredTraps = this.deployedTokens.filter(t => t.status === 'triggered')
    const drainerAddresses = [...new Set(
      triggeredTraps
        .map(t => t.drainerAddress)
        .filter(Boolean) as string[]
    )]

    return {
      walletAddress: this.config.walletAddress,
      totalTraps: this.deployedTokens.length,
      activeTraps: this.deployedTokens.filter(t => t.status === 'armed').length,
      triggeredTraps: triggeredTraps.length,
      traps: this.deployedTokens,
      alerts: [], // Alerts are managed separately
      drainerAddresses,
    }
  }

  // Remove a honey token from tracking
  removeToken(tokenId: string): void {
    this.stopMonitoring(tokenId)
    this.deployedTokens = this.deployedTokens.filter(t => t.id !== tokenId)
    this.saveToStorage()
  }

  // Update token status
  updateStatus(tokenId: string, status: TrapStatus): void {
    const token = this.deployedTokens.find(t => t.id === tokenId)
    if (token) {
      token.status = status
      this.saveToStorage()
    }
  }
}
