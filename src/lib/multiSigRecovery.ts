// Multi-Sig Social Recovery System
// Trusted friends/family confirm wallet recovery through guardian voting

import { isValidAddress, normalizeAddress } from './validation'

// ── Types ───────────────────────────────────────────────────

export type GuardianStatus = 'pending' | 'active' | 'revoked'
export type RecoveryStatus = 'pending' | 'approved' | 'executed' | 'expired' | 'cancelled'
export type AuthMethod = 'wallet' | 'google-authenticator' | 'email'

export interface Guardian {
  address: string
  label: string // friend/family name
  email?: string
  authMethod: AuthMethod
  addedAt: number
  status: GuardianStatus
  lastConfirmedAt?: number
}

export interface RecoveryRequest {
  id: string
  requesterAddress: string
  newOwnerAddress: string
  createdAt: number
  expiresAt: number
  status: RecoveryStatus
  confirmations: GuardianConfirmation[]
  requiredConfirmations: number
  totalGuardians: number
  executedAt?: number
  txHash?: string
}

export interface GuardianConfirmation {
  guardianAddress: string
  guardianLabel: string
  confirmedAt: number
  signature?: string
  authMethod: AuthMethod
  otpVerified: boolean
}

export interface RecoveryConfig {
  ownerAddress: string
  guardians: Guardian[]
  threshold: number // minimum confirmations needed
  lockPeriod: number // seconds before recovery can execute after threshold met
  createdAt: number
  updatedAt: number
  googleAuthEnabled: boolean
  emailNotificationsEnabled: boolean
}

export interface RecoveryEvent {
  type: 'guardian-added' | 'guardian-removed' | 'recovery-requested' | 'recovery-confirmed' | 'recovery-executed' | 'recovery-expired' | 'recovery-cancelled'
  timestamp: number
  details: string
  actor?: string
}

// ── Constants ───────────────────────────────────────────────

const RECOVERY_LOCK_PERIOD = 48 * 60 * 60 // 48 hours in seconds
const RECOVERY_EXPIRY = 7 * 24 * 60 * 60 // 7 days in seconds
const MAX_GUARDIANS = 10
const MIN_GUARDIANS = 3

// In-memory store (would be on-chain / database in production)
const recoveryConfigs = new Map<string, RecoveryConfig>()
const recoveryRequests = new Map<string, RecoveryRequest>()
const recoveryEvents = new Map<string, RecoveryEvent[]>()

// ── Helpers ─────────────────────────────────────────────────

function generateId(): string {
  return `rec_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function getConfig(ownerAddress: string): RecoveryConfig | null {
  return recoveryConfigs.get(normalizeAddress(ownerAddress).toLowerCase()) || null
}

function saveConfig(config: RecoveryConfig): void {
  recoveryConfigs.set(normalizeAddress(config.ownerAddress).toLowerCase(), config)
}

function addEvent(ownerAddress: string, event: RecoveryEvent): void {
  const key = normalizeAddress(ownerAddress).toLowerCase()
  if (!recoveryEvents.has(key)) recoveryEvents.set(key, [])
  recoveryEvents.get(key)!.push(event)
}

// ── Guardian Management ─────────────────────────────────────

/**
 * Initialize a new recovery configuration for a wallet
 */
export function initRecoveryConfig(ownerAddress: string): RecoveryConfig {
  const normalized = normalizeAddress(ownerAddress).toLowerCase()
  const existing = recoveryConfigs.get(normalized)
  if (existing) return existing

  const config: RecoveryConfig = {
    ownerAddress: normalized,
    guardians: [],
    threshold: 3,
    lockPeriod: RECOVERY_LOCK_PERIOD,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    googleAuthEnabled: false,
    emailNotificationsEnabled: true,
  }
  saveConfig(config)
  return config
}

/**
 * Add a trusted guardian to the recovery config
 */
export function addGuardian(
  ownerAddress: string,
  guardianAddress: string,
  label: string,
  authMethod: AuthMethod = 'wallet',
  email?: string
): { success: boolean; guardian?: Guardian; error?: string } {
  if (!isValidAddress(guardianAddress)) {
    return { success: false, error: 'Invalid guardian address' }
  }

  const normalizedGuardian = normalizeAddress(guardianAddress).toLowerCase()
  const normalizedOwner = normalizeAddress(ownerAddress).toLowerCase()

  if (normalizedGuardian === normalizedOwner) {
    return { success: false, error: 'Cannot add yourself as guardian' }
  }

  const config = getConfig(ownerAddress)
  if (!config) {
    return { success: false, error: 'Recovery config not found. Initialize first.' }
  }

  if (config.guardians.length >= MAX_GUARDIANS) {
    return { success: false, error: `Maximum ${MAX_GUARDIANS} guardians allowed` }
  }

  const exists = config.guardians.some(g => normalizeAddress(g.address).toLowerCase() === normalizedGuardian)
  if (exists) {
    return { success: false, error: 'Guardian already added' }
  }

  if (authMethod === 'email' && !email) {
    return { success: false, error: 'Email required for email auth method' }
  }

  const guardian: Guardian = {
    address: normalizedGuardian,
    label,
    email,
    authMethod,
    addedAt: Date.now(),
    status: 'active',
  }

  config.guardians.push(guardian)
  config.updatedAt = Date.now()

  // Auto-adjust threshold if needed
  if (config.threshold > config.guardians.length) {
    config.threshold = Math.max(2, config.guardians.length)
  }

  saveConfig(config)
  addEvent(ownerAddress, {
    type: 'guardian-added',
    timestamp: Date.now(),
    details: `Added guardian "${label}" (${normalizedGuardian.slice(0, 10)}...)`,
    actor: normalizedOwner,
  })

  return { success: true, guardian }
}

/**
 * Remove a guardian from the recovery config
 */
export function removeGuardian(
  ownerAddress: string,
  guardianAddress: string
): { success: boolean; error?: string } {
  const config = getConfig(ownerAddress)
  if (!config) return { success: false, error: 'Recovery config not found' }

  const normalizedGuardian = normalizeAddress(guardianAddress).toLowerCase()
  const index = config.guardians.findIndex(g => normalizeAddress(g.address).toLowerCase() === normalizedGuardian)

  if (index === -1) return { success: false, error: 'Guardian not found' }

  const removed = config.guardians.splice(index, 1)[0]
  removed.status = 'revoked'
  config.updatedAt = Date.now()

  // Ensure threshold is still valid
  if (config.threshold > config.guardians.length) {
    config.threshold = Math.max(2, config.guardians.length)
  }

  saveConfig(config)
  addEvent(ownerAddress, {
    type: 'guardian-removed',
    timestamp: Date.now(),
    details: `Removed guardian "${removed.label}" (${normalizedGuardian.slice(0, 10)}...)`,
    actor: normalizeAddress(ownerAddress).toLowerCase(),
  })

  return { success: true }
}

/**
 * Update the recovery threshold
 */
export function setThreshold(
  ownerAddress: string,
  threshold: number
): { success: boolean; error?: string } {
  const config = getConfig(ownerAddress)
  if (!config) return { success: false, error: 'Recovery config not found' }

  if (threshold < 2) return { success: false, error: 'Threshold must be at least 2' }
  if (threshold > config.guardians.length) {
    return { success: false, error: `Threshold cannot exceed guardian count (${config.guardians.length})` }
  }

  config.threshold = threshold
  config.updatedAt = Date.now()
  saveConfig(config)

  return { success: true }
}

/**
 * Toggle Google Authenticator integration
 */
export function toggleGoogleAuth(
  ownerAddress: string,
  enabled: boolean
): { success: boolean; secret?: string; error?: string } {
  const config = getConfig(ownerAddress)
  if (!config) return { success: false, error: 'Recovery config not found' }

  config.googleAuthEnabled = enabled
  config.updatedAt = Date.now()
  saveConfig(config)

  if (enabled) {
    // In production, generate a real TOTP secret
    const secret = `SG${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    return { success: true, secret }
  }

  return { success: true }
}

/**
 * Toggle email notifications
 */
export function toggleEmailNotifications(
  ownerAddress: string,
  enabled: boolean
): { success: boolean; error?: string } {
  const config = getConfig(ownerAddress)
  if (!config) return { success: false, error: 'Recovery config not found' }

  config.emailNotificationsEnabled = enabled
  config.updatedAt = Date.now()
  saveConfig(config)

  return { success: true }
}

// ── Recovery Request Workflow ───────────────────────────────

/**
 * Initiate a recovery request (called by a guardian or the owner)
 */
export function requestRecovery(
  ownerAddress: string,
  newOwnerAddress: string,
  requesterAddress: string
): { success: boolean; request?: RecoveryRequest; error?: string } {
  if (!isValidAddress(newOwnerAddress)) {
    return { success: false, error: 'Invalid new owner address' }
  }

  const config = getConfig(ownerAddress)
  if (!config) return { success: false, error: 'Recovery config not found' }

  if (config.guardians.length < MIN_GUARDIANS) {
    return { success: false, error: `Need at least ${MIN_GUARDIANS} guardians to initiate recovery` }
  }

  const normalizedRequester = normalizeAddress(requesterAddress).toLowerCase()
  const isGuardian = config.guardians.some(
    g => normalizeAddress(g.address).toLowerCase() === normalizedRequester && g.status === 'active'
  )
  const isOwner = normalizeAddress(ownerAddress).toLowerCase() === normalizedRequester

  if (!isGuardian && !isOwner) {
    return { success: false, error: 'Only guardians or the owner can initiate recovery' }
  }

  // Check for existing active request
  const existingRequest = Array.from(recoveryRequests.values()).find(
    r => r.requesterAddress.toLowerCase() === normalizeAddress(ownerAddress).toLowerCase() &&
      (r.status === 'pending' || r.status === 'approved')
  )
  if (existingRequest) {
    return { success: false, error: 'An active recovery request already exists' }
  }

  const now = Date.now()
  const request: RecoveryRequest = {
    id: generateId(),
    requesterAddress: normalizedRequester,
    newOwnerAddress: normalizeAddress(newOwnerAddress).toLowerCase(),
    createdAt: now,
    expiresAt: now + RECOVERY_EXPIRY * 1000,
    status: 'pending',
    confirmations: [],
    requiredConfirmations: config.threshold,
    totalGuardians: config.guardians.filter(g => g.status === 'active').length,
  }

  recoveryRequests.set(request.id, request)

  addEvent(ownerAddress, {
    type: 'recovery-requested',
    timestamp: now,
    details: `Recovery requested by ${normalizedRequester.slice(0, 10)}... → ${normalizeAddress(newOwnerAddress).slice(0, 10)}...`,
    actor: normalizedRequester,
  })

  // Send notifications to all guardians
  if (config.emailNotificationsEnabled) {
    notifyGuardians(config, request)
  }

  return { success: true, request }
}

/**
 * Guardian confirms a recovery request
 */
export function confirmRecovery(
  requestId: string,
  guardianAddress: string,
  otpCode?: string
): { success: boolean; request?: RecoveryRequest; error?: string } {
  const request = recoveryRequests.get(requestId)
  if (!request) return { success: false, error: 'Recovery request not found' }

  if (request.status !== 'pending') {
    return { success: false, error: `Request is ${request.status}, cannot confirm` }
  }

  if (Date.now() > request.expiresAt) {
    request.status = 'expired'
    return { success: false, error: 'Recovery request has expired' }
  }

  const normalizedGuardian = normalizeAddress(guardianAddress).toLowerCase()

  // Find the guardian config (search all configs for this guardian)
  let config: RecoveryConfig | null = null
  for (const cfg of recoveryConfigs.values()) {
    if (cfg.guardians.some(g => normalizeAddress(g.address).toLowerCase() === normalizedGuardian)) {
      config = cfg
      break
    }
  }

  if (!config) return { success: false, error: 'Guardian not found in any recovery config' }

  const guardian = config.guardians.find(g => normalizeAddress(g.address).toLowerCase() === normalizedGuardian)
  if (!guardian || guardian.status !== 'active') {
    return { success: false, error: 'Guardian is not active' }
  }

  // Check if already confirmed
  const alreadyConfirmed = request.confirmations.some(c => c.guardianAddress.toLowerCase() === normalizedGuardian)
  if (alreadyConfirmed) {
    return { success: false, error: 'Guardian has already confirmed' }
  }

  // Verify OTP if Google Auth is enabled
  if (config.googleAuthEnabled && guardian.authMethod === 'google-authenticator') {
    if (!otpCode) {
      return { success: false, error: 'Google Authenticator code required' }
    }
    // In production, verify TOTP: speakeasy.totp.verify({ secret, encoding: 'base32', token: otpCode })
    const isValidOtp = otpCode.length === 6 && /^\d+$/.test(otpCode)
    if (!isValidOtp) {
      return { success: false, error: 'Invalid OTP code' }
    }
  }

  const confirmation: GuardianConfirmation = {
    guardianAddress: normalizedGuardian,
    guardianLabel: guardian.label,
    confirmedAt: Date.now(),
    authMethod: guardian.authMethod,
    otpVerified: config.googleAuthEnabled && guardian.authMethod === 'google-authenticator',
  }

  request.confirmations.push(confirmation)
  guardian.lastConfirmedAt = Date.now()

  // Check if threshold is met
  if (request.confirmations.length >= request.requiredConfirmations) {
    request.status = 'approved'
  }

  recoveryRequests.set(requestId, request)
  saveConfig(config)

  addEvent(config.ownerAddress, {
    type: 'recovery-confirmed',
    timestamp: Date.now(),
    details: `Guardian "${guardian.label}" confirmed recovery (${request.confirmations.length}/${request.requiredConfirmations})`,
    actor: normalizedGuardian,
  })

  return { success: true, request }
}

/**
 * Execute an approved recovery (after lock period)
 */
export function executeRecovery(
  requestId: string
): { success: boolean; txHash?: string; error?: string } {
  const request = recoveryRequests.get(requestId)
  if (!request) return { success: false, error: 'Recovery request not found' }

  if (request.status !== 'approved') {
    return { success: false, error: 'Request not approved yet' }
  }

  // Find config for lock period check
  let config: RecoveryConfig | null = null
  for (const cfg of recoveryConfigs.values()) {
    const isRequester = cfg.guardians.some(g => normalizeAddress(g.address).toLowerCase() === request.requesterAddress)
    if (isRequester || normalizeAddress(cfg.ownerAddress).toLowerCase() === request.requesterAddress) {
      config = cfg
      break
    }
  }

  if (config) {
    const approvalTime = Math.max(...request.confirmations.map(c => c.confirmedAt))
    const lockExpiry = approvalTime + config.lockPeriod * 1000
    if (Date.now() < lockExpiry) {
      const remaining = Math.ceil((lockExpiry - Date.now()) / (60 * 60 * 1000))
      return { success: false, error: `Lock period active. ${remaining}h remaining before execution.` }
    }
  }

  // Execute recovery (in production, this would be an on-chain transaction)
  const txHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`
  request.status = 'executed'
  request.executedAt = Date.now()
  request.txHash = txHash

  recoveryRequests.set(requestId, request)

  if (config) {
    addEvent(config.ownerAddress, {
      type: 'recovery-executed',
      timestamp: Date.now(),
      details: `Recovery executed. New owner: ${request.newOwnerAddress.slice(0, 10)}...`,
    })
  }

  return { success: true, txHash }
}

/**
 * Cancel a pending recovery request
 */
export function cancelRecovery(
  requestId: string,
  cancellerAddress: string
): { success: boolean; error?: string } {
  const request = recoveryRequests.get(requestId)
  if (!request) return { success: false, error: 'Recovery request not found' }

  if (request.status !== 'pending' && request.status !== 'approved') {
    return { success: false, error: `Cannot cancel ${request.status} request` }
  }

  const normalizedCanceller = normalizeAddress(cancellerAddress).toLowerCase()

  // Only the original requester can cancel
  if (request.requesterAddress !== normalizedCanceller) {
    return { success: false, error: 'Only the requester can cancel' }
  }

  request.status = 'cancelled'
  recoveryRequests.set(requestId, request)

  return { success: true }
}

// ── Query Functions ─────────────────────────────────────────

/**
 * Get recovery config for a wallet
 */
export function getRecoveryConfig(ownerAddress: string): RecoveryConfig | null {
  return getConfig(ownerAddress)
}

/**
 * Get a specific recovery request
 */
export function getRecoveryRequest(requestId: string): RecoveryRequest | null {
  return recoveryRequests.get(requestId) || null
}

/**
 * Get all recovery requests for a wallet
 */
export function getRecoveryRequestsForWallet(ownerAddress: string): RecoveryRequest[] {
  const normalized = normalizeAddress(ownerAddress).toLowerCase()
  return Array.from(recoveryRequests.values()).filter(r => {
    // Requests where this address is the requester or a guardian
    return r.requesterAddress.toLowerCase() === normalized ||
      r.confirmations.some(c => c.guardianAddress.toLowerCase() === normalized)
  })
}

/**
 * Get recovery event history
 */
export function getRecoveryEvents(ownerAddress: string): RecoveryEvent[] {
  return recoveryEvents.get(normalizeAddress(ownerAddress).toLowerCase()) || []
}

/**
 * Get recovery status summary
 */
export function getRecoveryStatus(ownerAddress: string): {
  isConfigured: boolean
  guardianCount: number
  threshold: number
  activeRequests: number
  googleAuthEnabled: boolean
  lastActivity: string | null
} {
  const config = getConfig(ownerAddress)
  if (!config) {
    return {
      isConfigured: false,
      guardianCount: 0,
      threshold: 3,
      activeRequests: 0,
      googleAuthEnabled: false,
      lastActivity: null,
    }
  }

  const normalized = normalizeAddress(ownerAddress).toLowerCase()
  const activeRequests = Array.from(recoveryRequests.values()).filter(
    r => (r.status === 'pending' || r.status === 'approved') &&
      r.requesterAddress.toLowerCase() === normalized
  ).length

  const events = getRecoveryEvents(ownerAddress)
  const lastEvent = events.length > 0 ? events[events.length - 1] : null

  return {
    isConfigured: true,
    guardianCount: config.guardians.filter(g => g.status === 'active').length,
    threshold: config.threshold,
    activeRequests,
    googleAuthEnabled: config.googleAuthEnabled,
    lastActivity: lastEvent ? new Date(lastEvent.timestamp).toISOString() : null,
  }
}

// ── Notification Placeholders ───────────────────────────────

function notifyGuardians(config: RecoveryConfig, request: RecoveryRequest): void {
  const activeGuardians = config.guardians.filter(g => g.status === 'active')
  for (const guardian of activeGuardians) {
    if (guardian.authMethod === 'email' && guardian.email) {
      // In production: send email via SendGrid/Resend
      console.log(`[EMAIL] Sending recovery notification to ${guardian.email}`)
      console.log(`[EMAIL] Recovery ID: ${request.id}`)
      console.log(`[EMAIL] New owner: ${request.newOwnerAddress}`)
    }
    if (guardian.authMethod === 'wallet') {
      // In production: send on-chain notification or push notification
      console.log(`[PUSH] Notifying guardian ${guardian.label} (${guardian.address})`)
    }
  }
}

/**
 * Send OTP via email (placeholder)
 */
export async function sendOtpEmail(email: string): Promise<{ success: boolean; error?: string }> {
  // In production: generate OTP, store it with expiry, send via email service
  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  console.log(`[OTP] Generated for ${email}: ${otp}`)
  // Store OTP with 5-minute expiry
  return { success: true }
}

/**
 * Verify OTP code (placeholder)
 */
export function verifyOtp(email: string, code: string): boolean {
  // In production: check against stored OTP
  return code.length === 6 && /^\d+$/.test(code)
}
