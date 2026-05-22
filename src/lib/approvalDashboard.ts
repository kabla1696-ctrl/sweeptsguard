// Token Approval Dashboard - List, analyze, and revoke token approvals
import { ethers } from 'ethers'
import { CHAINS } from './chains'

export type ApprovalRiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface TokenApproval {
  id: string
  chainId: number
  chainName: string
  tokenAddress: string
  tokenSymbol: string
  tokenName: string
  spender: string
  spenderLabel?: string
  amount: string
  amountFormatted: string
  isUnlimited: boolean
  riskLevel: ApprovalRiskLevel
  riskReasons: string[]
  approvalTxHash: string
  blockNumber: number
  timestamp: string | null
}

export interface ApprovalDashboardResult {
  address: string
  approvals: TokenApproval[]
  summary: {
    total: number
    unlimited: number
    critical: number
    high: number
    medium: number
    low: number
  }
  totalChainsScanned: number
  scannedAt: string
}

export interface RevokeResult {
  success: boolean
  txHash?: string
  error?: string
  chainId: number
  tokenAddress: string
  spender: string
}

// Known safe spenders (DEX routers, well-known protocols)
const SAFE_SPENDERS: Record<string, string> = {
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': 'Uniswap V2 Router',
  '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': 'Uniswap V3 Router',
  '0xe592427a0aece92de3edee1f18e0157c05861564': 'Uniswap V3 SwapRouter',
  '0xef1c6e67703c7bd7107eed8303fbe6ec2554bf6b': 'Uniswap Universal Router',
  '0xdef1c0ded9bec7f1a1670819833240f027b25eff': '0x Exchange Proxy',
  '0x1111111254fb6c44bac0bed2854e76f90643097d': '1inch V4 Router',
  '0x1111111254eeb25477b68fb85ed929f73a960582': '1inch V5 Router',
  '0xdef171fe48cf0115b1d80b88dc8eab59176fee57': 'CowSwap Settlement',
  '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad': 'Uniswap Universal Router V2',
  '0x000000000022d473030f116ddee9f6b43ac78ba3': 'Permit2 (Uniswap)',
}

// Known risky spender patterns
const RISKY_SPENDER_LABELS: Record<string, string> = {
  '0xcce0a2ebe17c5e532802896fc8afcaab8abd8ba0': '🚨 Inferno Drainer',
  '0xb0d6b42f6406d8b9ae980de584c21f517bf0b746': '🚨 Inferno Drainer (Base)',
  '0x354bd0d713d6674605a6a41eea93cf8a8a01dc85': '🚨 Inferno Drainer (ARB)',
  '0x56a645ef8cc03631a28be1fc6c803eda7bfbbc5a': '🚨 Inferno Drainer (Polygon)',
  '0x54ba52cbd043b0b2e11a6823a910360e31bb2544': '🚨 Known Phishing Drainer',
  '0x8652767d52054d2cd29343369b19ba357f46869d': '🚨 Secondary Drainer',
}

const ERC20_ABI = [
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
]

const MAX_UINT256 = '115792089237316195423570985008687907853269984665640564039457584007913129639935'

export class ApprovalDashboard {
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
   * Fetch all token approvals for a wallet across multiple chains.
   */
  async getApprovals(
    address: string,
    chainIds: number[] = [1, 8453, 56, 42161, 137]
  ): Promise<ApprovalDashboardResult> {
    const allApprovals: TokenApproval[] = []

    const results = await Promise.allSettled(
      chainIds.map(chainId => this.getChainApprovals(address, chainId))
    )

    for (const result of results) {
      if (result.status === 'fulfilled') {
        allApprovals.push(...result.value)
      }
    }

    // Sort by risk level (critical first)
    const riskOrder: Record<ApprovalRiskLevel, number> = { critical: 0, high: 1, medium: 2, low: 3 }
    allApprovals.sort((a, b) => riskOrder[a.riskLevel] - riskOrder[b.riskLevel])

    const summary = {
      total: allApprovals.length,
      unlimited: allApprovals.filter(a => a.isUnlimited).length,
      critical: allApprovals.filter(a => a.riskLevel === 'critical').length,
      high: allApprovals.filter(a => a.riskLevel === 'high').length,
      medium: allApprovals.filter(a => a.riskLevel === 'medium').length,
      low: allApprovals.filter(a => a.riskLevel === 'low').length,
    }

    return {
      address,
      approvals: allApprovals,
      summary,
      totalChainsScanned: chainIds.length,
      scannedAt: new Date().toISOString()
    }
  }

  /**
   * Get approvals for a single chain.
   */
  private async getChainApprovals(address: string, chainId: number): Promise<TokenApproval[]> {
    const provider = this.getProvider(chainId)
    const chain = CHAINS[chainId]
    const approvals: TokenApproval[] = []

    try {
      const currentBlock = await this.withTimeout(provider.getBlockNumber(), 8000)
      const fromBlock = Math.max(0, currentBlock - 10000)

      // Get Approval events where owner = address
      const approvalFilter = {
        fromBlock,
        toBlock: 'latest',
        topics: [
          ethers.id('Approval(address,address,uint256)'),
          ethers.zeroPadValue(address, 32)
        ]
      }

      const logs = await this.withTimeout(
        provider.getLogs(approvalFilter).catch(() => []),
        8000
      )

      const iface = new ethers.Interface([
        'event Approval(address indexed owner, address indexed spender, uint256 value)'
      ])

      // Deduplicate: keep latest approval per (token, spender) pair
      const latestApprovals = new Map<string, { log: ethers.Log; parsed: ethers.LogDescription }>()

      for (const log of logs) {
        try {
          const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data })
          if (parsed) {
            const key = `${log.address.toLowerCase()}-${parsed.args.spender.toLowerCase()}`
            const existing = latestApprovals.get(key)
            if (!existing || log.blockNumber > existing.log.blockNumber) {
              latestApprovals.set(key, { log, parsed })
            }
          }
        } catch {}
      }

      // Process each unique approval
      for (const [, { log, parsed }] of latestApprovals) {
        const tokenAddress = log.address
        const spender = parsed.args.spender
        const amount = parsed.args.value.toString()

        // Skip zero approvals (revoked)
        if (amount === '0') continue

        const isUnlimited = amount === MAX_UINT256

        // Get token info
        let tokenSymbol = 'UNKNOWN'
        let tokenName = 'Unknown Token'
        let tokenDecimals = 18
        try {
          const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider)
          const [symbol, name, decimals] = await Promise.all([
            contract.symbol().catch(() => 'UNKNOWN'),
            contract.name().catch(() => 'Unknown Token'),
            contract.decimals().catch(() => 18)
          ])
          tokenSymbol = symbol
          tokenName = name
          tokenDecimals = decimals
        } catch {}

        // Format amount
        const amountFormatted = isUnlimited
          ? 'Unlimited'
          : parseFloat(ethers.formatUnits(amount, tokenDecimals)).toFixed(4)

        // Get block timestamp
        let timestamp: string | null = null
        try {
          const block = await this.withTimeout(provider.getBlock(log.blockNumber), 5000)
          if (block) timestamp = new Date(Number(block.timestamp) * 1000).toISOString()
        } catch {}

        // Assess risk
        const { riskLevel, riskReasons } = this.assessApprovalRisk(
          spender, amount, isUnlimited, tokenAddress
        )

        // Get spender label
        const spenderLower = spender.toLowerCase()
        const spenderLabel = SAFE_SPENDERS[spenderLower] ||
          RISKY_SPENDER_LABELS[spenderLower] ||
          undefined

        approvals.push({
          id: `${chainId}-${tokenAddress}-${spender}`,
          chainId,
          chainName: chain.name,
          tokenAddress,
          tokenSymbol,
          tokenName,
          spender,
          spenderLabel,
          amount,
          amountFormatted,
          isUnlimited,
          riskLevel,
          riskReasons,
          approvalTxHash: log.transactionHash,
          blockNumber: log.blockNumber,
          timestamp
        })
      }
    } catch (err) {
      console.error(`Failed to get approvals for chain ${chainId}:`, err)
    }

    return approvals
  }

  /**
   * Assess the risk level of a single approval.
   */
  private assessApprovalRisk(
    spender: string,
    amount: string,
    isUnlimited: boolean,
    tokenAddress: string
  ): { riskLevel: ApprovalRiskLevel; riskReasons: string[] } {
    const riskReasons: string[] = []
    let riskPoints = 0

    const spenderLower = spender.toLowerCase()

    // Check if known drainer
    if (RISKY_SPENDER_LABELS[spenderLower]) {
      riskPoints += 50
      riskReasons.push('Spender is a known drainer address')
    }

    // Check if safe spender
    if (SAFE_SPENDERS[spenderLower]) {
      riskPoints -= 20
      riskReasons.push(`Known safe protocol: ${SAFE_SPENDERS[spenderLower]}`)
    }

    // Unlimited approval
    if (isUnlimited) {
      riskPoints += 25
      riskReasons.push('Unlimited approval — contract can spend all tokens')
    }

    // Check if spender is a contract (via code check — simplified here)
    // In production, we'd verify this on-chain

    // High risk if unknown spender with unlimited approval
    if (!SAFE_SPENDERS[spenderLower] && !RISKY_SPENDER_LABELS[spenderLower] && isUnlimited) {
      riskPoints += 15
      riskReasons.push('Unknown spender with unlimited approval')
    }

    // Determine risk level
    let riskLevel: ApprovalRiskLevel
    if (riskPoints >= 50) riskLevel = 'critical'
    else if (riskPoints >= 30) riskLevel = 'high'
    else if (riskPoints >= 10) riskLevel = 'medium'
    else riskLevel = 'low'

    if (riskReasons.length === 0) {
      riskReasons.push('No significant risks detected')
    }

    return { riskLevel, riskReasons }
  }

  /**
   * Generate the data needed to build a revoke transaction.
   * Returns the transaction parameters — the frontend sends it via the user's wallet.
   */
  buildRevokeTransaction(
    tokenAddress: string,
    spender: string,
    chainId: number
  ): { to: string; data: string; chainId: number } {
    const iface = new ethers.Interface(ERC20_ABI)
    const data = iface.encodeFunctionData('approve', [spender, 0])

    return {
      to: tokenAddress,
      data,
      chainId
    }
  }

  /**
   * Get the current allowance on-chain (to verify before revoke).
   */
  async getCurrentAllowance(
    owner: string,
    tokenAddress: string,
    spender: string,
    chainId: number
  ): Promise<{ allowance: string; hasApproval: boolean }> {
    const provider = this.getProvider(chainId)
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider)

    try {
      const allowance = await this.withTimeout(
        contract.allowance(owner, spender),
        8000
      )
      return {
        allowance: allowance.toString(),
        hasApproval: allowance > BigInt(0)
      }
    } catch {
      return { allowance: '0', hasApproval: false }
    }
  }
}

export const approvalDashboard = new ApprovalDashboard()
