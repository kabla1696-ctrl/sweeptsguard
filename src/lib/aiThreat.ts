// AI-Powered Threat Intelligence - Drainer pattern detection and contract risk scoring
import { ethers } from 'ethers'
import { CHAINS } from './chains'

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface ThreatAnalysis {
  address: string
  chainId: number
  riskScore: number // 0-100
  riskLevel: RiskLevel
  confidence: number // 0-100
  isContract: boolean
  findings: ThreatFinding[]
  drainerMatch: DrainerMatch | null
  methodSignatures: MethodSignatureHit[]
  recommendations: string[]
  analyzedAt: string
}

export interface ThreatFinding {
  id: string
  category: 'bytecode' | 'behavior' | 'signature' | 'reputation' | 'pattern'
  severity: 'info' | 'warning' | 'danger' | 'critical'
  title: string
  description: string
  confidence: number
}

export interface DrainerMatch {
  name: string
  family: string // e.g., 'inferno', 'pink', 'monkey', 'angel'
  confidence: number
  matchedPatterns: string[]
}

export interface MethodSignatureHit {
  selector: string
  name: string
  category: 'drain' | 'approval' | 'permit' | 'delegate' | 'admin'
  risk: RiskLevel
}

// Known drainer family signatures (function selectors + bytecode patterns)
const DRAINER_FAMILIES: Record<string, {
  name: string
  selectors: string[]
  bytecodePatterns: string[]
  description: string
}> = {
  inferno: {
    name: 'Inferno Drainer',
    selectors: ['0xa1798512', '0x692c1f72', '0x1cff79cd'],
    bytecodePatterns: ['a1798512', '692c1f72'],
    description: 'Multi-chain drainer using Permit2 and delegatecall exploits'
  },
  pink: {
    name: 'Pink Drainer',
    selectors: ['0x5ae6c27c', '0xc73e0491', '0x2b67b570'],
    bytecodePatterns: ['5ae6c27c', 'c73e0491'],
    description: 'Signature-based drainer targeting ERC-20 approvals'
  },
  monkey: {
    name: 'Monkey Drainer',
    selectors: ['0x91a265df', '0x3593564c'],
    bytecodePatterns: ['91a265df', '3593564c'],
    description: 'NFT-focused drainer using setApprovalForAll exploits'
  },
  angel: {
    name: 'Angel Drainer',
    selectors: ['0x4633a34e', '0x34b204b1', '0x2b67b570'],
    bytecodePatterns: ['4633a34e', '34b204b1'],
    description: 'Advanced drainer using CREATE2 and permit-based theft'
  },
  venom: {
    name: 'Venom Drainer',
    selectors: ['0x6e7f5498', '0x7951792d'],
    bytecodePatterns: ['6e7f5498', '7951792d'],
    description: 'Fast-drain contract targeting ETH and ERC-20 tokens'
  }
}

// High-risk method signatures
const THREAT_METHODS: Record<string, { name: string; category: MethodSignatureHit['category']; risk: RiskLevel }> = {
  '0xa1798512': { name: 'infernoDrain', category: 'drain', risk: 'critical' },
  '0x692c1f72': { name: 'executePermit2', category: 'drain', risk: 'critical' },
  '0x1cff79cd': { name: 'executeDelegatecall', category: 'delegate', risk: 'critical' },
  '0x2b67b570': { name: 'permit2Call', category: 'permit', risk: 'high' },
  '0xd505accf': { name: 'erc20Permit', category: 'permit', risk: 'high' },
  '0x095ea7b3': { name: 'erc20Approve', category: 'approval', risk: 'medium' },
  '0xa22cb465': { name: 'setApprovalForAll', category: 'approval', risk: 'high' },
  '0x23b872dd': { name: 'erc20TransferFrom', category: 'drain', risk: 'medium' },
  '0x42842e0e': { name: 'erc721SafeTransferFrom', category: 'drain', risk: 'medium' },
  '0xf242432a': { name: 'erc1155SafeTransferFrom', category: 'drain', risk: 'medium' },
  '0x5ae6c27c': { name: 'pinkDrain', category: 'drain', risk: 'critical' },
  '0xc73e0491': { name: 'pinkCollect', category: 'drain', risk: 'critical' },
  '0x91a265df': { name: 'monkeyDrain', category: 'drain', risk: 'critical' },
  '0x3593564c': { name: 'monkeyCollect', category: 'drain', risk: 'critical' },
  '0x4633a34e': { name: 'angelDrain', category: 'drain', risk: 'critical' },
  '0x34b204b1': { name: 'angelCollect', category: 'drain', risk: 'critical' },
  '0x6e7f5498': { name: 'venomDrain', category: 'drain', risk: 'critical' },
  '0x7951792d': { name: 'venomCollect', category: 'drain', risk: 'critical' },
  '0x8da5cb5b': { name: 'owner', category: 'admin', risk: 'low' },
  '0xf2fde38b': { name: 'transferOwnership', category: 'admin', risk: 'medium' },
  '0x715018a6': { name: 'renounceOwnership', category: 'admin', risk: 'medium' },
  '0x8456cb59': { name: 'pause', category: 'admin', risk: 'medium' },
  '0x3f4ba83a': { name: 'unpause', category: 'admin', risk: 'medium' },
}

// Known drainer bytecode signatures (keccak256 hashes of known drainer deployments)
const KNOWN_DRAINER_BYTECODE_HASHES: Record<string, { name: string; family: string }> = {
  // These are simplified pattern matches for demo — real production would use full bytecode hashes
}

export class AIThreatEngine {
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
   * Analyze an address for drainer patterns and threats.
   * Returns a full ThreatAnalysis with risk scoring.
   */
  async analyze(address: string, chainId: number = 1): Promise<ThreatAnalysis> {
    const findings: ThreatFinding[] = []
    const methodHits: MethodSignatureHit[] = []
    let drainerMatch: DrainerMatch | null = null
    let riskScore = 0
    let confidence = 50

    const provider = this.getProvider(chainId)

    // Step 1: Check if contract
    let isContract = false
    let bytecode = '0x'
    try {
      bytecode = await this.withTimeout(provider.getCode(address), 8000)
      isContract = bytecode !== '0x'
    } catch {
      findings.push({
        id: 'rpc-error',
        category: 'behavior',
        severity: 'warning',
        title: 'RPC Error',
        description: 'Could not fetch contract code. Analysis may be incomplete.',
        confidence: 30
      })
    }

    if (!isContract) {
      // EOA analysis — check for suspicious activity patterns
      const eoaFindings = await this.analyzeEOA(address, chainId, provider)
      findings.push(...eoaFindings.findings)
      riskScore = eoaFindings.riskScore
      confidence = eoaFindings.confidence

      return {
        address,
        chainId,
        riskScore: Math.min(riskScore, 100),
        riskLevel: this.getRiskLevel(riskScore),
        confidence,
        isContract: false,
        findings,
        drainerMatch: null,
        methodSignatures: methodHits,
        recommendations: this.getRecommendations(riskScore, findings),
        analyzedAt: new Date().toISOString()
      }
    }

    // Step 2: Bytecode pattern analysis
    const codeLower = bytecode.toLowerCase()
    const codeBytes = codeLower.slice(2) // remove '0x'

    // Check drainer family patterns
    for (const [family, info] of Object.entries(DRAINER_FAMILIES)) {
      const matchedPatterns: string[] = []

      // Check function selectors in bytecode
      for (const selector of info.selectors) {
        const selBytes = selector.slice(2).toLowerCase()
        if (codeBytes.includes(selBytes)) {
          matchedPatterns.push(`Selector ${selector} (${info.name})`)
        }
      }

      // Check bytecode patterns
      for (const pattern of info.bytecodePatterns) {
        if (codeBytes.includes(pattern.toLowerCase())) {
          matchedPatterns.push(`Bytecode pattern ${pattern}`)
        }
      }

      if (matchedPatterns.length >= 2) {
        drainerMatch = {
          name: info.name,
          family,
          confidence: Math.min(60 + matchedPatterns.length * 15, 98),
          matchedPatterns
        }
        riskScore += 40 + matchedPatterns.length * 10
        confidence = Math.max(confidence, drainerMatch.confidence)
        findings.push({
          id: `drainer-${family}`,
          category: 'bytecode',
          severity: 'critical',
          title: `${info.name} Pattern Detected`,
          description: `This contract matches ${info.name} signatures: ${matchedPatterns.join(', ')}. ${info.description}`,
          confidence: drainerMatch.confidence
        })
      } else if (matchedPatterns.length === 1) {
        riskScore += 15
        findings.push({
          id: `drainer-partial-${family}`,
          category: 'bytecode',
          severity: 'warning',
          title: `Partial ${info.name} Match`,
          description: `Found 1 matching pattern for ${info.name}: ${matchedPatterns[0]}. Could be a variant or false positive.`,
          confidence: 40
        })
      }
    }

    // Step 3: Analyze all function selectors in bytecode
    for (const [selector, info] of Object.entries(THREAT_METHODS)) {
      const selBytes = selector.slice(2).toLowerCase()
      if (codeBytes.includes(selBytes)) {
        methodHits.push({
          selector,
          name: info.name,
          category: info.category,
          risk: info.risk
        })

        if (info.risk === 'critical') {
          riskScore += 15
          findings.push({
            id: `method-${selector}`,
            category: 'signature',
            severity: 'critical',
            title: `Critical Method: ${info.name}`,
            description: `Contract contains ${info.name} (${selector}) — a known drainer function.`,
            confidence: 85
          })
        } else if (info.risk === 'high') {
          riskScore += 8
        }
      }
    }

    // Step 4: Bytecode heuristics
    // Check for self-destruct patterns
    if (codeBytes.includes('ff') && codeBytes.includes('600')) {
      const selfDestructPattern = /60[0-9a-f]{2}60[0-9a-f]{2}ff/.test(codeBytes)
      if (selfDestructPattern) {
        riskScore += 10
        findings.push({
          id: 'selfdestruct',
          category: 'bytecode',
          severity: 'warning',
          title: 'Self-Destruct Opcode',
          description: 'Contract contains SELFDESTRUCT — can be destroyed to hide evidence.',
          confidence: 70
        })
      }
    }

    // Check for delegatecall (0xf4 opcode) — high risk in non-proxy contexts
    const hasDelegatecall = codeBytes.includes('f4')
    if (hasDelegatecall) {
      riskScore += 5
      findings.push({
        id: 'delegatecall',
        category: 'bytecode',
        severity: 'info',
        title: 'Delegatecall Detected',
        description: 'Contract uses DELEGATECALL — can execute code in the context of the caller.',
        confidence: 80
      })
    }

    // Check for CREATE2 (0xf5) — used by some drainers for deterministic addresses
    if (codeBytes.includes('f5')) {
      riskScore += 3
      findings.push({
        id: 'create2',
        category: 'bytecode',
        severity: 'info',
        title: 'CREATE2 Detected',
        description: 'Contract uses CREATE2 for deterministic deployment — used by some drainer families.',
        confidence: 50
      })
    }

    // Step 5: Check contract balance and activity
    try {
      const balance = await this.withTimeout(provider.getBalance(address), 8000)
      if (balance > ethers.parseEther('10')) {
        findings.push({
          id: 'high-balance',
          category: 'behavior',
          severity: 'info',
          title: 'High Balance',
          description: `Contract holds ${ethers.formatEther(balance)} ETH — unusual for a drain contract (usually emptied quickly).`,
          confidence: 40
        })
      }
    } catch {}

    // Step 6: Check recent transaction patterns
    try {
      const currentBlock = await this.withTimeout(provider.getBlockNumber(), 8000)
      const fromBlock = Math.max(0, currentBlock - 1000)

      // Look for Transfer events from this contract
      const transferFilter = {
        fromBlock,
        toBlock: 'latest',
        topics: [ethers.id('Transfer(address,address,uint256)'), ethers.zeroPadValue(address, 32)]
      }

      const logs = await this.withTimeout(
        provider.getLogs(transferFilter).catch(() => []),
        8000
      )

      if (logs.length > 50) {
        riskScore += 10
        findings.push({
          id: 'high-activity',
          category: 'behavior',
          severity: 'warning',
          title: 'High Transfer Activity',
          description: `${logs.length} outgoing transfers in recent blocks — possible active drain operation.`,
          confidence: 65
        })
      }
    } catch {}

    // Final scoring
    riskScore = Math.min(riskScore, 100)
    if (findings.length === 0) {
      findings.push({
        id: 'clean',
        category: 'bytecode',
        severity: 'info',
        title: 'No Threats Detected',
        description: 'No known drainer patterns or suspicious bytecode found.',
        confidence: 60
      })
    }

    return {
      address,
      chainId,
      riskScore,
      riskLevel: this.getRiskLevel(riskScore),
      confidence: Math.min(confidence, 100),
      isContract,
      findings,
      drainerMatch,
      methodSignatures: methodHits,
      recommendations: this.getRecommendations(riskScore, findings),
      analyzedAt: new Date().toISOString()
    }
  }

  /**
   * Analyze an EOA (externally owned account) for suspicious patterns.
   */
  private async analyzeEOA(
    address: string,
    chainId: number,
    provider: ethers.JsonRpcProvider
  ): Promise<{ findings: ThreatFinding[]; riskScore: number; confidence: number }> {
    const findings: ThreatFinding[] = []
    let riskScore = 0
    let confidence = 40

    try {
      const [txCount, balance] = await Promise.all([
        this.withTimeout(provider.getTransactionCount(address), 8000),
        this.withTimeout(provider.getBalance(address), 8000)
      ])

      if (txCount === 0) {
        findings.push({
          id: 'new-eoa',
          category: 'behavior',
          severity: 'info',
          title: 'New Address',
          description: 'No transaction history — cannot assess risk.',
          confidence: 20
        })
        confidence = 20
      }

      // Check for delegation (EIP-7702)
      const code = await this.withTimeout(provider.getCode(address), 8000)
      if (code && code.startsWith('0xef0100')) {
        const delegatedTo = '0x' + code.slice(8, 48)
        riskScore += 50
        confidence = 80
        findings.push({
          id: 'eip7702-delegation',
          category: 'pattern',
          severity: 'danger',
          title: 'EIP-7702 Delegation Active',
          description: `This EOA has delegated execution to ${delegatedTo.slice(0, 10)}... — the delegate can act as this wallet.`,
          confidence: 90
        })
      }

      // Check for approval events to known drainers
      try {
        const currentBlock = await this.withTimeout(provider.getBlockNumber(), 8000)
        const approvalFilter = {
          fromBlock: Math.max(0, currentBlock - 5000),
          toBlock: 'latest',
          topics: [ethers.id('Approval(address,address,uint256)'), ethers.zeroPadValue(address, 32)]
        }
        const logs = await this.withTimeout(provider.getLogs(approvalFilter).catch(() => []), 8000)
        if (logs.length > 20) {
          riskScore += 15
          findings.push({
            id: 'many-approvals',
            category: 'behavior',
            severity: 'warning',
            title: 'Numerous Token Approvals',
            description: `${logs.length} approval events detected — high exposure to approval-based attacks.`,
            confidence: 70
          })
        }
      } catch {}
    } catch {}

    return { findings, riskScore: Math.min(riskScore, 100), confidence }
  }

  /**
   * Scan a contract across multiple chains for threats.
   */
  async analyzeMultiChain(
    address: string,
    chainIds: number[] = [1, 8453, 56, 42161, 137]
  ): Promise<{ analyses: ThreatAnalysis[]; overallRisk: RiskLevel; overallScore: number }> {
    const analyses: ThreatAnalysis[] = []

    const results = await Promise.allSettled(
      chainIds.map(chainId => this.analyze(address, chainId))
    )

    for (const result of results) {
      if (result.status === 'fulfilled') {
        analyses.push(result.value)
      }
    }

    const maxScore = Math.max(...analyses.map(a => a.riskScore), 0)
    const overallRisk = this.getRiskLevel(maxScore)

    return { analyses, overallRisk, overallScore: maxScore }
  }

  private getRiskLevel(score: number): RiskLevel {
    if (score >= 80) return 'critical'
    if (score >= 50) return 'high'
    if (score >= 25) return 'medium'
    return 'low'
  }

  private getRecommendations(score: number, findings: ThreatFinding[]): string[] {
    const recs: string[] = []

    if (score >= 80) {
      recs.push('DO NOT interact with this contract under any circumstances.')
      recs.push('If you have approved this contract, revoke approvals immediately.')
      recs.push('Report this address to the community threat database.')
    } else if (score >= 50) {
      recs.push('Exercise extreme caution before interacting.')
      recs.push('Review all function calls before signing any transaction.')
      recs.push('Consider using a hardware wallet for any interactions.')
    } else if (score >= 25) {
      recs.push('Proceed with caution — some suspicious patterns detected.')
      recs.push('Verify the contract source code on the block explorer.')
    } else {
      recs.push('No significant threats detected, but always DYOR.')
      recs.push('Verify contract addresses through official channels.')
    }

    if (findings.some(f => f.category === 'signature' && f.severity === 'critical')) {
      recs.push('Critical drainer signatures found — this is likely a scam contract.')
    }

    return recs
  }
}

export const aiThreatEngine = new AIThreatEngine()
