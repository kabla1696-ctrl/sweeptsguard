// Insurance System for Failed Recoveries
// User pays a small premium (1% of recovery amount)
// If recovery fails, user gets partial refund from the insurance pool

export interface InsurancePolicy {
  id: string
  walletAddress: string
  chainId: number
  recoveryAmount: string // in wei or token base units
  premiumPaid: string // 1% of recoveryAmount
  status: 'active' | 'claimed' | 'expired'
  createdAt: number
  expiresAt: number // 7 days from creation
  claimReason?: string
  refundedAmount?: string
}

export interface InsurancePool {
  totalBalance: string
  totalPolicies: number
  activePolicies: number
  claimedPolicies: number
  expiredPolicies: number
  totalPremiumsCollected: string
  totalRefundsPaid: string
}

export interface InsuranceClaim {
  policyId: string
  reason: string
  requestedAt: number
  status: 'pending' | 'approved' | 'rejected'
  refundAmount?: string
  processedAt?: number
}

const POLICY_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const PREMIUM_RATE = 0.01 // 1%
const REFUND_RATE = 0.80 // 80% refund on claim

// In-memory store (replace with database in production)
const policies = new Map<string, InsurancePolicy>()
const claims = new Map<string, InsuranceClaim>()
const pool: InsurancePool = {
  totalBalance: '0',
  totalPolicies: 0,
  activePolicies: 0,
  claimedPolicies: 0,
  expiredPolicies: 0,
  totalPremiumsCollected: '0',
  totalRefundsPaid: '0'
}

function generatePolicyId(): string {
  return `ins_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Calculate the premium for a given recovery amount (1%)
 */
export function calculatePremium(recoveryAmount: string): string {
  const amount = parseFloat(recoveryAmount)
  if (isNaN(amount) || amount <= 0) return '0'
  return (amount * PREMIUM_RATE).toFixed(6)
}

/**
 * Calculate the refund amount for a claim (80% of premium)
 */
export function calculateRefund(premiumPaid: string): string {
  const premium = parseFloat(premiumPaid)
  if (isNaN(premium) || premium <= 0) return '0'
  return (premium * REFUND_RATE).toFixed(6)
}

/**
 * Create a new insurance policy
 */
export function createPolicy(
  walletAddress: string,
  chainId: number,
  recoveryAmount: string
): InsurancePolicy {
  const premium = calculatePremium(recoveryAmount)
  const now = Date.now()

  const policy: InsurancePolicy = {
    id: generatePolicyId(),
    walletAddress: walletAddress.toLowerCase(),
    chainId,
    recoveryAmount,
    premiumPaid: premium,
    status: 'active',
    createdAt: now,
    expiresAt: now + POLICY_DURATION_MS
  }

  policies.set(policy.id, policy)

  // Update pool stats
  pool.totalPolicies++
  pool.activePolicies++
  pool.totalPremiumsCollected = (
    parseFloat(pool.totalPremiumsCollected) + parseFloat(premium)
  ).toFixed(6)
  pool.totalBalance = (
    parseFloat(pool.totalBalance) + parseFloat(premium)
  ).toFixed(6)

  return policy
}

/**
 * Get policy status
 */
export function getPolicyStatus(policyId: string): InsurancePolicy | null {
  const policy = policies.get(policyId)
  if (!policy) return null

  // Auto-expire if past expiration
  if (policy.status === 'active' && Date.now() > policy.expiresAt) {
    policy.status = 'expired'
    pool.activePolicies--
    pool.expiredPolicies++
  }

  return policy
}

/**
 * Get all policies for a wallet address
 */
export function getPoliciesByWallet(walletAddress: string): InsurancePolicy[] {
  const normalized = walletAddress.toLowerCase()
  const results: InsurancePolicy[] = []
  policies.forEach((policy) => {
    if (policy.walletAddress === normalized) {
      // Auto-expire check
      if (policy.status === 'active' && Date.now() > policy.expiresAt) {
        policy.status = 'expired'
        pool.activePolicies--
        pool.expiredPolicies++
      }
      results.push(policy)
    }
  })
  return results.sort((a, b) => b.createdAt - a.createdAt)
}

/**
 * Claim insurance for a failed recovery
 */
export function claimInsurance(
  policyId: string,
  reason: string
): { success: boolean; refund: string; error?: string } {
  const policy = policies.get(policyId)

  if (!policy) {
    return { success: false, refund: '0', error: 'Policy not found' }
  }

  if (policy.status !== 'active') {
    return { success: false, refund: '0', error: `Policy is ${policy.status}, cannot claim` }
  }

  if (Date.now() > policy.expiresAt) {
    policy.status = 'expired'
    pool.activePolicies--
    pool.expiredPolicies++
    return { success: false, refund: '0', error: 'Policy has expired' }
  }

  if (!reason || reason.trim().length < 10) {
    return { success: false, refund: '0', error: 'Please provide a detailed reason (min 10 characters)' }
  }

  // Process claim
  const refund = calculateRefund(policy.premiumPaid)

  policy.status = 'claimed'
  policy.claimReason = reason
  policy.refundedAmount = refund

  // Create claim record
  const claim: InsuranceClaim = {
    policyId,
    reason,
    requestedAt: Date.now(),
    status: 'approved', // Auto-approve for now; add manual review in production
    refundAmount: refund,
    processedAt: Date.now()
  }
  claims.set(policyId, claim)

  // Update pool stats
  pool.activePolicies--
  pool.claimedPolicies++
  pool.totalRefundsPaid = (
    parseFloat(pool.totalRefundsPaid) + parseFloat(refund)
  ).toFixed(6)
  pool.totalBalance = (
    parseFloat(pool.totalBalance) - parseFloat(refund)
  ).toFixed(6)

  return { success: true, refund }
}

/**
 * Get insurance pool stats
 */
export function getPoolStats(): InsurancePool {
  // Recalculate active count from actual data
  let active = 0
  let claimed = 0
  let expired = 0
  policies.forEach((p) => {
    if (p.status === 'active' && Date.now() <= p.expiresAt) active++
    else if (p.status === 'claimed') claimed++
    else expired++
  })
  return {
    ...pool,
    activePolicies: active,
    claimedPolicies: claimed,
    expiredPolicies: expired
  }
}
