// Social Recovery Network
// Trusted contacts, Shamir's Secret Sharing, guardian voting, and recovery workflow

import { isValidAddress, normalizeAddress } from './validation'

// ── Types ───────────────────────────────────────────────────

export type ContactStatus = 'pending' | 'active' | 'revoked'
export type RecoveryRequestStatus = 'pending' | 'voting' | 'approved' | 'executed' | 'expired' | 'cancelled'

export interface TrustedContact {
  address: string
  label: string
  email?: string
  addedAt: number
  status: ContactStatus
  lastActivity?: number
  voteWeight: number // default 1
}

export interface ShamirShare {
  id: string
  index: number
  share: string // hex-encoded share
  guardianAddress: string
  createdAt: number
}

export interface ShamirConfig {
  threshold: number // k of n
  totalShares: number
  prime: bigint
  shares: ShamirShare[]
}

export interface RecoveryRequest {
  id: string
  ownerAddress: string
  newOwnerAddress: string
  requesterAddress: string
  createdAt: number
  expiresAt: number
  status: RecoveryRequestStatus
  votes: GuardianVote[]
  requiredVotes: number
  totalGuardians: number
  lockPeriod: number // seconds
  executedAt?: number
  txHash?: string
  metadata?: string
}

export interface GuardianVote {
  guardianAddress: string
  guardianLabel: string
  vote: 'approve' | 'reject'
  votedAt: number
  signature?: string
  reason?: string
}

export interface RecoveryHistory {
  id: string
  ownerAddress: string
  newOwnerAddress: string
  status: RecoveryRequestStatus
  createdAt: number
  completedAt?: number
  votesReceived: number
  votesRequired: number
}

export interface SocialRecoveryConfig {
  ownerAddress: string
  contacts: TrustedContact[]
  threshold: number
  lockPeriod: number // seconds
  createdAt: number
  updatedAt: number
  shamir: ShamirConfig | null
}

// ── Constants ───────────────────────────────────────────────

const RECOVERY_LOCK_PERIOD = 48 * 60 * 60 // 48 hours
const RECOVERY_EXPIRY = 7 * 24 * 60 * 60 * 1000 // 7 days in ms
const MAX_CONTACTS = 15
const MIN_CONTACTS = 3

// In-memory stores
const recoveryConfigs = new Map<string, SocialRecoveryConfig>()
const recoveryRequests = new Map<string, RecoveryRequest>()
const recoveryHistory: RecoveryHistory[] = []

// ── Helpers ─────────────────────────────────────────────────

function generateId(): string {
  return `sr_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function getConfig(ownerAddress: string): SocialRecoveryConfig | null {
  return recoveryConfigs.get(normalizeAddress(ownerAddress).toLowerCase()) || null
}

function saveConfig(config: SocialRecoveryConfig): void {
  recoveryConfigs.set(normalizeAddress(config.ownerAddress).toLowerCase(), config)
}

// ── Shamir's Secret Sharing ─────────────────────────────────

/**
 * Simple Shamir's Secret Sharing implementation over GF(prime)
 * Splits a secret into n shares where k shares are needed to reconstruct
 */

const DEFAULT_PRIME = BigInt('2') ** BigInt('127') - BigInt('1') // Mersenne prime

function mod(a: bigint, m: bigint): bigint {
  return ((a % m) + m) % m
}

function modPow(base: bigint, exp: bigint, m: bigint): bigint {
  let result = BigInt(1)
  base = mod(base, m)
  while (exp > BigInt(0)) {
    if (exp % BigInt(2) === BigInt(1)) {
      result = mod(result * base, m)
    }
    exp = exp / BigInt(2)
    base = mod(base * base, m)
  }
  return result
}

function modInverse(a: bigint, m: bigint): bigint {
  return modPow(mod(a, m), m - BigInt(2), m)
}

/**
 * Generate polynomial coefficients for Shamir sharing
 */
function generateCoefficients(secret: bigint, threshold: number, prime: bigint): bigint[] {
  const coefficients: bigint[] = [secret]
  for (let i = 1; i < threshold; i++) {
    // Random coefficient (deterministic for demo)
    const coeff = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER))
    coefficients.push(mod(coeff, prime))
  }
  return coefficients
}

/**
 * Evaluate polynomial at point x
 */
function evaluatePolynomial(coefficients: bigint[], x: bigint, prime: bigint): bigint {
  let result = BigInt(0)
  let xPow = BigInt(1)
  for (const coeff of coefficients) {
    result = mod(result + mod(coeff * xPow, prime), prime)
    xPow = mod(xPow * x, prime)
  }
  return result
}

/**
 * Split a secret into shares using Shamir's Secret Sharing
 */
export function splitSecret(
  secret: string,
  threshold: number,
  totalShares: number,
  guardianAddresses: string[]
): ShamirConfig {
  // Convert secret to bigint
  const secretBytes = new TextEncoder().encode(secret)
  let secretBigInt = BigInt(0)
  for (let i = 0; i < secretBytes.length; i++) {
    secretBigInt = secretBigInt * BigInt(256) + BigInt(secretBytes[i])
  }

  const prime = DEFAULT_PRIME
  const coefficients = generateCoefficients(secretBigInt, threshold, prime)

  const shares: ShamirShare[] = []
  for (let i = 0; i < totalShares; i++) {
    const x = BigInt(i + 1) // x = 1, 2, 3, ...
    const y = evaluatePolynomial(coefficients, x, prime)

    shares.push({
      id: generateId(),
      index: i + 1,
      share: `0x${y.toString(16).padStart(32, '0')}`,
      guardianAddress: guardianAddresses[i]?.toLowerCase() || '',
      createdAt: Date.now(),
    })
  }

  return {
    threshold,
    totalShares,
    prime,
    shares,
  }
}

/**
 * Reconstruct secret from k shares using Lagrange interpolation
 */
export function reconstructSecret(shares: ShamirShare[], prime: bigint = DEFAULT_PRIME): string {
  if (shares.length < 2) throw new Error('Need at least 2 shares')

  let secret = BigInt(0)

  for (let i = 0; i < shares.length; i++) {
    const xi = BigInt(shares[i].index)
    const yi = BigInt(shares[i].share)

    let numerator = BigInt(1)
    let denominator = BigInt(1)

    for (let j = 0; j < shares.length; j++) {
      if (i === j) continue
      const xj = BigInt(shares[j].index)
      numerator = mod(numerator * mod(-xj, prime), prime)
      denominator = mod(denominator * mod(xi - xj, prime), prime)
    }

    const lagrangeCoeff = mod(numerator * modInverse(denominator, prime), prime)
    secret = mod(secret + mod(yi * lagrangeCoeff, prime), prime)
  }

  // Convert bigint back to string
  const bytes: number[] = []
  let temp = secret
  while (temp > BigInt(0)) {
    bytes.unshift(Number(temp % BigInt(256)))
    temp = temp / BigInt(256)
  }

  return new TextDecoder().decode(new Uint8Array(bytes))
}

// ── Contact Management ──────────────────────────────────────

/**
 * Initialize social recovery for a wallet
 */
export function initSocialRecovery(ownerAddress: string): SocialRecoveryConfig {
  const normalized = normalizeAddress(ownerAddress).toLowerCase()
  const existing = recoveryConfigs.get(normalized)
  if (existing) return existing

  const config: SocialRecoveryConfig = {
    ownerAddress: normalized,
    contacts: [],
    threshold: 3,
    lockPeriod: RECOVERY_LOCK_PERIOD,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    shamir: null,
  }
  saveConfig(config)
  return config
}

/**
 * Add a trusted contact
 */
export function addContact(
  ownerAddress: string,
  contactAddress: string,
  label: string,
  email?: string,
  voteWeight: number = 1
): { success: boolean; contact?: TrustedContact; error?: string } {
  if (!isValidAddress(contactAddress)) {
    return { success: false, error: 'Invalid contact address' }
  }

  const config = getConfig(ownerAddress)
  if (!config) return { success: false, error: 'Initialize social recovery first' }

  const normalizedContact = normalizeAddress(contactAddress).toLowerCase()
  const normalizedOwner = normalizeAddress(ownerAddress).toLowerCase()

  if (normalizedContact === normalizedOwner) {
    return { success: false, error: 'Cannot add yourself as a trusted contact' }
  }

  if (config.contacts.length >= MAX_CONTACTS) {
    return { success: false, error: `Maximum ${MAX_CONTACTS} contacts allowed` }
  }

  if (config.contacts.some(c => normalizeAddress(c.address).toLowerCase() === normalizedContact)) {
    return { success: false, error: 'Contact already added' }
  }

  const contact: TrustedContact = {
    address: normalizedContact,
    label,
    email,
    addedAt: Date.now(),
    status: 'active',
    voteWeight: Math.max(1, Math.min(5, voteWeight)),
  }

  config.contacts.push(contact)
  config.updatedAt = Date.now()

  // Auto-adjust threshold
  if (config.threshold > config.contacts.length) {
    config.threshold = Math.max(2, config.contacts.length)
  }

  saveConfig(config)
  return { success: true, contact }
}

/**
 * Remove a trusted contact
 */
export function removeContact(
  ownerAddress: string,
  contactAddress: string
): { success: boolean; error?: string } {
  const config = getConfig(ownerAddress)
  if (!config) return { success: false, error: 'Config not found' }

  const normalizedContact = normalizeAddress(contactAddress).toLowerCase()
  const index = config.contacts.findIndex(c => normalizeAddress(c.address).toLowerCase() === normalizedContact)
  if (index === -1) return { success: false, error: 'Contact not found' }

  config.contacts.splice(index, 1)
  config.updatedAt = Date.now()

  if (config.threshold > config.contacts.length) {
    config.threshold = Math.max(2, config.contacts.length)
  }

  saveConfig(config)
  return { success: true }
}

/**
 * Set recovery threshold
 */
export function setThreshold(
  ownerAddress: string,
  threshold: number
): { success: boolean; error?: string } {
  const config = getConfig(ownerAddress)
  if (!config) return { success: false, error: 'Config not found' }

  if (threshold < 2) return { success: false, error: 'Threshold must be at least 2' }
  if (threshold > config.contacts.length) {
    return { success: false, error: `Threshold cannot exceed contact count (${config.contacts.length})` }
  }

  config.threshold = threshold
  config.updatedAt = Date.now()
  saveConfig(config)

  return { success: true }
}

/**
 * Setup Shamir's Secret Sharing for the wallet
 */
export function setupShamir(
  ownerAddress: string,
  secret: string,
  threshold?: number
): { success: boolean; shamir?: ShamirConfig; error?: string } {
  const config = getConfig(ownerAddress)
  if (!config) return { success: false, error: 'Config not found' }

  if (config.contacts.filter(c => c.status === 'active').length < MIN_CONTACTS) {
    return { success: false, error: `Need at least ${MIN_CONTACTS} active contacts` }
  }

  const k = threshold || config.threshold
  const n = config.contacts.filter(c => c.status === 'active').length

  if (k > n) return { success: false, error: 'Threshold exceeds active contact count' }
  if (k < 2) return { success: false, error: 'Threshold must be at least 2' }

  const shamir = splitSecret(
    secret,
    k,
    n,
    config.contacts.filter(c => c.status === 'active').map(c => c.address)
  )

  config.shamir = shamir
  config.updatedAt = Date.now()
  saveConfig(config)

  return { success: true, shamir }
}

// ── Recovery Request Workflow ───────────────────────────────

/**
 * Initiate a recovery request
 */
export function requestRecovery(
  ownerAddress: string,
  newOwnerAddress: string,
  requesterAddress: string,
  metadata?: string
): { success: boolean; request?: RecoveryRequest; error?: string } {
  if (!isValidAddress(newOwnerAddress)) {
    return { success: false, error: 'Invalid new owner address' }
  }

  const config = getConfig(ownerAddress)
  if (!config) return { success: false, error: 'Social recovery not configured' }

  if (config.contacts.filter(c => c.status === 'active').length < MIN_CONTACTS) {
    return { success: false, error: `Need at least ${MIN_CONTACTS} active contacts` }
  }

  const normalizedRequester = normalizeAddress(requesterAddress).toLowerCase()
  const isContact = config.contacts.some(
    c => normalizeAddress(c.address).toLowerCase() === normalizedRequester && c.status === 'active'
  )
  const isOwner = normalizeAddress(ownerAddress).toLowerCase() === normalizedRequester

  if (!isContact && !isOwner) {
    return { success: false, error: 'Only trusted contacts or the owner can initiate recovery' }
  }

  // Check for existing active request
  const existing = Array.from(recoveryRequests.values()).find(
    r => r.ownerAddress.toLowerCase() === normalizeAddress(ownerAddress).toLowerCase() &&
      (r.status === 'pending' || r.status === 'voting' || r.status === 'approved')
  )
  if (existing) {
    return { success: false, error: 'An active recovery request already exists' }
  }

  const now = Date.now()
  const request: RecoveryRequest = {
    id: generateId(),
    ownerAddress: normalizeAddress(ownerAddress).toLowerCase(),
    newOwnerAddress: normalizeAddress(newOwnerAddress).toLowerCase(),
    requesterAddress: normalizedRequester,
    createdAt: now,
    expiresAt: now + RECOVERY_EXPIRY,
    status: 'voting',
    votes: [],
    requiredVotes: config.threshold,
    totalGuardians: config.contacts.filter(c => c.status === 'active').length,
    lockPeriod: config.lockPeriod,
    metadata,
  }

  recoveryRequests.set(request.id, request)
  return { success: true, request }
}

/**
 * Guardian votes on a recovery request
 */
export function voteOnRecovery(
  requestId: string,
  guardianAddress: string,
  vote: 'approve' | 'reject',
  reason?: string
): { success: boolean; request?: RecoveryRequest; error?: string } {
  const request = recoveryRequests.get(requestId)
  if (!request) return { success: false, error: 'Request not found' }

  if (request.status !== 'voting' && request.status !== 'pending') {
    return { success: false, error: `Cannot vote on ${request.status} request` }
  }

  if (Date.now() > request.expiresAt) {
    request.status = 'expired'
    return { success: false, error: 'Recovery request has expired' }
  }

  const normalizedGuardian = normalizeAddress(guardianAddress).toLowerCase()

  // Verify guardian is in the config
  const config = getConfig(request.ownerAddress)
  if (!config) return { success: false, error: 'Config not found' }

  const contact = config.contacts.find(
    c => normalizeAddress(c.address).toLowerCase() === normalizedGuardian && c.status === 'active'
  )
  if (!contact) return { success: false, error: 'You are not an active trusted contact' }

  // Check if already voted
  if (request.votes.some(v => v.guardianAddress.toLowerCase() === normalizedGuardian)) {
    return { success: false, error: 'Already voted on this request' }
  }

  request.votes.push({
    guardianAddress: normalizedGuardian,
    guardianLabel: contact.label,
    vote,
    votedAt: Date.now(),
    reason,
  })

  // Check if threshold met for approval
  const approveVotes = request.votes.filter(v => v.vote === 'approve')
  const totalWeight = approveVotes.reduce((sum, v) => {
    const c = config.contacts.find(ct => normalizeAddress(ct.address).toLowerCase() === v.guardianAddress.toLowerCase())
    return sum + (c?.voteWeight || 1)
  }, 0)

  if (totalWeight >= request.requiredVotes) {
    request.status = 'approved'
  }

  // Check if rejection is certain (not enough remaining approve votes possible)
  const remainingContacts = config.contacts.filter(
    c => c.status === 'active' && !request.votes.some(v => v.guardianAddress.toLowerCase() === c.address.toLowerCase())
  )
  const maxPossibleApprovals = totalWeight + remainingContacts.reduce((s, c) => s + c.voteWeight, 0)
  if (maxPossibleApprovals < request.requiredVotes) {
    request.status = 'cancelled' // Cannot reach threshold
  }

  recoveryRequests.set(requestId, request)
  return { success: true, request }
}

/**
 * Execute an approved recovery (after lock period)
 */
export function executeRecovery(
  requestId: string
): { success: boolean; txHash?: string; error?: string } {
  const request = recoveryRequests.get(requestId)
  if (!request) return { success: false, error: 'Request not found' }

  if (request.status !== 'approved') {
    return { success: false, error: 'Request not approved yet' }
  }

  // Check lock period
  const lastVoteTime = Math.max(...request.votes.map(v => v.votedAt))
  const lockExpiry = lastVoteTime + request.lockPeriod * 1000
  if (Date.now() < lockExpiry) {
    const remaining = Math.ceil((lockExpiry - Date.now()) / (60 * 60 * 1000))
    return { success: false, error: `Lock period active. ${remaining}h remaining.` }
  }

  // Execute
  const txHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`
  request.status = 'executed'
  request.executedAt = Date.now()
  request.txHash = txHash

  recoveryRequests.set(requestId, request)

  // Add to history
  recoveryHistory.unshift({
    id: request.id,
    ownerAddress: request.ownerAddress,
    newOwnerAddress: request.newOwnerAddress,
    status: 'executed',
    createdAt: request.createdAt,
    completedAt: Date.now(),
    votesReceived: request.votes.filter(v => v.vote === 'approve').length,
    votesRequired: request.requiredVotes,
  })

  return { success: true, txHash }
}

/**
 * Cancel a recovery request
 */
export function cancelRecovery(
  requestId: string,
  cancellerAddress: string
): { success: boolean; error?: string } {
  const request = recoveryRequests.get(requestId)
  if (!request) return { success: false, error: 'Request not found' }

  if (request.status !== 'voting' && request.status !== 'pending' && request.status !== 'approved') {
    return { success: false, error: `Cannot cancel ${request.status} request` }
  }

  const normalizedCanceller = normalizeAddress(cancellerAddress).toLowerCase()
  if (request.requesterAddress !== normalizedCanceller) {
    return { success: false, error: 'Only the requester can cancel' }
  }

  request.status = 'cancelled'
  recoveryRequests.set(requestId, request)

  recoveryHistory.unshift({
    id: request.id,
    ownerAddress: request.ownerAddress,
    newOwnerAddress: request.newOwnerAddress,
    status: 'cancelled',
    createdAt: request.createdAt,
    completedAt: Date.now(),
    votesReceived: request.votes.filter(v => v.vote === 'approve').length,
    votesRequired: request.requiredVotes,
  })

  return { success: true }
}

// ── Query Functions ─────────────────────────────────────────

export function getRecoveryConfig(ownerAddress: string): SocialRecoveryConfig | null {
  return getConfig(ownerAddress)
}

export function getRecoveryRequest(requestId: string): RecoveryRequest | null {
  return recoveryRequests.get(requestId) || null
}

export function getActiveRequests(ownerAddress: string): RecoveryRequest[] {
  const normalized = normalizeAddress(ownerAddress).toLowerCase()
  return Array.from(recoveryRequests.values()).filter(
    r => r.ownerAddress === normalized && ['pending', 'voting', 'approved'].includes(r.status)
  )
}

export function getRecoveryRequestsForAddress(address: string): RecoveryRequest[] {
  const normalized = normalizeAddress(address).toLowerCase()
  return Array.from(recoveryRequests.values()).filter(r =>
    r.ownerAddress === normalized ||
    r.requesterAddress === normalized ||
    r.votes.some(v => v.guardianAddress.toLowerCase() === normalized)
  )
}

export function getHistory(limit: number = 50): RecoveryHistory[] {
  return recoveryHistory.slice(0, limit)
}

export function getRecoveryStatus(ownerAddress: string): {
  isConfigured: boolean
  contactCount: number
  threshold: number
  activeRequests: number
  shamirEnabled: boolean
  lastActivity: string | null
} {
  const config = getConfig(ownerAddress)
  if (!config) {
    return {
      isConfigured: false,
      contactCount: 0,
      threshold: 3,
      activeRequests: 0,
      shamirEnabled: false,
      lastActivity: null,
    }
  }

  const active = getActiveRequests(ownerAddress)

  return {
    isConfigured: true,
    contactCount: config.contacts.filter(c => c.status === 'active').length,
    threshold: config.threshold,
    activeRequests: active.length,
    shamirEnabled: config.shamir !== null,
    lastActivity: config.updatedAt ? new Date(config.updatedAt).toISOString() : null,
  }
}
