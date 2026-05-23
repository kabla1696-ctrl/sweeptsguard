import { ethers } from 'ethers'
import { CHAINS } from './chains'
import { isExchangeWallet, isKnownDrainer } from './draindb'

// Fund Recovery System
// Deep analysis of stolen fund movement + recovery strategy

export interface RecoveryConfig {
  victimAddress: string
  drainerAddress: string
  chainIds: number[]
}

export interface FundMovement {
  txHash: string
  blockNumber: number
  timestamp: number
  from: string
  to: string
  value: string
  asset: string
  chainId: number
  chainName: string
  classification: 'drainer_wallet' | 'exchange_deposit' | 'mixer' | 'bridge' | 'dex_swap' | 'unknown' | 'consolidation'
  exchangeName?: string
  riskLevel: 'high' | 'medium' | 'low'
}

export interface RecoveryLead {
  type: 'exchange_deposit' | 'drainer_wallet' | 'bridge' | 'dex_swap' | 'mixer'
  description: string
  actionable: boolean
  action?: string
  priority: number
  details: Record<string, unknown>
}

export interface RecoveryReport {
  victimAddress: string
  drainerAddress: string
  totalDrained: string
  totalDrainedUSD: number
  movements: FundMovement[]
  leads: RecoveryLead[]
  recommendations: string[]
  exchanges: { name: string; depositTx: string; amount: string; timestamp: number }[]
  timeline: { date: string; event: string; amount?: string }[]
}

export class FundRecovery {
  private providers: Map<number, ethers.JsonRpcProvider> = new Map()
  private config: RecoveryConfig

  constructor(config: RecoveryConfig) {
    this.config = config
    for (const [id, chain] of Object.entries(CHAINS)) {
      this.providers.set(Number(id), new ethers.JsonRpcProvider(chain.rpc))
    }
  }

  // Deep scan: trace ALL fund movements from drainer
  async traceDrainerOutflows(): Promise<FundMovement[]> {
    const movements: FundMovement[] = []

    for (const chainId of this.config.chainIds) {
      const provider = this.providers.get(chainId)
      const chain = CHAINS[chainId]
      if (!provider || !chain) continue

      try {
        // Get all ETH transfers FROM drainer
        const currentBlock = await provider.getBlockNumber()
        const fromBlock = Math.max(0, currentBlock - 100000) // ~2 weeks

        // Scan native transfers
        const balanceChanges = await this.scanBalanceChanges(
          this.config.drainerAddress,
          provider,
          fromBlock,
          currentBlock
        )

        for (const change of balanceChanges) {
          const classification = await this.classifyDestination(change.to, provider, chainId)
          movements.push({
            ...change,
            chainId,
            chainName: chain.name,
            asset: chain.nativeCurrency,
            classification: classification.type,
            exchangeName: classification.exchange,
            riskLevel: classification.risk
          })
        }

        // Scan ERC-20 transfers
        const erc20Transfers = await this.scanERC20Transfers(
          this.config.drainerAddress,
          provider,
          fromBlock,
          currentBlock,
          chainId
        )

        movements.push(...erc20Transfers)

      } catch (err) {
        console.error(`Failed to scan chain ${chainId}:`, err)
      }
    }

    return movements.sort((a, b) => b.timestamp - a.timestamp)
  }

  // Scan balance changes for an address
  private async scanBalanceChanges(
    address: string,
    provider: ethers.JsonRpcProvider,
    fromBlock: number,
    toBlock: number
  ): Promise<Omit<FundMovement, 'chainId' | 'chainName' | 'asset'>[]> {
    const movements: Omit<FundMovement, 'chainId' | 'chainName' | 'asset'>[] = []

    // Get transaction history by checking blocks
    const batchSize = 100
    for (let i = fromBlock; i <= toBlock; i += batchSize) {
      const end = Math.min(i + batchSize - 1, toBlock)
      
      try {
        // Check for incoming ETH
        const logs = await provider.getLogs({
          fromBlock: i,
          toBlock: end,
          topics: [
            ethers.id('Transfer(address,address,uint256)'),
            null,
            ethers.zeroPadValue(address, 32)
          ]
        }).catch(() => [])

        for (const log of logs) {
          const from = '0x' + log.topics[1].slice(26)
          const value = BigInt(log.data)
          const block = await provider.getBlock(log.blockNumber)

          if (from.toLowerCase() === this.config.victimAddress.toLowerCase()) {
            movements.push({
              txHash: log.transactionHash,
              blockNumber: log.blockNumber,
              timestamp: block ? block.timestamp * 1000 : Date.now(),
              from: this.config.victimAddress,
              to: address,
              value: ethers.formatEther(value),
              classification: 'drainer_wallet',
              riskLevel: 'high'
            })
          }
        }
      } catch {
        // Skip failed batches
      }
    }

    return movements
  }

  // Scan ERC-20 transfers
  private async scanERC20Transfers(
    address: string,
    provider: ethers.JsonRpcProvider,
    fromBlock: number,
    toBlock: number,
    chainId: number
  ): Promise<FundMovement[]> {
    const movements: FundMovement[] = []
    const chain = CHAINS[chainId]

    try {
      const logs = await provider.getLogs({
        fromBlock,
        toBlock,
        topics: [
          ethers.id('Transfer(address,address,uint256)'),
          ethers.zeroPadValue(address, 32)
        ]
      }).catch(() => [])

      for (const log of logs) {
        const to = '0x' + log.topics[2].slice(26)
        const value = BigInt(log.data)
        const block = await provider.getBlock(log.blockNumber)

        // Get token info
        const tokenContract = new ethers.Contract(log.address, [
          'function symbol() view returns (string)',
          'function decimals() view returns (uint8)'
        ], provider)

        let symbol = 'UNKNOWN'
        let decimals = 18
        try {
          symbol = await tokenContract.symbol()
          decimals = await tokenContract.decimals()
        } catch {}

        const classification = await this.classifyDestination(to, provider, chainId)

        movements.push({
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          timestamp: block ? block.timestamp * 1000 : Date.now(),
          from: address,
          to,
          value: ethers.formatUnits(value, decimals),
          asset: symbol,
          chainId,
          chainName: chain?.name || 'Unknown',
          classification: classification.type,
          exchangeName: classification.exchange,
          riskLevel: classification.risk
        })
      }
    } catch {}

    return movements
  }

  // Classify destination address
  private async classifyDestination(
    address: string,
    provider: ethers.JsonRpcProvider,
    chainId: number
  ): Promise<{ type: FundMovement['classification']; exchange?: string; risk: FundMovement['riskLevel'] }> {
    const normalized = address.toLowerCase()

    // Check exchange wallets
    const exchange = isExchangeWallet(normalized)
    if (exchange) {
      return { type: 'exchange_deposit', exchange: exchange.name, risk: 'high' }
    }

    // Check known drainer
    const drainer = isKnownDrainer(normalized)
    if (drainer) {
      return { type: 'drainer_wallet', risk: 'high' }
    }

    // Check if it's a contract (potential mixer/bridge)
    const code = await provider.getCode(address)
    if (code !== '0x') {
      // Check for known mixer patterns
      if (normalized.includes('tornado') || normalized.includes('mixer')) {
        return { type: 'mixer', risk: 'low' }
      }
      return { type: 'dex_swap', risk: 'medium' }
    }

    return { type: 'unknown', risk: 'medium' }
  }

  // Generate recovery leads
  async generateLeads(movements: FundMovement[]): Promise<RecoveryLead[]> {
    const leads: RecoveryLead[] = []

    // Find exchange deposits (BEST recovery opportunity)
    const exchangeDeposits = movements.filter(m => m.classification === 'exchange_deposit')
    for (const deposit of exchangeDeposits) {
      leads.push({
        type: 'exchange_deposit',
        description: `Funds deposited to ${deposit.exchangeName} via tx ${deposit.txHash.slice(0, 10)}...`,
        actionable: true,
        action: `File freeze request with ${deposit.exchangeName}. Provide tx hash, police report, and victim statement.`,
        priority: 1,
        details: {
          exchange: deposit.exchangeName,
          txHash: deposit.txHash,
          amount: deposit.value,
          asset: deposit.asset,
          chain: deposit.chainName,
          timestamp: deposit.timestamp
        }
      })
    }

    // Find drainer wallet (funds still there)
    const drainerWallet = movements.filter(m => m.classification === 'drainer_wallet')
    if (drainerWallet.length > 0) {
      leads.push({
        type: 'drainer_wallet',
        description: `Funds held in drainer wallet ${this.config.drainerAddress.slice(0, 10)}...`,
        actionable: true,
        action: 'Monitor drainer wallet. If funds move to exchange, file freeze request immediately.',
        priority: 2,
        details: {
          drainerAddress: this.config.drainerAddress,
          totalAmount: drainerWallet.reduce((sum, m) => sum + parseFloat(m.value), 0).toString()
        }
      })
    }

    // Find bridge transfers
    const bridgeTransfers = movements.filter(m => m.classification === 'bridge')
    if (bridgeTransfers.length > 0) {
      leads.push({
        type: 'bridge',
        description: 'Funds bridged to another chain. Track destination chain.',
        actionable: true,
        action: 'Track funds on destination chain. File reports on both chains.',
        priority: 3,
        details: {
          bridges: bridgeTransfers.map(b => b.txHash)
        }
      })
    }

    // Find mixer usage
    const mixerDeposits = movements.filter(m => m.classification === 'mixer')
    if (mixerDeposits.length > 0) {
      leads.push({
        type: 'mixer',
        description: 'Funds sent to mixer (Tornado Cash). Recovery very difficult.',
        actionable: false,
        action: 'Monitor mixer withdrawal addresses. Use Chainalysis/Elliptic for de-mixing.',
        priority: 5,
        details: {
          mixerTxs: mixerDeposits.map(m => m.txHash)
        }
      })
    }

    return leads.sort((a, b) => a.priority - b.priority)
  }

  // Generate full recovery report
  async generateReport(): Promise<RecoveryReport> {
    const movements = await this.traceDrainerOutflows()
    const leads = await this.generateLeads(movements)

    const totalDrained = movements
      .filter(m => m.from.toLowerCase() === this.config.victimAddress.toLowerCase())
      .reduce((sum, m) => sum + parseFloat(m.value), 0)

    const exchanges = movements
      .filter(m => m.classification === 'exchange_deposit')
      .map(m => ({
        name: m.exchangeName || 'Unknown',
        depositTx: m.txHash,
        amount: m.value,
        timestamp: m.timestamp
      }))

    const timeline = movements.map(m => ({
      date: new Date(m.timestamp).toISOString(),
      event: `${m.classification}: ${m.value} ${m.asset} → ${m.to.slice(0, 10)}...`,
      amount: m.value
    }))

    const recommendations = this.generateRecommendations(leads, movements)

    return {
      victimAddress: this.config.victimAddress,
      drainerAddress: this.config.drainerAddress,
      totalDrained: totalDrained.toFixed(6),
      totalDrainedUSD: 0, // Would need price API
      movements,
      leads,
      recommendations,
      exchanges,
      timeline
    }
  }

  // Generate recommendations
  private generateRecommendations(leads: RecoveryLead[], movements: FundMovement[]): string[] {
    const recs: string[] = []

    if (leads.some(l => l.type === 'exchange_deposit')) {
      recs.push('🏦 EXCHANGE FREEZE: File freeze requests immediately. Most exchanges have 24-72h freeze window.')
      recs.push('📋 DOCUMENTATION: Prepare police report, victim statement, and all transaction hashes.')
    }

    if (leads.some(l => l.type === 'drainer_wallet')) {
      recs.push('👁️ MONITOR: Set up 24/7 monitoring on drainer wallet. Be ready to file freeze if funds move.')
    }

    if (leads.some(l => l.type === 'mixer')) {
      recs.push('🔬 ANALYTICS: Consider Chainalysis or Elliptic for mixer de-anonymization.')
    }

    recs.push('👮 LAW ENFORCEMENT: File reports with IC3 (FBI), local cybercrime unit, and relevant agencies.')
    recs.push('⚖️ LEGAL: Consult crypto-specialized lawyer for potential court orders.')
    recs.push('📱 COMMUNITY: Report to ScamSniffer, SlowMist, and community databases.')

    return recs
  }
}

export const createRecovery = (config: RecoveryConfig) => new FundRecovery(config)
