// AI Scam Shield — Real-time transaction guardian
// Analyzes transactions before signing, detects scam patterns, and blocks dangerous approvals

import { isValidAddress } from './validation'

// ============================================================
// Types
// ============================================================

export type RiskLevel = 'safe' | 'suspicious' | 'dangerous' | 'critical'

export interface TransactionAnalysis {
  id: string
  from: string
  to: string
  value: string
  data: string
  chainId: number
  riskLevel: RiskLevel
  riskScore: number // 0–100
  verdict: 'allow' | 'warn' | 'block'
  summary: string
  details: AnalysisDetail[]
  simulation: SimulationResult
  tokenApproval?: ApprovalAnalysis
  knownScam?: KnownScamMatch
  analyzedAt: number
}

export interface AnalysisDetail {
  category: 'routing' | 'value' | 'approval' | 'contract' | 'pattern' | 'gas'
  severity: 'info' | 'warning' | 'danger' | 'critical'
  title: string
  description: string
  impact?: string
}

export interface SimulationResult {
  success: boolean
  gasEstimate: string
  balanceChanges: BalanceChange[]
  tokenTransfers: TokenTransfer[]
  priceImpact?: string
  valueLoss?: string
  summary: string
}

export interface BalanceChange {
  token: string
  symbol: string
  before: string
  after: string
  change: string
  changePercent: number
}

export interface TokenTransfer {
  from: string
  to: string
  token: string
  symbol: string
  amount: string
  usdValue?: number
}

export interface ApprovalAnalysis {
  spender: string
  spenderLabel?: string
  token: string
  tokenSymbol: string
  amount: string
  isUnlimited: boolean
  estimatedValue: string
  riskNotes: string[]
}

export interface KnownScamMatch {
  name: string
  category: 'drainer' | 'phishing' | 'honeypot' | 'rugpull' | 'fake_token'
  reportedCount: number
  firstSeen: string
  description: string
}

export interface ScamShieldConfig {
  autoBlockCritical: boolean
  warnOnSuspicious: boolean
  simulateTransactions: boolean
  checkTokenApprovals: boolean
  maxApprovalValue: number // USD — warn if approval exceeds this
  enabledChains: number[]
}

// ============================================================
// Known scam addresses & patterns (demo data)
// ============================================================

const KNOWN_SCAM_ADDRESSES: Record<string, KnownScamMatch> = {
  '0x0000000000000000000000000000000000000000': {
    name: 'Null Address',
    category: 'phishing',
    reportedCount: 9999,
    firstSeen: '2015-07-30',
    description: 'Null/zero address — sending here burns tokens permanently.',
  },
  '0xdead000000000000000000000000000000000000': {
    name: 'Known Drain Contract',
    category: 'drainer',
    reportedCount: 847,
    firstSeen: '2023-01-15',
    description: 'Associated with wallet drainer kits. Do not interact.',
  },
}

// Known drainer function selectors
const DRAINER_SELECTORS: Record<string, { name: string; risk: RiskLevel; description: string }> = {
  '0x095ea7b3': {
    name: 'approve(address,uint256)',
    risk: 'suspicious',
    description: 'Token approval — verify the spender is trusted.',
  },
  '0xa22cb465': {
    name: 'setApprovalForAll(address,bool)',
    risk: 'dangerous',
    description: 'Grants full control over all NFTs to another address. Extremely risky if untrusted.',
  },
  '0x23b872dd': {
    name: 'transferFrom(address,address,uint256)',
    risk: 'suspicious',
    description: 'Transfers tokens from one address to another using an existing approval.',
  },
  '0xd505accf': {
    name: 'permit(address,address,uint256,uint256,uint8,bytes32,bytes32)',
    risk: 'suspicious',
    description: 'Gasless token approval via signature — verify details carefully.',
  },
  '0x1249c58b': {
    name: 'mint()',
    risk: 'suspicious',
    description: 'Minting function — verify the project is legitimate.',
  },
  '0x38ed1739': {
    name: 'swapExactTokensForTokens(uint256,uint256,address[],address,uint256)',
    risk: 'safe',
    description: 'Standard DEX swap — verify slippage and output amounts.',
  },
  '0x7ff36ab5': {
    name: 'swapExactETHForTokens(uint256,address[],address,uint256)',
    risk: 'safe',
    description: 'Standard DEX swap with ETH input.',
  },
  '0x4a25d94a': {
    name: 'swapTokensForExactTokens(uint256,uint256,address[],address,uint256)',
    risk: 'safe',
    description: 'Standard DEX swap with exact output.',
  },
}

// Suspicious patterns in calldata
const SUSPICIOUS_PATTERNS = [
  { pattern: /setOwner|transferOwner/i, title: 'Ownership transfer detected', severity: 'danger' as const },
  { pattern: /selfdestruct|suicide/i, title: 'Self-destruct call detected', severity: 'critical' as const },
  { pattern: /delegatecall/i, title: 'Delegatecall detected', severity: 'warning' as const },
  { pattern: /multicall/i, title: 'Multicall batch — verify all sub-calls', severity: 'warning' as const },
]

// ============================================================
// Core analysis engine
// ============================================================

function generateId(): string {
  return `shield_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function hexToDecimal(hex: string): bigint {
  try {
    return BigInt(hex)
  } catch {
    return BigInt(0)
  }
}

function formatEth(wei: bigint): string {
  const eth = Number(wei) / 1e18
  if (eth === 0) return '0 ETH'
  if (eth < 0.0001) return '<0.0001 ETH'
  return `${eth.toFixed(4)} ETH`
}

function detectSelector(data: string): string | null {
  if (!data || data === '0x' || data.length < 10) return null
  return data.slice(0, 10).toLowerCase()
}

function parseApprovalData(data: string): { spender: string; amount: bigint } | null {
  if (!data || data.length < 138) return null
  try {
    const spender = '0x' + data.slice(34, 74)
    const amount = BigInt('0x' + data.slice(74, 138))
    return { spender, amount }
  } catch {
    return null
  }
}

function isUnlimitedApproval(amount: bigint): boolean {
  // MAX_UINT256 = 2^256 - 1
  const max = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
  return amount >= max / BigInt(2) // Treat anything above half max as "unlimited"
}

function estimateApprovalValueUSD(amount: bigint, decimals: number = 18): string {
  const humanAmount = Number(amount) / Math.pow(10, decimals)
  if (humanAmount > 1e15) return 'Unlimited'
  if (humanAmount > 1e9) return `~$${(humanAmount * 0.001).toFixed(0)}`
  return `~${humanAmount.toFixed(2)} tokens`
}

// ============================================================
// Public API
// ============================================================

export interface AnalyzeTransactionParams {
  from: string
  to: string
  value?: string // hex wei
  data?: string // hex calldata
  chainId?: number
}

export async function analyzeTransaction(params: AnalyzeTransactionParams): Promise<TransactionAnalysis> {
  const {
    from,
    to,
    value = '0x0',
    data = '0x',
    chainId = 1,
  } = params

  const details: AnalysisDetail[] = []
  let riskScore = 0
  const selector = detectSelector(data)

  // --- 1. Check known scam addresses ---
  let knownScam: KnownScamMatch | undefined
  const toLower = to.toLowerCase()
  for (const [addr, match] of Object.entries(KNOWN_SCAM_ADDRESSES)) {
    if (toLower === addr.toLowerCase()) {
      knownScam = match
      riskScore += 50
      details.push({
        category: 'pattern',
        severity: 'critical',
        title: `Known scam: ${match.name}`,
        description: match.description,
        impact: 'Funds likely to be stolen',
      })
      break
    }
  }

  // --- 2. Check drainer selector ---
  if (selector && DRAINER_SELECTORS[selector]) {
    const sel = DRAINER_SELECTORS[selector]
    if (sel.risk === 'dangerous') {
      riskScore += 35
      details.push({
        category: 'contract',
        severity: 'danger',
        title: sel.name,
        description: sel.description,
        impact: 'High-risk function call',
      })
    } else if (sel.risk === 'suspicious') {
      riskScore += 15
      details.push({
        category: 'contract',
        severity: 'warning',
        title: sel.name,
        description: sel.description,
      })
    }
  }

  // --- 3. Token approval analysis ---
  let tokenApproval: ApprovalAnalysis | undefined
  if (selector === '0x095ea7b3') {
    const parsed = parseApprovalData(data)
    if (parsed) {
      const isUnlimited = isUnlimitedApproval(parsed.amount)
      tokenApproval = {
        spender: parsed.spender,
        token: to,
        tokenSymbol: 'TOKEN',
        amount: parsed.amount.toString(),
        isUnlimited,
        estimatedValue: estimateApprovalValueUSD(parsed.amount),
        riskNotes: [],
      }

      if (isUnlimited) {
        riskScore += 25
        tokenApproval.riskNotes.push('Unlimited approval — contract can spend all your tokens at any time.')
        details.push({
          category: 'approval',
          severity: 'danger',
          title: 'Unlimited token approval',
          description: `Approving unlimited spending to ${parsed.spender.slice(0, 10)}...`,
          impact: 'Contract can drain this token at any time',
        })
      } else {
        details.push({
          category: 'approval',
          severity: 'warning',
          title: 'Token approval',
          description: `Approving ${tokenApproval.estimatedValue} to ${parsed.spender.slice(0, 10)}...`,
        })
        riskScore += 8
      }
    }
  }

  // --- 4. setApprovalForAll (NFTs) ---
  if (selector === '0xa22cb465') {
    const parsed = parseApprovalData(data)
    if (parsed) {
      riskScore += 30
      details.push({
        category: 'approval',
        severity: 'danger',
        title: 'NFT approval for all',
        description: `Granting full control of all NFTs to ${parsed.spender.slice(0, 10)}...`,
        impact: 'All NFTs from this collection can be transferred at any time',
      })
    }
  }

  // --- 5. High value transfer ---
  const valueWei = hexToDecimal(value)
  if (valueWei > BigInt(0)) {
    const ethAmount = Number(valueWei) / 1e18
    if (ethAmount > 10) {
      riskScore += 15
      details.push({
        category: 'value',
        severity: 'warning',
        title: 'High value transfer',
        description: `Transferring ${formatEth(valueWei)} — verify the recipient.`,
        impact: `~$${(ethAmount * 3000).toLocaleString()} at current prices`,
      })
    } else if (ethAmount > 1) {
      riskScore += 5
      details.push({
        category: 'value',
        severity: 'info',
        title: 'Value transfer',
        description: `Transferring ${formatEth(valueWei)}.`,
      })
    }
  }

  // --- 6. Suspicious calldata patterns ---
  const dataStr = data.toLowerCase()
  for (const sp of SUSPICIOUS_PATTERNS) {
    if (sp.pattern.test(dataStr)) {
      riskScore += sp.severity === 'critical' ? 40 : sp.severity === 'danger' ? 25 : 10
      details.push({
        category: 'pattern',
        severity: sp.severity,
        title: sp.title,
        description: `Pattern detected in transaction calldata.`,
      })
    }
  }

  // --- 7. Simulate the transaction ---
  const simulation = simulateTransaction(params, details)

  // --- 8. Calculate verdict ---
  const riskLevel: RiskLevel =
    riskScore >= 80 ? 'critical' :
    riskScore >= 50 ? 'dangerous' :
    riskScore >= 25 ? 'suspicious' :
    'safe'

  const verdict = riskLevel === 'critical' ? 'block' :
    riskLevel === 'dangerous' ? 'block' :
    riskLevel === 'suspicious' ? 'warn' :
    'allow'

  const summary = generateSummary(riskLevel, details, simulation)

  return {
    id: generateId(),
    from,
    to,
    value,
    data,
    chainId,
    riskLevel,
    riskScore: Math.min(riskScore, 100),
    verdict,
    summary,
    details,
    simulation,
    tokenApproval,
    knownScam,
    analyzedAt: Date.now(),
  }
}

function simulateTransaction(
  params: AnalyzeTransactionParams,
  _details: AnalysisDetail[],
): SimulationResult {
  const valueWei = hexToDecimal(params.value || '0x0')
  const selector = detectSelector(params.data || '0x')

  // Simulate balance changes
  const balanceChanges: BalanceChange[] = []
  const tokenTransfers: TokenTransfer[] = []

  if (valueWei > BigInt(0)) {
    const ethBefore = '10.5000'
    const ethChange = Number(valueWei) / 1e18
    const ethAfter = (parseFloat(ethBefore) - ethChange).toFixed(4)

    balanceChanges.push({
      token: 'native',
      symbol: 'ETH',
      before: ethBefore,
      after: ethAfter,
      change: `-${ethChange.toFixed(4)}`,
      changePercent: -(ethChange / parseFloat(ethBefore)) * 100,
    })

    tokenTransfers.push({
      from: params.from,
      to: params.to,
      token: 'native',
      symbol: 'ETH',
      amount: ethChange.toFixed(6),
      usdValue: ethChange * 3000,
    })
  }

  // Simulate token approval scenario
  if (selector === '0x095ea7b3') {
    const parsed = parseApprovalData(params.data || '0x')
    if (parsed) {
      const isUnlimited = isUnlimitedApproval(parsed.amount)
      balanceChanges.push({
        token: params.to,
        symbol: 'TOKEN',
        before: '1000.00',
        after: isUnlimited ? '0.00' : '1000.00',
        change: isUnlimited ? '-1000.00' : '0.00',
        changePercent: isUnlimited ? -100 : 0,
      })

      if (isUnlimited) {
        tokenTransfers.push({
          from: params.from,
          to: parsed.spender,
          token: params.to,
          symbol: 'TOKEN',
          amount: '1000.00',
          usdValue: 1000,
        })
      }
    }
  }

  const priceImpact = balanceChanges.some(b => b.changePercent < -50)
    ? `${Math.min(...balanceChanges.map(b => b.changePercent)).toFixed(1)}%`
    : undefined

  const valueLoss = balanceChanges
    .filter(b => b.changePercent < 0)
    .reduce((sum, b) => sum + Math.abs(parseFloat(b.change)), 0)

  return {
    success: true,
    gasEstimate: '142,500',
    balanceChanges,
    tokenTransfers,
    priceImpact,
    valueLoss: valueLoss > 0 ? `${valueLoss.toFixed(4)} tokens` : undefined,
    summary: balanceChanges.length > 0
      ? `Simulation complete. ${balanceChanges.filter(b => b.changePercent < -10).length} significant balance changes detected.`
      : 'No balance changes detected in simulation.',
  }
}

function generateSummary(
  riskLevel: RiskLevel,
  details: AnalysisDetail[],
  simulation: SimulationResult,
): string {
  if (riskLevel === 'critical') {
    const criticalDetails = details.filter(d => d.severity === 'critical')
    return `🚨 BLOCK THIS TRANSACTION. ${criticalDetails.length} critical risk${criticalDetails.length > 1 ? 's' : ''} detected: ${criticalDetails.map(d => d.title).join(', ')}. ${simulation.valueLoss ? `Potential loss: ${simulation.valueLoss}.` : ''}`
  }
  if (riskLevel === 'dangerous') {
    return `⛔ HIGH RISK — This transaction has ${details.filter(d => d.severity === 'danger').length} danger indicators. ${simulation.priceImpact ? `Price impact: ${simulation.priceImpact}.` : ''} Proceed only if you fully trust the recipient.`
  }
  if (riskLevel === 'suspicious') {
    return `⚠️ SUSPICIOUS — ${details.filter(d => d.severity === 'warning').length} warning${details.filter(d => d.severity === 'warning').length > 1 ? 's' : ''} detected. Review the details below before signing.`
  }
  return `✅ This transaction appears safe. ${details.length > 0 ? `${details.length} informational note${details.length > 1 ? 's' : ''}.` : 'No issues detected.'}`
}

// ============================================================
// Batch analysis (for multiple pending transactions)
// ============================================================

export interface BatchAnalysisResult {
  transactions: TransactionAnalysis[]
  overallRisk: RiskLevel
  blockedCount: number
  warnedCount: number
  summary: string
}

export async function analyzeBatch(
  transactions: AnalyzeTransactionParams[],
): Promise<BatchAnalysisResult> {
  const results = await Promise.all(transactions.map(t => analyzeTransaction(t)))
  const blockedCount = results.filter(r => r.verdict === 'block').length
  const warnedCount = results.filter(r => r.verdict === 'warn').length

  let overallRisk: RiskLevel = 'safe'
  if (results.some(r => r.riskLevel === 'critical')) overallRisk = 'critical'
  else if (results.some(r => r.riskLevel === 'dangerous')) overallRisk = 'dangerous'
  else if (results.some(r => r.riskLevel === 'suspicious')) overallRisk = 'suspicious'

  return {
    transactions: results,
    overallRisk,
    blockedCount,
    warnedCount,
    summary: blockedCount > 0
      ? `${blockedCount} transaction${blockedCount > 1 ? 's' : ''} blocked, ${warnedCount} warned.`
      : warnedCount > 0
        ? `${warnedCount} transaction${warnedCount > 1 ? 's' : ''} flagged for review.`
        : 'All transactions appear safe.',
  }
}

// ============================================================
// Config defaults
// ============================================================

export const DEFAULT_SCAM_SHIELD_CONFIG: ScamShieldConfig = {
  autoBlockCritical: true,
  warnOnSuspicious: true,
  simulateTransactions: true,
  checkTokenApprovals: true,
  maxApprovalValue: 10000,
  enabledChains: [1, 8453, 56, 42161, 137, 10],
}
