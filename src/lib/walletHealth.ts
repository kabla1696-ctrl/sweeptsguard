// Wallet Health Score - 0-100 scoring system for wallet safety
import { ethers } from 'ethers'
import { CHAINS } from './chains'

export interface WalletHealthReport {
  address: string
  overallScore: number // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  categories: HealthCategory[]
  recommendations: HealthRecommendation[]
  summary: string
  analyzedAt: string
}

export interface HealthCategory {
  id: string
  name: string
  icon: string
  score: number // 0-100
  maxScore: number
  weight: number // 0-1
  details: string
  subItems: HealthSubItem[]
}

export interface HealthSubItem {
  label: string
  value: string
  status: 'good' | 'warning' | 'danger' | 'info'
  impact: number // positive or negative points
}

export interface HealthRecommendation {
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  action: string
  potentialImprovement: number // points
}

export class WalletHealthScorer {
  private providers: Map<number, ethers.JsonRpcProvider> = new Map()

  constructor() {
    for (const [id, chain] of Object.entries(CHAINS)) {
      this.providers.set(Number(id), new ethers.JsonRpcProvider(chain.rpc))
    }
  }

  private getProvider(chainId: number): ethers.JsonRpcProvider {
    const provider = this.providers.get(chainId)
    if (!provider) throw new Error(`Chain ${chainId} not supported`)
    return provider
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number = 10000): Promise<T> {
    return Promise.race([promise, new Promise<never>((_, r) => setTimeout(() => r(new Error('Timeout')), ms))])
  }

  /**
   * Generate a full health report for a wallet address.
   */
  async analyze(
    address: string,
    chainIds: number[] = [1, 8453, 56, 42161, 137]
  ): Promise<WalletHealthReport> {
    // Run all checks in parallel
    const [approvalRisk, drainerExposure, tokenDiversity, walletAge, txPatterns] = await Promise.all([
      this.checkApprovalRisk(address, chainIds),
      this.checkDrainerExposure(address, chainIds),
      this.checkTokenDiversity(address, chainIds),
      this.checkWalletAge(address, chainIds[0]),
      this.checkTransactionPatterns(address, chainIds[0])
    ])

    const categories: HealthCategory[] = [
      approvalRisk,
      drainerExposure,
      tokenDiversity,
      walletAge,
      txPatterns
    ]

    // Calculate weighted score
    let overallScore = 0
    for (const cat of categories) {
      overallScore += (cat.score / cat.maxScore) * cat.weight * 100
    }
    overallScore = Math.round(Math.max(0, Math.min(100, overallScore)))

    // Generate recommendations
    const recommendations = this.generateRecommendations(categories, overallScore)

    // Determine grade
    const grade = this.getGrade(overallScore)

    return {
      address,
      overallScore,
      grade,
      categories,
      recommendations,
      summary: this.getSummary(overallScore, grade, categories),
      analyzedAt: new Date().toISOString()
    }
  }

  /**
   * Category 1: Approval Risk (weight: 0.30)
   * Checks token approvals and their danger levels.
   */
  private async checkApprovalRisk(address: string, chainIds: number[]): Promise<HealthCategory> {
    const subItems: HealthSubItem[] = []
    let totalApprovals = 0
    let dangerousApprovals = 0
    let maxApprovals = 0

    for (const chainId of chainIds) {
      try {
        const provider = this.getProvider(chainId)
        const chain = CHAINS[chainId]
        const currentBlock = await this.withTimeout(provider.getBlockNumber(), 8000)
        const fromBlock = Math.max(0, currentBlock - 5000)

        const approvalFilter = {
          fromBlock,
          toBlock: 'latest',
          topics: [ethers.id('Approval(address,address,uint256)'), ethers.zeroPadValue(address, 32)]
        }

        const logs = await this.withTimeout(
          provider.getLogs(approvalFilter).catch(() => []),
          8000
        )

        const iface = new ethers.Interface(['event Approval(address indexed owner, address indexed spender, uint256 value)'])
        const MAX_UINT256 = '115792089237316195423570985008687907853269984665640564039457584007913129639935'

        for (const log of logs.slice(-30)) {
          try {
            const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data })
            if (parsed) {
              totalApprovals++
              const amount = parsed.args.value.toString()
              if (amount === MAX_UINT256) {
                dangerousApprovals++
              }
            }
          } catch {}
        }

        if (logs.length > 0) {
          subItems.push({
            label: `${chain.name} Approvals`,
            value: `${logs.length} total, ${dangerousApprovals} unlimited`,
            status: dangerousApprovals > 3 ? 'danger' : dangerousApprovals > 0 ? 'warning' : 'good',
            impact: dangerousApprovals > 3 ? -20 : dangerousApprovals > 0 ? -10 : 0
          })
        }
      } catch {}
    }

    maxApprovals = Math.max(totalApprovals, 1)

    // Score: fewer dangerous approvals = higher score
    let score = 100
    score -= dangerousApprovals * 15
    score -= Math.max(0, totalApprovals - 5) * 3
    score = Math.max(0, Math.min(100, score))

    if (totalApprovals === 0) {
      subItems.push({ label: 'Status', value: 'No approvals found in recent history', status: 'good', impact: 10 })
    }

    return {
      id: 'approval-risk',
      name: 'Approval Risk',
      icon: '🔓',
      score,
      maxScore: 100,
      weight: 0.30,
      details: dangerousApprovals > 0
        ? `Found ${dangerousApprovals} unlimited approvals out of ${totalApprovals} total. Unlimited approvals let contracts spend your tokens freely.`
        : `No dangerous unlimited approvals detected across ${chainIds.length} chains.`,
      subItems
    }
  }

  /**
   * Category 2: Drainer Exposure (weight: 0.30)
   * Checks interactions with known drainer contracts.
   */
  private async checkDrainerExposure(address: string, chainIds: number[]): Promise<HealthCategory> {
    const subItems: HealthSubItem[] = []
    let drainerInteractions = 0
    let delegationFound = false

    // Known drainer addresses
    const KNOWN_DRAINERS = new Set([
      '0xcce0a2ebe17c5e532802896fc8afcaab8abd8ba0',
      '0xb0d6b42f6406d8b9ae980de584c21f517bf0b746',
      '0x354bd0d713d6674605a6a41eea93cf8a8a01dc85',
      '0x56a645ef8cc03631a28be1fc6c803eda7bfbbc5a',
    ])

    for (const chainId of chainIds) {
      try {
        const provider = this.getProvider(chainId)
        const chain = CHAINS[chainId]

        // Check EIP-7702 delegation
        const code = await this.withTimeout(provider.getCode(address), 8000)
        if (code && code.startsWith('0xef0100')) {
          delegationFound = true
          const delegatedTo = '0x' + code.slice(8, 48)
          subItems.push({
            label: `${chain.name} Delegation`,
            value: `Delegated to ${delegatedTo.slice(0, 10)}...`,
            status: 'danger',
            impact: -30
          })
        }

        // Check recent transfers to drainers
        const currentBlock = await this.withTimeout(provider.getBlockNumber(), 8000)
        const fromBlock = Math.max(0, currentBlock - 5000)

        const transferFilter = {
          fromBlock,
          toBlock: 'latest',
          topics: [ethers.id('Transfer(address,address,uint256)'), ethers.zeroPadValue(address, 32)]
        }

        const logs = await this.withTimeout(
          provider.getLogs(transferFilter).catch(() => []),
          8000
        )

        const iface = new ethers.Interface(['event Transfer(address indexed from, address indexed to, uint256 value)'])

        for (const log of logs) {
          try {
            const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data })
            if (parsed && KNOWN_DRAINERS.has(parsed.args.to.toLowerCase())) {
              drainerInteractions++
            }
          } catch {}
        }

        if (drainerInteractions > 0) {
          subItems.push({
            label: `${chain.name} Drain Transfers`,
            value: `${drainerInteractions} transfers to known drainers`,
            status: 'danger',
            impact: -25
          })
        }
      } catch {}
    }

    if (!delegationFound && drainerInteractions === 0) {
      subItems.push({ label: 'Status', value: 'No drainer exposure detected', status: 'good', impact: 10 })
    }

    let score = 100
    if (delegationFound) score -= 40
    score -= drainerInteractions * 15
    score = Math.max(0, Math.min(100, score))

    return {
      id: 'drainer-exposure',
      name: 'Drainer Exposure',
      icon: '🛡️',
      score,
      maxScore: 100,
      weight: 0.30,
      details: delegationFound
        ? '⚠️ EIP-7702 delegation detected — your wallet may be compromised!'
        : drainerInteractions > 0
          ? `Found ${drainerInteractions} transfers to known drainer addresses.`
          : 'No interactions with known drainer contracts.',
      subItems
    }
  }

  /**
   * Category 3: Token Diversity (weight: 0.15)
   * Checks if wallet has a healthy mix of assets.
   */
  private async checkTokenDiversity(address: string, chainIds: number[]): Promise<HealthCategory> {
    const subItems: HealthSubItem[] = []
    let totalTokens = 0
    let chainsWithAssets = 0
    let hasNativeBalance = false

    for (const chainId of chainIds) {
      try {
        const provider = this.getProvider(chainId)
        const chain = CHAINS[chainId]

        // Check native balance
        const balance = await this.withTimeout(provider.getBalance(address), 8000)
        if (balance > ethers.parseEther('0.001')) {
          hasNativeBalance = true
          chainsWithAssets++
          subItems.push({
            label: `${chain.name} ${chain.nativeCurrency}`,
            value: `${parseFloat(ethers.formatEther(balance)).toFixed(4)} ${chain.nativeCurrency}`,
            status: 'good',
            impact: 5
          })
        }

        // Check token count
        const currentBlock = await this.withTimeout(provider.getBlockNumber(), 8000)
        const fromBlock = Math.max(0, currentBlock - 10000)
        const filter = {
          fromBlock,
          toBlock: 'latest',
          topics: [ethers.id('Transfer(address,address,uint256)'), null, ethers.zeroPadValue(address, 32)]
        }

        const logs = await this.withTimeout(
          provider.getLogs(filter).catch(() => []),
          8000
        )
        const uniqueTokens = new Set(logs.map(l => l.address))
        totalTokens += uniqueTokens.size

        if (uniqueTokens.size > 0) {
          subItems.push({
            label: `${chain.name} Tokens`,
            value: `${uniqueTokens.size} unique tokens`,
            status: uniqueTokens.size > 3 ? 'good' : 'info',
            impact: Math.min(uniqueTokens.size, 5)
          })
        }
      } catch {}
    }

    let score = 50 // Base
    if (hasNativeBalance) score += 15
    score += Math.min(chainsWithAssets * 5, 20)
    score += Math.min(totalTokens * 2, 15)
    score = Math.max(0, Math.min(100, score))

    return {
      id: 'token-diversity',
      name: 'Token Diversity',
      icon: '💰',
      score,
      maxScore: 100,
      weight: 0.15,
      details: `Found assets on ${chainsWithAssets} chains with ${totalTokens} unique tokens.`,
      subItems
    }
  }

  /**
   * Category 4: Wallet Age (weight: 0.15)
   * Older wallets with history are generally safer.
   */
  private async checkWalletAge(address: string, chainId: number): Promise<HealthCategory> {
    const subItems: HealthSubItem[] = []
    let score = 30 // Base for unknown age

    try {
      const provider = this.getProvider(chainId)
      const txCount = await this.withTimeout(provider.getTransactionCount(address), 8000)

      // Estimate age from transaction count
      const estimatedAgeDays = txCount > 0 ? Math.floor(txCount * 50 * 12 / 86400) : 0

      if (estimatedAgeDays > 365) {
        score = 90
        subItems.push({
          label: 'Estimated Age',
          value: `~${Math.floor(estimatedAgeDays / 365)} year(s)`,
          status: 'good',
          impact: 30
        })
      } else if (estimatedAgeDays > 90) {
        score = 70
        subItems.push({
          label: 'Estimated Age',
          value: `~${estimatedAgeDays} days`,
          status: 'good',
          impact: 15
        })
      } else if (estimatedAgeDays > 30) {
        score = 50
        subItems.push({
          label: 'Estimated Age',
          value: `~${estimatedAgeDays} days`,
          status: 'warning',
          impact: 5
        })
      } else {
        score = 30
        subItems.push({
          label: 'Estimated Age',
          value: txCount === 0 ? 'No transactions' : 'Less than 30 days',
          status: txCount === 0 ? 'info' : 'warning',
          impact: -5
        })
      }

      subItems.push({
        label: 'Transaction Count',
        value: `${txCount} transactions`,
        status: txCount > 50 ? 'good' : txCount > 10 ? 'info' : 'warning',
        impact: Math.min(Math.floor(txCount / 10), 10)
      })

      // Check balance
      const balance = await this.withTimeout(provider.getBalance(address), 8000)
      if (balance > ethers.parseEther('1')) {
        score += 10
        subItems.push({
          label: 'ETH Balance',
          value: `${parseFloat(ethers.formatEther(balance)).toFixed(4)} ETH`,
          status: 'good',
          impact: 10
        })
      }
    } catch {
      subItems.push({ label: 'Status', value: 'Unable to check age', status: 'info', impact: 0 })
    }

    return {
      id: 'wallet-age',
      name: 'Wallet Age & History',
      icon: '📅',
      score: Math.max(0, Math.min(100, score)),
      maxScore: 100,
      weight: 0.15,
      details: 'Older wallets with more transaction history are generally more trustworthy.',
      subItems
    }
  }

  /**
   * Category 5: Transaction Patterns (weight: 0.10)
   * Analyzes recent transaction behavior for anomalies.
   */
  private async checkTransactionPatterns(address: string, chainId: number): Promise<HealthCategory> {
    const subItems: HealthSubItem[] = []
    let score = 70 // Base — assume healthy unless proven otherwise

    try {
      const provider = this.getProvider(chainId)
      const currentBlock = await this.withTimeout(provider.getBlockNumber(), 8000)
      const fromBlock = Math.max(0, currentBlock - 2000)

      // Check outgoing transfers
      const outgoingFilter = {
        fromBlock,
        toBlock: 'latest',
        topics: [ethers.id('Transfer(address,address,uint256)'), ethers.zeroPadValue(address, 32)]
      }

      // Check incoming transfers
      const incomingFilter = {
        fromBlock,
        toBlock: 'latest',
        topics: [ethers.id('Transfer(address,address,uint256)'), null, ethers.zeroPadValue(address, 32)]
      }

      const [outgoing, incoming] = await Promise.all([
        this.withTimeout(provider.getLogs(outgoingFilter).catch(() => []), 8000),
        this.withTimeout(provider.getLogs(incomingFilter).catch(() => []), 8000)
      ])

      const outgoingCount = outgoing.length
      const incomingCount = incoming.length

      // High outgoing with low incoming = suspicious
      if (outgoingCount > 20 && incomingCount < 3) {
        score -= 20
        subItems.push({
          label: 'Transfer Pattern',
          value: `${outgoingCount} outgoing vs ${incomingCount} incoming`,
          status: 'danger',
          impact: -20
        })
      } else {
        subItems.push({
          label: 'Transfer Activity',
          value: `${outgoingCount} outgoing, ${incomingCount} incoming`,
          status: 'good',
          impact: 5
        })
      }

      // Check approval events
      const approvalFilter = {
        fromBlock,
        toBlock: 'latest',
        topics: [ethers.id('Approval(address,address,uint256)'), ethers.zeroPadValue(address, 32)]
      }
      const approvals = await this.withTimeout(
        provider.getLogs(approvalFilter).catch(() => []),
        8000
      )

      if (approvals.length > 10) {
        score -= 15
        subItems.push({
          label: 'Recent Approvals',
          value: `${approvals.length} approvals in recent blocks`,
          status: 'warning',
          impact: -15
        })
      } else {
        subItems.push({
          label: 'Recent Approvals',
          value: `${approvals.length} approvals`,
          status: approvals.length > 5 ? 'warning' : 'good',
          impact: approvals.length > 5 ? -5 : 0
        })
      }
    } catch {
      subItems.push({ label: 'Status', value: 'Unable to analyze patterns', status: 'info', impact: 0 })
    }

    return {
      id: 'tx-patterns',
      name: 'Transaction Patterns',
      icon: '📊',
      score: Math.max(0, Math.min(100, score)),
      maxScore: 100,
      weight: 0.10,
      details: 'Analyzes recent transaction behavior for anomalies that could indicate compromise.',
      subItems
    }
  }

  private generateRecommendations(categories: HealthCategory[], overallScore: number): HealthRecommendation[] {
    const recs: HealthRecommendation[] = []

    // Check approval risk
    const approvalCat = categories.find(c => c.id === 'approval-risk')
    if (approvalCat && approvalCat.score < 70) {
      recs.push({
        priority: 'high',
        title: 'Revoke Dangerous Approvals',
        description: 'You have unlimited token approvals that could let contracts drain your tokens.',
        action: 'Use the Token Approval Dashboard to revoke unlimited approvals.',
        potentialImprovement: 20
      })
    }

    // Check drainer exposure
    const drainerCat = categories.find(c => c.id === 'drainer-exposure')
    if (drainerCat && drainerCat.score < 70) {
      recs.push({
        priority: 'high',
        title: 'Address Drainer Exposure',
        description: 'Your wallet has interacted with known drainer contracts.',
        action: 'Check the AI Threat Intelligence page for detailed analysis.',
        potentialImprovement: 30
      })
    }

    // Check token diversity
    const diversityCat = categories.find(c => c.id === 'token-diversity')
    if (diversityCat && diversityCat.score < 40) {
      recs.push({
        priority: 'low',
        title: 'Diversify Your Holdings',
        description: 'Your wallet has limited asset diversity across chains.',
        action: 'Consider bridging assets to multiple chains for resilience.',
        potentialImprovement: 10
      })
    }

    // Check wallet age
    const ageCat = categories.find(c => c.id === 'wallet-age')
    if (ageCat && ageCat.score < 40) {
      recs.push({
        priority: 'medium',
        title: 'Build Wallet History',
        description: 'New wallets with little history are harder to assess for trustworthiness.',
        action: 'Continue using the wallet to build a transaction history.',
        potentialImprovement: 15
      })
    }

    // Overall recommendations
    if (overallScore < 50) {
      recs.push({
        priority: 'high',
        title: 'Set Up Auto-Sweep Protection',
        description: 'Your wallet health score is low. Set up protection to secure incoming funds.',
        action: 'Go to Dashboard and enable auto-sweep to a safe wallet.',
        potentialImprovement: 25
      })
    }

    return recs.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
  }

  private getGrade(score: number): WalletHealthReport['grade'] {
    if (score >= 90) return 'A'
    if (score >= 75) return 'B'
    if (score >= 60) return 'C'
    if (score >= 40) return 'D'
    return 'F'
  }

  private getSummary(score: number, grade: string, categories: HealthCategory[]): string {
    const worstCat = categories.reduce((worst, cat) =>
      (cat.score / cat.maxScore) < (worst.score / worst.maxScore) ? cat : worst
    )

    if (score >= 80) {
      return `Your wallet health is excellent (Grade ${grade}). Your wallet shows strong security practices with minimal risk exposure.`
    }
    if (score >= 60) {
      return `Your wallet health is good (Grade ${grade}), but there's room for improvement. Main concern: ${worstCat.name}.`
    }
    if (score >= 40) {
      return `Your wallet health needs attention (Grade ${grade}). ${worstCat.name} is your weakest area. Consider following the recommendations below.`
    }
    return `Your wallet health is critical (Grade ${grade}). Immediate action required — ${worstCat.name} is severely impacting your score.`
  }
}

export const walletHealthScorer = new WalletHealthScorer()
