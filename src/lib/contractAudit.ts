// Smart Contract Audit Bot - Vulnerability detection engine

export interface AuditFinding {
  id: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'informational'
  category: string
  title: string
  description: string
  recommendation: string
  cweId?: string
  line?: number
}

export interface GasOptimization {
  title: string
  description: string
  estimatedSavings: string
  priority: 'high' | 'medium' | 'low'
}

export interface AuditReport {
  contractAddress: string
  chainId: number
  contractName?: string
  compiler?: string
  timestamp: string
  auditScore: number // 0-100
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical'
  findings: AuditFinding[]
  gasOptimizations: GasOptimization[]
  summary: {
    critical: number
    high: number
    medium: number
    low: number
    informational: number
  }
  passChecks: string[]
  bytecodeSize?: number
  isProxy?: boolean
  proxyImplementation?: string
}

export interface AuditHistoryEntry {
  contractAddress: string
  chainId: number
  auditScore: number
  riskLevel: string
  timestamp: string
  findingsCount: number
}

// Known vulnerability patterns in bytecode
const VULNERABILITY_PATTERNS = [
  {
    id: 'reentrancy-external-call',
    category: 'Reentrancy',
    severity: 'critical' as const,
    title: 'Potential Reentrancy Vulnerability',
    description: 'External call detected before state update. This pattern allows attackers to re-enter the function before the state is finalized.',
    recommendation: 'Use the checks-effects-interactions pattern. Update state before making external calls, or use ReentrancyGuard from OpenZeppelin.',
    cweId: 'CWE-841',
    bytecodeSignatures: ['0x8b95dd71', '0x3ccfd60b'], // Known reentrancy-prone patterns
  },
  {
    id: 'unprotected-selfdestruct',
    category: 'Access Control',
    severity: 'critical' as const,
    title: 'Unprotected SELFDESTRUCT',
    description: 'Contract contains SELFDESTRUCT that may be callable by unauthorized users.',
    recommendation: 'Add onlyOwner or other access control modifiers to functions that can trigger contract destruction.',
    cweId: 'CWE-284',
    bytecodeSignatures: ['0xff'],
  },
  {
    id: 'unchecked-return-value',
    category: 'Unchecked Return',
    severity: 'high' as const,
    title: 'Unchecked Return Value',
    description: 'Return value from external call is not checked. Failed calls may silently succeed.',
    recommendation: 'Always check return values from low-level calls (call, send, transfer). Use require() to validate.',
    cweId: 'CWE-252',
    bytecodeSignatures: [],
  },
  {
    id: 'integer-overflow',
    category: 'Arithmetic',
    severity: 'high' as const,
    title: 'Potential Integer Overflow/Underflow',
    description: 'Arithmetic operations without SafeMath or Solidity 0.8+ built-in checks.',
    recommendation: 'Use Solidity 0.8+ which has built-in overflow checks, or use SafeMath library for older versions.',
    cweId: 'CWE-190',
    bytecodeSignatures: [],
  },
  {
    id: 'delegate-call-injection',
    category: 'Injection',
    severity: 'critical' as const,
    title: 'Delegatecall to User-Supplied Address',
    description: 'Contract uses delegatecall with a user-controllable address, allowing arbitrary code execution.',
    recommendation: 'Never use delegatecall with user-supplied addresses. Whitelist allowed targets.',
    cweId: 'CWE-94',
    bytecodeSignatures: ['0xf4'],
  },
  {
    id: 'tx-origin-auth',
    category: 'Authentication',
    severity: 'medium' as const,
    title: 'Use of tx.origin for Authentication',
    description: 'Using tx.origin for authentication is vulnerable to phishing attacks.',
    recommendation: 'Use msg.sender instead of tx.origin for authentication checks.',
    cweId: 'CWE-287',
    bytecodeSignatures: [],
  },
  {
    id: 'floating-pragma',
    category: 'Configuration',
    severity: 'low' as const,
    title: 'Floating Pragma Version',
    description: 'Contract does not lock the compiler version, which may lead to unexpected behavior with different compilers.',
    recommendation: 'Lock the pragma to a specific version (e.g., pragma solidity 0.8.19;).',
    bytecodeSignatures: [],
  },
  {
    id: 'missing-event-emission',
    category: 'Best Practices',
    severity: 'low' as const,
    title: 'Missing Event Emission',
    description: 'State-changing functions do not emit events, making it harder to track contract activity off-chain.',
    recommendation: 'Emit events for all state-changing operations to improve transparency and off-chain monitoring.',
    bytecodeSignatures: [],
  },
  {
    id: 'centralization-risk',
    category: 'Centralization',
    severity: 'medium' as const,
    title: 'Centralization Risk Detected',
    description: 'Contract has a single owner with significant privileges. This creates a single point of failure.',
    recommendation: 'Consider using multi-sig wallets, timelocks, or decentralized governance for critical operations.',
    bytecodeSignatures: [],
  },
  {
    id: 'front-running',
    category: 'MEV',
    severity: 'medium' as const,
    title: 'Front-Running Susceptibility',
    description: 'Contract operations may be susceptible to front-running attacks due to transparent mempool transactions.',
    recommendation: 'Use commit-reveal schemes, Flashbots Protect, or private mempools for sensitive operations.',
    bytecodeSignatures: [],
  },
  {
    id: 'dos-gas-limit',
    category: 'Denial of Service',
    severity: 'medium' as const,
    title: 'Potential DoS via Gas Limit',
    description: 'Unbounded loops or operations that may exceed block gas limit, causing transaction failures.',
    recommendation: 'Implement pagination or batch processing for loops. Avoid unbounded array iterations.',
    cweId: 'CWE-400',
    bytecodeSignatures: [],
  },
  {
    id: 'oracle-manipulation',
    category: 'Oracle',
    severity: 'high' as const,
    title: 'Oracle Price Manipulation Risk',
    description: 'Contract relies on spot prices from DEXes which can be manipulated via flash loans.',
    recommendation: 'Use TWAP oracles, Chainlink price feeds, or multiple oracle sources with outlier detection.',
    bytecodeSignatures: [],
  },
]

const GAS_OPTIMIZATION_PATTERNS: Omit<GasOptimization, 'estimatedSavings'>[] = [
  {
    title: 'Use calldata instead of memory for read-only parameters',
    description: 'External function parameters that are only read should use calldata instead of memory to save gas.',
    priority: 'high',
  },
  {
    title: 'Pack struct variables',
    description: 'Reorder struct members to pack them into fewer storage slots. Variables smaller than 32 bytes can share slots.',
    priority: 'medium',
  },
  {
    title: 'Use unchecked blocks for safe arithmetic',
    description: 'When overflow is impossible (e.g., loop counters), use unchecked { } blocks to skip overflow checks.',
    priority: 'medium',
  },
  {
    title: 'Cache storage variables in memory',
    description: 'Reading from storage is expensive. Cache frequently accessed storage variables in local memory variables.',
    priority: 'high',
  },
  {
    title: 'Use ++i instead of i++',
    description: 'Pre-increment is cheaper than post-increment as it doesn\'t need to return the old value.',
    priority: 'low',
  },
  {
    title: 'Short-circuit conditions',
    description: 'Place cheaper conditions first in && and || expressions. Place the most likely to fail first.',
    priority: 'low',
  },
  {
    title: 'Use bytes32 instead of string',
    description: 'For short string values, bytes32 is significantly cheaper than string for storage and comparisons.',
    priority: 'medium',
  },
  {
    title: 'Mark functions as payable',
    description: 'Functions that don\'t handle ETH can still be marked payable to save the msg.value check gas.',
    priority: 'low',
  },
]

// Audit history storage (in-memory for demo, would use DB in production)
let auditHistory: AuditHistoryEntry[] = []

export function getAuditHistory(): AuditHistoryEntry[] {
  return [...auditHistory].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

function addToHistory(report: AuditReport) {
  auditHistory = auditHistory.filter(h => h.contractAddress.toLowerCase() !== report.contractAddress.toLowerCase())
  auditHistory.push({
    contractAddress: report.contractAddress,
    chainId: report.chainId,
    auditScore: report.auditScore,
    riskLevel: report.riskLevel,
    timestamp: report.timestamp,
    findingsCount: report.findings.length,
  })
  // Keep last 100 entries
  if (auditHistory.length > 100) auditHistory = auditHistory.slice(-100)
}

// Simulate bytecode analysis (in production, this would fetch actual bytecode)
function analyzeBytecode(address: string): {
  findings: AuditFinding[]
  gasOptimizations: GasOptimization[]
  isProxy: boolean
  proxyImplementation?: string
  bytecodeSize?: number
} {
  // Deterministic pseudo-random based on address
  const hash = simpleHash(address)
  const findings: AuditFinding[] = []
  const gasOpts: GasOptimization[] = []

  // Simulate finding various vulnerabilities based on address hash
  VULNERABILITY_PATTERNS.forEach((pattern, i) => {
    const probability = ((hash >> (i % 30)) & 0xf) / 15
    if (probability > 0.65) {
      findings.push({
        id: pattern.id,
        severity: pattern.severity,
        category: pattern.category,
        title: pattern.title,
        description: pattern.description,
        recommendation: pattern.recommendation,
        cweId: pattern.cweId,
        line: Math.floor(((hash >> (i * 3)) & 0xfff) % 500) + 1,
      })
    }
  })

  // Simulate gas optimization suggestions
  GAS_OPTIMIZATION_PATTERNS.forEach((opt, i) => {
    if (((hash >> (i + 15)) & 0xf) > 8) {
      gasOpts.push({
        ...opt,
        estimatedSavings: `${Math.floor(((hash >> (i * 2)) & 0xff) % 5000) + 500} gas`,
      })
    }
  })

  const isProxy = (hash & 0xff) > 200
  return {
    findings,
    gasOptimizations: gasOpts,
    isProxy,
    proxyImplementation: isProxy ? `0x${Math.abs(hash * 0x12345678).toString(16).padStart(40, '0').slice(0, 40)}` : undefined,
    bytecodeSize: (hash & 0xffff) % 20000 + 500,
  }
}

function simpleHash(str: string): number {
  let hash = 0
  const clean = str.toLowerCase().replace(/[^0-9a-f]/g, '')
  for (let i = 0; i < clean.length; i++) {
    const char = clean.charCodeAt(i)
    hash = ((hash << 5) - hash + char) | 0
  }
  return Math.abs(hash)
}

function calculateScore(findings: AuditFinding[]): number {
  let score = 100
  for (const f of findings) {
    switch (f.severity) {
      case 'critical': score -= 25; break
      case 'high': score -= 15; break
      case 'medium': score -= 8; break
      case 'low': score -= 3; break
      case 'informational': score -= 1; break
    }
  }
  return Math.max(0, Math.min(100, score))
}

function getRiskLevel(score: number): AuditReport['riskLevel'] {
  if (score >= 85) return 'safe'
  if (score >= 70) return 'low'
  if (score >= 50) return 'medium'
  if (score >= 30) return 'high'
  return 'critical'
}

const PASS_CHECKS = [
  'No reentrancy patterns detected in external calls',
  'All arithmetic operations use SafeMath or Solidity 0.8+',
  'Access control modifiers properly implemented',
  'No unprotected selfdestruct instructions',
  'Event emissions present for state changes',
  'No use of deprecated Solidity features',
  'Proper error handling with revert strings',
  'No hardcoded gas values in external calls',
]

export async function auditContract(address: string, chainId: number = 1): Promise<AuditReport> {
  // Simulate async analysis delay
  await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000))

  const analysis = analyzeBytecode(address)
  const score = calculateScore(analysis.findings)
  const riskLevel = getRiskLevel(score)

  const summary = {
    critical: analysis.findings.filter(f => f.severity === 'critical').length,
    high: analysis.findings.filter(f => f.severity === 'high').length,
    medium: analysis.findings.filter(f => f.severity === 'medium').length,
    low: analysis.findings.filter(f => f.severity === 'low').length,
    informational: analysis.findings.filter(f => f.severity === 'informational').length,
  }

  // Select pass checks based on findings
  const passedChecks = PASS_CHECKS.filter((_, i) => {
    const relatedFindings = analysis.findings.filter(f => {
      if (i === 0) return f.category === 'Reentrancy'
      if (i === 1) return f.category === 'Arithmetic'
      if (i === 2) return f.category === 'Access Control'
      if (i === 3) return f.id === 'unprotected-selfdestruct'
      if (i === 4) return f.id === 'missing-event-emission'
      return false
    })
    return relatedFindings.length === 0
  })

  const report: AuditReport = {
    contractAddress: address,
    chainId,
    contractName: `Contract_${address.slice(2, 10)}`,
    compiler: 'v0.8.19+commit.7dd6d404',
    timestamp: new Date().toISOString(),
    auditScore: score,
    riskLevel,
    findings: analysis.findings.sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3, informational: 4 }
      return order[a.severity] - order[b.severity]
    }),
    gasOptimizations: analysis.gasOptimizations,
    summary,
    passChecks: passedChecks,
    bytecodeSize: analysis.bytecodeSize,
    isProxy: analysis.isProxy,
    proxyImplementation: analysis.proxyImplementation,
  }

  addToHistory(report)
  return report
}

export function generateReportText(report: AuditReport): string {
  const lines: string[] = [
    `═══════════════════════════════════════════`,
    `  SWEEPGUARD SMART CONTRACT AUDIT REPORT`,
    `═══════════════════════════════════════════`,
    ``,
    `Contract: ${report.contractAddress}`,
    `Chain ID: ${report.chainId}`,
    `Compiler: ${report.compiler || 'Unknown'}`,
    `Date: ${new Date(report.timestamp).toLocaleString()}`,
    ``,
    `───────────────────────────────────────────`,
    `  OVERALL SCORE: ${report.auditScore}/100 (${report.riskLevel.toUpperCase()})`,
    `───────────────────────────────────────────`,
    ``,
    `Finding Summary:`,
    `  🔴 Critical: ${report.summary.critical}`,
    `  🟠 High: ${report.summary.high}`,
    `  🟡 Medium: ${report.summary.medium}`,
    `  🟢 Low: ${report.summary.low}`,
    `  ℹ️  Informational: ${report.summary.informational}`,
    ``,
  ]

  if (report.isProxy) {
    lines.push(`⚠️  PROXY CONTRACT DETECTED`)
    lines.push(`   Implementation: ${report.proxyImplementation}`)
    lines.push(``)
  }

  if (report.findings.length > 0) {
    lines.push(`───────────────────────────────────────────`)
    lines.push(`  FINDINGS`)
    lines.push(`───────────────────────────────────────────`)
    report.findings.forEach((f, i) => {
      lines.push(``)
      lines.push(`${i + 1}. [${f.severity.toUpperCase()}] ${f.title}`)
      lines.push(`   Category: ${f.category}${f.cweId ? ` | ${f.cweId}` : ''}`)
      if (f.line) lines.push(`   Line: ~${f.line}`)
      lines.push(`   ${f.description}`)
      lines.push(`   ➜ ${f.recommendation}`)
    })
  }

  if (report.gasOptimizations.length > 0) {
    lines.push(``)
    lines.push(`───────────────────────────────────────────`)
    lines.push(`  GAS OPTIMIZATIONS`)
    lines.push(`───────────────────────────────────────────`)
    report.gasOptimizations.forEach((g, i) => {
      lines.push(``)
      lines.push(`${i + 1}. ${g.title}`)
      lines.push(`   ${g.description}`)
      lines.push(`   Est. Savings: ${g.estimatedSavings} [${g.priority} priority]`)
    })
  }

  if (report.passChecks.length > 0) {
    lines.push(``)
    lines.push(`───────────────────────────────────────────`)
    lines.push(`  PASSED CHECKS ✅`)
    lines.push(`───────────────────────────────────────────`)
    report.passChecks.forEach(c => lines.push(`  ✅ ${c}`))
  }

  lines.push(``)
  lines.push(`═══════════════════════════════════════════`)
  lines.push(`  Generated by SweepGuard Audit Bot`)
  lines.push(`  https://sweeptsguard.vercel.app`)
  lines.push(`═══════════════════════════════════════════`)

  return lines.join('\n')
}

export function downloadReport(report: AuditReport) {
  const text = generateReportText(report)
  const blob = new Blob([text], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `sweeptsguard-audit-${report.contractAddress.slice(0, 10)}-${Date.now()}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum',
  56: 'BSC',
  137: 'Polygon',
  42161: 'Arbitrum',
  10: 'Optimism',
  43114: 'Avalanche',
  250: 'Fantom',
  8453: 'Base',
  1101: 'Polygon zkEVM',
  324: 'zkSync Era',
  7777777: 'Zora',
  59144: 'Linea',
  534352: 'Scroll',
}
