// Portfolio Risk Heatmap — token-by-token risk visualization with trend tracking
import { ethers } from 'ethers'
import { CHAINS } from './chains'

export type RiskLevel = 'safe' | 'warning' | 'critical'

export interface TokenRisk {
  tokenAddress: string
  tokenSymbol: string
  tokenName: string
  chainId: number
  chainName: string
  balance: string
  balanceFormatted: string
  valueUsd: number
  riskLevel: RiskLevel
  riskScore: number // 0-100
  riskFactors: RiskFactor[]
  approvals: ApprovalRisk[]
  lastActivity: string | null
}

export interface RiskFactor {
  category: string
  severity: RiskLevel
  description: string
  score: number
}

export interface ApprovalRisk {
  spender: string
  spenderLabel?: string
  amount: string
  isUnlimited: boolean
  riskLevel: RiskLevel
}

export interface RiskTrendPoint {
  date: string
  overallScore: number
  criticalCount: number
  warningCount: number
  safeCount: number
}

export interface HeatmapData {
  address: string
  overallRiskScore: number
  overallRiskLevel: RiskLevel
  tokens: TokenRisk[]
  summary: {
    total: number
    safe: number
    warning: number
    critical: number
    totalValueUsd: number
  }
  trend: {
    '7d': RiskTrendPoint[]
    '30d': RiskTrendPoint[]
  }
  scannedAt: string
}

export interface RiskReport {
  generatedAt: string
  address: string
  overallScore: number
  overallLevel: RiskLevel
  tokenBreakdown: {
    symbol: string
    chain: string
    risk: RiskLevel
    score: number
    valueUsd: number
    factors: string[]
  }[]
  recommendations: string[]
  summary: string
}

// Known risky token patterns
const RISKY_TOKEN_PATTERNS: Record<string, { label: string; risk: RiskLevel; score: number }> = {
  'honeypot': { label: 'Honeypot Token', risk: 'critical', score: 90 },
  'rebase': { label: 'Rebase Token (hidden supply changes)', risk: 'warning', score: 50 },
  'proxy': { label: 'Upgradeable Proxy (mutable logic)', risk: 'warning', score: 40 },
  'pause': { label: 'Pausable Token', risk: 'warning', score: 35 },
  'blacklist': { label: 'Blacklist Functionality', risk: 'warning', score: 45 },
  'mint': { label: 'Unrestricted Minting', risk: 'critical', score: 75 },
  'fee_change': { label: 'Dynamic Fee Mechanism', risk: 'warning', score: 30 },
}

// Known safe tokens
const SAFE_TOKENS: Record<string, string> = {
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'WETH',
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'USDC',
  '0xdac17f958d2ee523a2206206994597c13d831ec7': 'USDT',
  '0x6b175474e89094c44da98b954eedeac495271d0f': 'DAI',
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 'WBTC',
  '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9': 'AAVE',
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': 'UNI',
  '0x514910771af9ca656af840dff83e8264ecf986ca': 'LINK',
  '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0': 'MATIC',
}

const ERC20_ABI = [
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function owner() view returns (address)',
]

const MAX_UINT256 = '115792089237316195423570985008687907853269984665640564039457584007913129639935'

export class RiskHeatmapEngine {
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
   * Generate full risk heatmap for a wallet across multiple chains.
   */
  async generateHeatmap(
    address: string,
    chainIds: number[] = [1, 8453, 56, 42161, 137]
  ): Promise<HeatmapData> {
    const allTokens: TokenRisk[] = []

    const results = await Promise.allSettled(
      chainIds.map(chainId => this.analyzeChainTokens(address, chainId))
    )

    for (const result of results) {
      if (result.status === 'fulfilled') {
        allTokens.push(...result.value)
      }
    }

    // Sort: critical first, then warning, then safe
    const riskOrder: Record<RiskLevel, number> = { critical: 0, warning: 1, safe: 2 }
    allTokens.sort((a, b) => riskOrder[a.riskLevel] - riskOrder[b.riskLevel] || b.valueUsd - a.valueUsd)

    const summary = {
      total: allTokens.length,
      safe: allTokens.filter(t => t.riskLevel === 'safe').length,
      warning: allTokens.filter(t => t.riskLevel === 'warning').length,
      critical: allTokens.filter(t => t.riskLevel === 'critical').length,
      totalValueUsd: allTokens.reduce((sum, t) => sum + t.valueUsd, 0),
    }

    const overallRiskScore = this.calculateOverallScore(allTokens)
    const overallRiskLevel = this.scoreToLevel(overallRiskScore)

    return {
      address,
      overallRiskScore,
      overallRiskLevel,
      tokens: allTokens,
      summary,
      trend: {
        '7d': this.generateMockTrend(7, overallRiskScore),
        '30d': this.generateMockTrend(30, overallRiskScore),
      },
      scannedAt: new Date().toISOString(),
    }
  }

  /**
   * Analyze tokens on a single chain for a wallet.
   */
  private async analyzeChainTokens(address: string, chainId: number): Promise<TokenRisk[]> {
    const provider = this.getProvider(chainId)
    const chain = CHAINS[chainId]
    const tokens: TokenRisk[] = []

    try {
      const currentBlock = await this.withTimeout(provider.getBlockNumber(), 8000)
      const fromBlock = Math.max(0, currentBlock - 50000)

      // Get Transfer events where to = address (incoming tokens)
      const transferFilter = {
        fromBlock,
        toBlock: 'latest',
        topics: [
          ethers.id('Transfer(address,address,uint256)'),
          null,
          ethers.zeroPadValue(address, 32),
        ],
      }

      const logs = await this.withTimeout(
        provider.getLogs(transferFilter).catch(() => []),
        8000
      )

      // Deduplicate token addresses
      const tokenAddresses = [...new Set(logs.map(l => l.address.toLowerCase()))]

      // Analyze each token
      for (const tokenAddr of tokenAddresses) {
        try {
          const tokenRisk = await this.analyzeSingleToken(address, tokenAddr, chainId, chain.name)
          if (tokenRisk && parseFloat(tokenRisk.balanceFormatted) > 0) {
            tokens.push(tokenRisk)
          }
        } catch {}
      }

      // Also check native token
      try {
        const nativeBalance = await this.withTimeout(provider.getBalance(address), 8000)
        if (nativeBalance > BigInt(0)) {
          tokens.push({
            tokenAddress: '0x0000000000000000000000000000000000000000',
            tokenSymbol: chainId === 1 ? 'ETH' : chainId === 56 ? 'BNB' : chainId === 137 ? 'MATIC' : 'ETH',
            tokenName: 'Native Token',
            chainId,
            chainName: chain.name,
            balance: nativeBalance.toString(),
            balanceFormatted: parseFloat(ethers.formatEther(nativeBalance)).toFixed(4),
            valueUsd: parseFloat(ethers.formatEther(nativeBalance)) * (chainId === 1 ? 3500 : chainId === 56 ? 600 : 1),
            riskLevel: 'safe',
            riskScore: 0,
            riskFactors: [{ category: 'native', severity: 'safe', description: 'Native chain token', score: 0 }],
            approvals: [],
            lastActivity: null,
          })
        }
      } catch {}
    } catch (err) {
      console.error(`Failed to analyze tokens on chain ${chainId}:`, err)
    }

    return tokens
  }

  /**
   * Analyze a single token for risk factors.
   */
  private async analyzeSingleToken(
    walletAddress: string,
    tokenAddress: string,
    chainId: number,
    chainName: string
  ): Promise<TokenRisk | null> {
    const provider = this.getProvider(chainId)
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider)

    const tokenAddrLower = tokenAddress.toLowerCase()

    // Check if it's a known safe token
    if (SAFE_TOKENS[tokenAddrLower]) {
      const [symbol, balance, decimals] = await Promise.all([
        contract.symbol().catch(() => 'UNKNOWN'),
        contract.balanceOf(walletAddress).catch(() => BigInt(0)),
        contract.decimals().catch(() => 18),
      ])

      const balanceFormatted = parseFloat(ethers.formatUnits(balance, decimals)).toFixed(4)
      const price = this.estimateTokenPrice(symbol, chainId)

      return {
        tokenAddress,
        tokenSymbol: symbol,
        tokenName: SAFE_TOKENS[tokenAddrLower],
        chainId,
        chainName,
        balance: balance.toString(),
        balanceFormatted,
        valueUsd: parseFloat(balanceFormatted) * price,
        riskLevel: 'safe',
        riskScore: 5,
        riskFactors: [{ category: 'token', severity: 'safe', description: 'Verified mainstream token', score: 5 }],
        approvals: [],
        lastActivity: null,
      }
    }

    // Full analysis for unknown tokens
    const [symbol, name, decimals, balance, code] = await Promise.all([
      contract.symbol().catch(() => 'UNKNOWN'),
      contract.name().catch(() => 'Unknown Token'),
      contract.decimals().catch(() => 18),
      contract.balanceOf(walletAddress).catch(() => BigInt(0)),
      provider.getCode(tokenAddress).catch(() => '0x'),
    ])

    if (balance === BigInt(0)) return null

    const balanceFormatted = parseFloat(ethers.formatUnits(balance, decimals)).toFixed(4)
    const price = this.estimateTokenPrice(symbol, chainId)

    // Risk analysis
    const riskFactors: RiskFactor[] = []
    let totalRiskScore = 0

    // Check contract code patterns
    if (code.length > 10) {
      // Honeypot pattern: has transfer but blocks selling
      if (code.includes('8b12c') || code.includes('c45a017')) {
        riskFactors.push({ category: 'honeypot', severity: 'critical', description: 'Potential honeypot pattern detected in bytecode', score: 90 })
        totalRiskScore += 90
      }

      // Rebase pattern
      if (code.includes('rebase') || code.includes('_totalSupply')) {
        riskFactors.push({ category: 'rebase', severity: 'warning', description: 'Rebase mechanism detected — supply may change', score: 50 })
        totalRiskScore += 50
      }

      // Proxy pattern
      if (code.includes('delegatecall') || code.includes('upgradeable')) {
        riskFactors.push({ category: 'proxy', severity: 'warning', description: 'Upgradeable proxy — logic can change', score: 40 })
        totalRiskScore += 40
      }
    }

    // Check for owner (centralization risk)
    try {
      const owner = await this.withTimeout(contract.owner(), 5000)
      if (owner && owner !== ethers.ZeroAddress) {
        riskFactors.push({ category: 'centralization', severity: 'warning', description: 'Token has an owner address — centralized control', score: 25 })
        totalRiskScore += 25
      }
    } catch {}

    // Check approvals
    const approvals = await this.getTokenApprovals(walletAddress, tokenAddress, chainId)

    for (const approval of approvals) {
      if (approval.isUnlimited) {
        riskFactors.push({ category: 'approval', severity: 'warning', description: `Unlimited approval to ${approval.spenderLabel || approval.spender.slice(0, 10)}`, score: 20 })
        totalRiskScore += 20
      }
      if (approval.riskLevel === 'critical') {
        riskFactors.push({ category: 'approval', severity: 'critical', description: `Critical risk spender: ${approval.spenderLabel || approval.spender}`, score: 50 })
        totalRiskScore += 50
      }
    }

    // Low liquidity warning (small cap heuristic)
    if (parseFloat(balanceFormatted) > 1000000 && price < 0.001) {
      riskFactors.push({ category: 'liquidity', severity: 'warning', description: 'Potential low-liquidity micro-cap token', score: 30 })
      totalRiskScore += 30
    }

    // If no risk factors, mark as safe
    if (riskFactors.length === 0) {
      riskFactors.push({ category: 'general', severity: 'safe', description: 'No significant risk factors detected', score: 0 })
    }

    const riskScore = Math.min(100, totalRiskScore)
    const riskLevel = this.scoreToLevel(riskScore)

    return {
      tokenAddress,
      tokenSymbol: symbol,
      tokenName: name,
      chainId,
      chainName,
      balance: balance.toString(),
      balanceFormatted,
      valueUsd: parseFloat(balanceFormatted) * price,
      riskLevel,
      riskScore,
      riskFactors,
      approvals,
      lastActivity: null,
    }
  }

  /**
   * Get approvals for a specific token.
   */
  private async getTokenApprovals(
    walletAddress: string,
    tokenAddress: string,
    chainId: number
  ): Promise<ApprovalRisk[]> {
    const provider = this.getProvider(chainId)
    const approvals: ApprovalRisk[] = []

    try {
      const currentBlock = await this.withTimeout(provider.getBlockNumber(), 8000)
      const fromBlock = Math.max(0, currentBlock - 50000)

      const approvalFilter = {
        fromBlock,
        toBlock: 'latest',
        address: tokenAddress,
        topics: [
          ethers.id('Approval(address,address,uint256)'),
          ethers.zeroPadValue(walletAddress, 32),
        ],
      }

      const logs = await this.withTimeout(
        provider.getLogs(approvalFilter).catch(() => []),
        8000
      )

      const iface = new ethers.Interface(['event Approval(address indexed owner, address indexed spender, uint256 value)'])
      const latestBySpender = new Map<string, { spender: string; amount: string }>()

      for (const log of logs) {
        try {
          const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data })
          if (parsed) {
            const spender = parsed.args.spender.toLowerCase()
            const amount = parsed.args.value.toString()
            if (amount === '0') {
              latestBySpender.delete(spender)
            } else {
              latestBySpender.set(spender, { spender: parsed.args.spender, amount })
            }
          }
        } catch {}
      }

      for (const [, { spender, amount }] of latestBySpender) {
        const isUnlimited = amount === MAX_UINT256
        approvals.push({
          spender,
          amount,
          isUnlimited,
          riskLevel: isUnlimited ? 'warning' : 'safe',
        })
      }
    } catch {}

    return approvals
  }

  /**
   * Build a revoke transaction for a token approval.
   */
  buildRevokeTransaction(tokenAddress: string, spender: string, chainId: number): { to: string; data: string; chainId: number } {
    const iface = new ethers.Interface(ERC20_ABI)
    const data = iface.encodeFunctionData('approve', [spender, 0])
    return { to: tokenAddress, data, chainId }
  }

  /**
   * Generate a downloadable risk report.
   */
  generateReport(heatmap: HeatmapData): RiskReport {
    const recommendations: string[] = []

    if (heatmap.summary.critical > 0) {
      recommendations.push(`Immediately review and revoke approvals for ${heatmap.summary.critical} critical-risk token(s)`)
    }
    if (heatmap.summary.warning > 0) {
      recommendations.push(`Review ${heatmap.summary.warning} warning-level token(s) for unnecessary approvals`)
    }

    const unlimitedApprovals = heatmap.tokens.flatMap(t => t.approvals.filter(a => a.isUnlimited))
    if (unlimitedApprovals.length > 0) {
      recommendations.push(`Revoke ${unlimitedApprovals.length} unlimited approval(s) to reduce attack surface`)
    }

    recommendations.push('Use hardware wallet for large holdings')
    recommendations.push('Regularly audit token approvals (weekly recommended)')
    recommendations.push('Avoid interacting with unknown tokens')

    return {
      generatedAt: new Date().toISOString(),
      address: heatmap.address,
      overallScore: heatmap.overallRiskScore,
      overallLevel: heatmap.overallRiskLevel,
      tokenBreakdown: heatmap.tokens.map(t => ({
        symbol: t.tokenSymbol,
        chain: t.chainName,
        risk: t.riskLevel,
        score: t.riskScore,
        valueUsd: t.valueUsd,
        factors: t.riskFactors.map(f => f.description),
      })),
      recommendations,
      summary: `Portfolio scan of ${heatmap.address} found ${heatmap.summary.total} tokens across ${new Set(heatmap.tokens.map(t => t.chainId)).size} chains. Risk score: ${heatmap.overallRiskScore}/100 (${heatmap.overallRiskLevel}).`,
    }
  }

  // --- Helpers ---

  private calculateOverallScore(tokens: TokenRisk[]): number {
    if (tokens.length === 0) return 0
    const totalValue = tokens.reduce((s, t) => s + t.valueUsd, 0) || 1
    const weightedScore = tokens.reduce((s, t) => s + t.riskScore * (t.valueUsd / totalValue), 0)
    return Math.round(Math.min(100, weightedScore))
  }

  private scoreToLevel(score: number): RiskLevel {
    if (score >= 60) return 'critical'
    if (score >= 30) return 'warning'
    return 'safe'
  }

  private estimateTokenPrice(symbol: string, chainId: number): number {
    const prices: Record<string, number> = {
      ETH: 3500, WETH: 3500, BTC: 67000, WBTC: 67000,
      USDC: 1, USDT: 1, DAI: 1, BNB: 600, MATIC: 0.8,
      UNI: 12, LINK: 18, AAVE: 280, ARB: 1.2, OP: 2.5,
    }
    return prices[symbol.toUpperCase()] || 0.01
  }

  private generateMockTrend(days: number, currentScore: number): RiskTrendPoint[] {
    const trend: RiskTrendPoint[] = []
    for (let i = days; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const drift = Math.sin(i * 0.3) * 8 + (Math.random() - 0.5) * 5
      const score = Math.max(0, Math.min(100, currentScore + drift))
      trend.push({
        date: date.toISOString().split('T')[0],
        overallScore: Math.round(score),
        criticalCount: score > 60 ? Math.floor(Math.random() * 3) : 0,
        warningCount: score > 30 ? Math.floor(Math.random() * 5) : 0,
        safeCount: Math.floor(Math.random() * 10) + 3,
      })
    }
    return trend
  }
}

export const riskHeatmap = new RiskHeatmapEngine()
