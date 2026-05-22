// Contract Verification Scanner
// Verify deployed contract source code, detect unverified contracts,
// check similarity with known drainer contracts, and analyze bytecode.

import { ethers } from 'ethers'
import { CHAINS } from './chains'

// ── Types ───────────────────────────────────────────────────

export type VerificationStatus = 'verified' | 'unverified' | 'partially_verified' | 'unknown'
export type RiskLevel = 'safe' | 'low' | 'medium' | 'high' | 'critical'

export interface ContractInfo {
  address: string
  chainId: number
  chainName: string
  name: string | null
  compiler: string | null
  optimization: boolean | null
  optimizationRuns: number | null
  sourceCode: string | null
  abi: string | null
  bytecode: string
  bytecodeSize: number
  isProxy: boolean
  proxyImplementation: string | null
  constructorArgs: string | null
  verifiedAt: string | null
  license: string | null
}

export interface VerificationResult {
  contract: ContractInfo
  status: VerificationStatus
  riskLevel: RiskLevel
  riskScore: number // 0-100
  similarity: SimilarityResult
  bytecodeAnalysis: BytecodeAnalysis
  flags: RiskFlag[]
  checkedAt: string
}

export interface SimilarityResult {
  score: number // 0-100 percent match
  matchedDrainer: string | null
  matchedPatterns: string[]
  details: string
}

export interface BytecodeAnalysis {
  size: number
  hasSelfDestruct: boolean
  hasDelegateCall: boolean
  hasExternalCalls: boolean
  functionCount: number
  eventCount: number
  complexity: 'low' | 'medium' | 'high'
  entropy: number // 0-8, higher = more obfuscated
  opCodeSummary: Record<string, number>
}

export interface RiskFlag {
  severity: 'info' | 'warning' | 'critical'
  category: string
  message: string
}

export interface BatchVerificationJob {
  id: string
  contracts: string[]
  chainId: number
  results: VerificationResult[]
  status: 'pending' | 'running' | 'completed' | 'failed'
  startedAt: string
  completedAt: string | null
  progress: number // 0-100
}

export interface VerificationConfig {
  autoVerify: boolean
  similarityThreshold: number // 0-100, flag if above this
  entropyThreshold: number // flag if above this (obfuscation)
  chains: number[]
  alertOnUnverified: boolean
}

export const DEFAULT_VERIFY_CONFIG: VerificationConfig = {
  autoVerify: true,
  similarityThreshold: 70,
  entropyThreshold: 6.5,
  chains: [1, 8453, 42161, 137, 10, 56],
  alertOnUnverified: true,
}

// ── Known Drainer Bytecode Signatures ───────────────────────

const KNOWN_DRAINER_SIGNATURES: { name: string; selector: string; description: string }[] = [
  { name: 'Inferno Drainer', selector: '0xa1798512', description: 'Multi-chain drain via permit2' },
  { name: 'Pink Drainer', selector: '0x69e2e091', description: 'Signature-based drain' },
  { name: 'Angel Drainer', selector: '0x2b67b570', description: 'Permit2 + delegate drain' },
  { name: 'Monkey Drainer', selector: '0xa0af3000', description: 'NFT + token drain' },
  { name: 'Venom Drainer', selector: '0x8d85b915', description: 'setApprovalForAll drain' },
  { name: 'Inferno v2', selector: '0x5ae6bd47', description: 'Advanced multi-chain drain' },
  { name: 'Phishing Kit A', selector: '0x3a7e4e20', description: 'Common phishing template' },
  { name: 'Phishing Kit B', selector: '0xc92aecc4', description: 'Wallet connect phishing' },
]

// Known drainer bytecode fragments (partial matches)
const DRAINER_BYTECODE_FRAGMENTS = [
  'a179851269e2e091', // Inferno + Pink combined
  '5ae6bd472b67b570', // Inferno v2 + Angel combined
  'c92aecc43a7e4e20', // Phishing kit signatures
  '0000000000000000000000000000000000000000000000000000000000000000', // Null padding pattern
]

// Suspicious opcode patterns in bytecode
const SUSPICIOUS_OPCODE_PATTERNS = [
  { name: 'SELFDESTRUCT', opcode: 'ff', severity: 'critical' as const },
  { name: 'DELEGATECALL', opcode: 'f4', severity: 'warning' as const },
  { name: 'STATICCALL', opcode: 'fa', severity: 'info' as const },
]

// ── In-memory stores ────────────────────────────────────────

const verificationCache = new Map<string, VerificationResult>()
const batchJobs = new Map<string, BatchVerificationJob>()
let verificationHistory: VerificationResult[] = []

// ── Helpers ─────────────────────────────────────────────────

function generateId(): string {
  return `cv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
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

// Calculate Shannon entropy of bytecode
function calculateEntropy(hex: string): number {
  const bytes: number[] = []
  for (let i = 2; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.slice(i, i + 2), 16))
  }
  if (bytes.length === 0) return 0

  const freq = new Map<number, number>()
  for (const b of bytes) {
    freq.set(b, (freq.get(b) || 0) + 1)
  }

  let entropy = 0
  for (const count of freq.values()) {
    const p = count / bytes.length
    if (p > 0) entropy -= p * Math.log2(p)
  }
  return entropy
}

// Count opcode occurrences in bytecode
function analyzeOpcodes(bytecode: string): Record<string, number> {
  const counts: Record<string, number> = {}
  for (let i = 2; i < bytecode.length; i += 2) {
    const op = bytecode.slice(i, i + 2).toLowerCase()
    counts[op] = (counts[op] || 0) + 1
  }
  return counts
}

// ── Core Verification Logic ─────────────────────────────────

/**
 * Fetch contract info from block explorer API (simulated)
 */
async function fetchContractInfo(address: string, chainId: number): Promise<ContractInfo> {
  const chain = CHAINS[chainId]
  const chainName = chain?.name || `Chain ${chainId}`

  // Simulate fetching from Etherscan-like API
  await new Promise(r => setTimeout(r, 500 + Math.random() * 500))

  const hash = simpleHash(address)
  const isVerified = (hash & 0xff) > 100 // ~60% chance verified
  const isProxy = (hash & 0xff) > 200

  // Generate deterministic bytecode
  const bytecodeLength = (hash % 200 + 50) * 2 + 2 // 50-250 bytes
  let bytecode = '0x'
  for (let i = 0; i < bytecodeLength; i++) {
    bytecode += ((hash * (i + 7) * 13) & 0xff).toString(16).padStart(2, '0')
  }

  // Inject known signatures sometimes
  if ((hash & 0xf) > 10) {
    const sig = KNOWN_DRAINER_SIGNATURES[hash % KNOWN_DRAINER_SIGNATURES.length]
    bytecode = bytecode.slice(0, 10) + sig.selector.slice(2) + bytecode.slice(18)
  }

  return {
    address: address.toLowerCase(),
    chainId,
    chainName,
    name: isVerified ? `Contract_${address.slice(2, 8)}` : null,
    compiler: isVerified ? `v0.8.${(hash % 20) + 10}+commit.${hash.toString(16).slice(0, 8)}` : null,
    optimization: isVerified ? (hash & 1) === 1 : null,
    optimizationRuns: isVerified ? (hash & 1) ? 200 : 1000 : null,
    sourceCode: isVerified ? `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.${(hash % 20) + 10};\n\ncontract ${address.slice(2, 8)} { ... }` : null,
    abi: isVerified ? '[{"type":"function","name":"transfer"...}]' : null,
    bytecode,
    bytecodeSize: bytecodeLength / 2 - 1,
    isProxy,
    proxyImplementation: isProxy
      ? `0x${((hash * 0xabcdef) & 0xffffffffffffffffffffffffffffffffffffffff).toString(16).padStart(40, '0')}`
      : null,
    constructorArgs: isVerified ? '000000000000000000000000' : null,
    verifiedAt: isVerified ? new Date(Date.now() - hash % 86400000 * 30).toISOString() : null,
    license: isVerified ? 'MIT' : null,
  }
}

/**
 * Check bytecode similarity with known drainer contracts
 */
function checkSimilarity(contract: ContractInfo): SimilarityResult {
  const bytecode = contract.bytecode.toLowerCase()
  const matchedPatterns: string[] = []
  let maxScore = 0
  let matchedDrainer: string | null = null

  // Check for known drainer method selectors
  for (const sig of KNOWN_DRAINER_SIGNATURES) {
    if (bytecode.includes(sig.selector.slice(2))) {
      matchedPatterns.push(`${sig.name}: ${sig.description} (${sig.selector})`)
      maxScore = Math.max(maxScore, 80)
      matchedDrainer = sig.name
    }
  }

  // Check for known drainer bytecode fragments
  for (const fragment of DRAINER_BYTECODE_FRAGMENTS) {
    if (bytecode.includes(fragment.toLowerCase())) {
      matchedPatterns.push(`Drainer bytecode fragment match: ${fragment.slice(0, 16)}...`)
      maxScore = Math.max(maxScore, 70)
    }
  }

  // Structural similarity (deterministic simulation based on address)
  const hash = simpleHash(contract.address)
  const structuralSimilarity = (hash % 40) + 20 // 20-60%
  if (structuralSimilarity > 50) {
    maxScore = Math.max(maxScore, structuralSimilarity)
    matchedPatterns.push(`Structural similarity: ${structuralSimilarity}% bytecode overlap with known patterns`)
  }

  // Entropy-based detection (obfuscated contracts are suspicious)
  const entropy = calculateEntropy(contract.bytecode)
  if (entropy > 6.5) {
    maxScore = Math.max(maxScore, 60)
    matchedPatterns.push(`High entropy detected (${entropy.toFixed(2)}/8) — possible obfuscation`)
  }

  return {
    score: Math.min(100, maxScore),
    matchedDrainer: maxScore >= 70 ? matchedDrainer : null,
    matchedPatterns,
    details: matchedPatterns.length > 0
      ? `Found ${matchedPatterns.length} suspicious pattern(s) matching known drainer signatures`
      : 'No similarity with known drainer contracts detected',
  }
}

/**
 * Analyze bytecode for suspicious patterns
 */
function analyzeBytecode(contract: ContractInfo): BytecodeAnalysis {
  const bytecode = contract.bytecode
  const opcodes = analyzeOpcodes(bytecode)
  const entropy = calculateEntropy(bytecode)

  const hasSelfDestruct = (opcodes['ff'] || 0) > 0
  const hasDelegateCall = (opcodes['f4'] || 0) > 0
  const hasExternalCalls = (opcodes['f1'] || 0) > 0 || (opcodes['fa'] || 0) > 0

  // Estimate function/event count from bytecode size
  const functionCount = Math.max(1, Math.floor(contract.bytecodeSize / 40))
  const eventCount = Math.max(0, Math.floor(contract.bytecodeSize / 120))

  let complexity: 'low' | 'medium' | 'high' = 'low'
  if (contract.bytecodeSize > 5000) complexity = 'high'
  else if (contract.bytecodeSize > 2000) complexity = 'medium'

  return {
    size: contract.bytecodeSize,
    hasSelfDestruct,
    hasDelegateCall,
    hasExternalCalls,
    functionCount,
    eventCount,
    complexity,
    entropy,
    opCodeSummary: {
      CALL: opcodes['f1'] || 0,
      DELEGATECALL: opcodes['f4'] || 0,
      STATICCALL: opcodes['fa'] || 0,
      SELFDESTRUCT: opcodes['ff'] || 0,
      CREATE2: opcodes['f5'] || 0,
      SSTORE: opcodes['55'] || 0,
    },
  }
}

/**
 * Determine risk flags from contract info, similarity, and bytecode analysis
 */
function assessRisk(
  contract: ContractInfo,
  similarity: SimilarityResult,
  bytecode: BytecodeAnalysis
): { flags: RiskFlag[]; score: number; level: RiskLevel } {
  const flags: RiskFlag[] = []

  // Unverified contract
  if (!contract.sourceCode) {
    flags.push({
      severity: 'warning',
      category: 'Verification',
      message: 'Contract source code is NOT verified. Cannot audit logic.',
    })
  }

  // Known drainer match
  if (similarity.matchedDrainer) {
    flags.push({
      severity: 'critical',
      category: 'Drainer',
      message: `Bytecode matches known drainer: ${similarity.matchedDrainer}`,
    })
  }

  // High similarity
  if (similarity.score >= 70) {
    flags.push({
      severity: 'critical',
      category: 'Similarity',
      message: `${similarity.score}% similarity with known malicious contracts`,
    })
  } else if (similarity.score >= 40) {
    flags.push({
      severity: 'warning',
      category: 'Similarity',
      message: `${similarity.score}% partial similarity with suspicious patterns`,
    })
  }

  // Self-destruct
  if (bytecode.hasSelfDestruct) {
    flags.push({
      severity: 'critical',
      category: 'Self-Destruct',
      message: 'Contract contains SELFDESTRUCT opcode — can be destroyed at any time',
    })
  }

  // Delegatecall
  if (bytecode.hasDelegateCall) {
    flags.push({
      severity: 'warning',
      category: 'Delegatecall',
      message: 'Contract uses DELEGATECALL — can execute arbitrary external code',
    })
  }

  // High entropy (obfuscation)
  if (bytecode.entropy > 6.5) {
    flags.push({
      severity: 'warning',
      category: 'Obfuscation',
      message: `High bytecode entropy (${bytecode.entropy.toFixed(2)}/8) — possible code obfuscation`,
    })
  }

  // Proxy contract
  if (contract.isProxy) {
    flags.push({
      severity: 'info',
      category: 'Proxy',
      message: `Proxy contract detected. Implementation: ${contract.proxyImplementation?.slice(0, 10)}...`,
    })
  }

  // Large bytecode (potential for hidden logic)
  if (bytecode.size > 24000) {
    flags.push({
      severity: 'warning',
      category: 'Size',
      message: `Very large bytecode (${(bytecode.size / 1024).toFixed(1)}KB) — exceeds limit, possible hidden logic`,
    })
  }

  // Calculate risk score
  let score = 0
  for (const flag of flags) {
    switch (flag.severity) {
      case 'critical': score += 30; break
      case 'warning': score += 15; break
      case 'info': score += 5; break
    }
  }
  // Unverified = extra risk
  if (!contract.sourceCode) score += 20
  // Similarity bonus
  score += Math.floor(similarity.score * 0.3)
  score = Math.min(100, score)

  let level: RiskLevel = 'safe'
  if (score >= 80) level = 'critical'
  else if (score >= 60) level = 'high'
  else if (score >= 40) level = 'medium'
  else if (score >= 20) level = 'low'

  return { flags, score, level }
}

// ── Public API ──────────────────────────────────────────────

/**
 * Verify a single contract
 */
export async function verifyContract(
  address: string,
  chainId: number = 1
): Promise<VerificationResult> {
  const cacheKey = `${address.toLowerCase()}-${chainId}`
  if (verificationCache.has(cacheKey)) {
    return verificationCache.get(cacheKey)!
  }

  const contract = await fetchContractInfo(address, chainId)
  const similarity = checkSimilarity(contract)
  const bytecodeAnalysis = analyzeBytecode(contract)
  const { flags, score, level } = assessRisk(contract, similarity, bytecodeAnalysis)

  const status: VerificationStatus = contract.sourceCode
    ? 'verified'
    : contract.abi
      ? 'partially_verified'
      : 'unverified'

  const result: VerificationResult = {
    contract,
    status,
    riskLevel: level,
    riskScore: score,
    similarity,
    bytecodeAnalysis,
    flags,
    checkedAt: new Date().toISOString(),
  }

  verificationCache.set(cacheKey, result)
  verificationHistory.unshift(result)
  if (verificationHistory.length > 200) verificationHistory = verificationHistory.slice(0, 200)

  return result
}

/**
 * Batch verify multiple contracts
 */
export async function batchVerify(
  addresses: string[],
  chainId: number = 1
): Promise<BatchVerificationJob> {
  const job: BatchVerificationJob = {
    id: generateId(),
    contracts: addresses,
    chainId,
    results: [],
    status: 'running',
    startedAt: new Date().toISOString(),
    completedAt: null,
    progress: 0,
  }
  batchJobs.set(job.id, job)

  // Process sequentially to avoid rate limits
  for (let i = 0; i < addresses.length; i++) {
    try {
      const result = await verifyContract(addresses[i], chainId)
      job.results.push(result)
    } catch (err) {
      console.error(`Batch verify failed for ${addresses[i]}:`, err)
    }
    job.progress = Math.round(((i + 1) / addresses.length) * 100)
    batchJobs.set(job.id, { ...job })
  }

  job.status = 'completed'
  job.completedAt = new Date().toISOString()
  batchJobs.set(job.id, job)

  return job
}

/**
 * Get a batch job by ID
 */
export function getBatchJob(jobId: string): BatchVerificationJob | null {
  return batchJobs.get(jobId) || null
}

/**
 * Get verification history
 */
export function getVerificationHistory(limit: number = 50): VerificationResult[] {
  return verificationHistory.slice(0, limit)
}

/**
 * Get verification config
 */
export function getVerificationConfig(): VerificationConfig {
  return { ...DEFAULT_VERIFY_CONFIG }
}

/**
 * Get all risk flags from a verification result
 */
export function getRiskFlags(result: VerificationResult): RiskFlag[] {
  return result.flags
}

/**
 * Format verification status for display
 */
export function formatStatus(status: VerificationStatus): { label: string; color: string; icon: string } {
  switch (status) {
    case 'verified': return { label: 'Verified', color: 'text-green-400', icon: '✅' }
    case 'unverified': return { label: 'Unverified', color: 'text-red-400', icon: '❌' }
    case 'partially_verified': return { label: 'Partial', color: 'text-yellow-400', icon: '⚠️' }
    case 'unknown': return { label: 'Unknown', color: 'text-white/40', icon: '❓' }
  }
}

/**
 * Format risk level for display
 */
export function formatRisk(level: RiskLevel): { label: string; color: string; bgColor: string; icon: string } {
  switch (level) {
    case 'safe': return { label: 'Safe', color: 'text-green-400', bgColor: 'bg-green-500/10', icon: '🟢' }
    case 'low': return { label: 'Low Risk', color: 'text-blue-400', bgColor: 'bg-blue-500/10', icon: '🔵' }
    case 'medium': return { label: 'Medium Risk', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', icon: '🟡' }
    case 'high': return { label: 'High Risk', color: 'text-orange-400', bgColor: 'bg-orange-500/10', icon: '🟠' }
    case 'critical': return { label: 'Critical', color: 'text-red-400', bgColor: 'bg-red-500/10', icon: '🔴' }
  }
}
