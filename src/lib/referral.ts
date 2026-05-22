// Referral system for SweepGuard
// Handles referral code generation, tracking, and commission calculation

const REFERRAL_CODE_LENGTH = 8;
const COMMISSION_RATE = 0.05; // 5% of platform fees
const PLATFORM_FEE_RATE = 0.20; // 20% platform fee
const STORAGE_KEY = 'sweeptsguard_referral';
const REFERRALS_KEY = 'sweeptsguard_referral_stats';
const REFERRER_KEY = 'sweeptsguard_referrer';
const CLAIMS_KEY = 'sweeptsguard_claims';
const PAYOUTS_KEY = 'sweeptsguard_payouts';
const REFERRERS_KEY = 'sweeptsguard_referrers';

export interface ReferralRecord {
  code: string;
  walletAddress: string;
  referredAt: string;
  commissionEarned: number;
}

export interface ReferralStats {
  totalReferrals: number;
  totalEarned: number;
  referrals: ReferralRecord[];
}

export interface ReferrerRegistration {
  code: string;
  walletAddress: string;
  registeredAt: string;
}

export interface ClaimRecord {
  referralCode: string;
  claimerWallet: string;
  claimAmount: number;
  platformFee: number;
  referrerCommission: number;
  timestamp: string;
  status: 'pending' | 'completed' | 'failed';
  tokenType?: string;
}

export interface PayoutRecord {
  referralCode: string;
  amount: number;
  txHash: string;
  paidAt: string;
}

export interface ReferrerEntry {
  code: string;
  walletAddress: string;
  registeredAt: string;
  totalReferrals: number;
  totalEarned: number;
}

export interface AdminStats {
  totalClaims: number;
  totalPlatformFees: number;
  totalReferrerCommissions: number;
  netRevenue: number;
  totalReferrers: number;
  pendingPayouts: number;
}

/**
 * Generate a random 8-character alphanumeric referral code
 */
export function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  const array = new Uint8Array(REFERRAL_CODE_LENGTH);
  crypto.getRandomValues(array);
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
    code += chars[array[i] % chars.length];
  }
  return code;
}

/**
 * Build a referral link for a given code
 */
export function buildReferralLink(code: string): string {
  const base = typeof window !== 'undefined'
    ? window.location.origin
    : 'https://sweeptsguard.vercel.app';
  return `${base}/?ref=${code}`;
}

/**
 * Store a referral code from URL into localStorage
 */
export function storeReferralCode(code: string): void {
  if (typeof window === 'undefined') return;
  const existing = localStorage.getItem(STORAGE_KEY);
  if (!existing) {
    localStorage.setItem(STORAGE_KEY, code);
  }
}

/**
 * Get the stored referral code (if any)
 */
export function getStoredReferralCode(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}

/**
 * Extract referral code from URL search params
 */
export function extractReferralFromURL(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('ref');
}

/**
 * Calculate commission for a given platform fee amount
 */
export function calculateCommission(platformFee: number): number {
  return platformFee * COMMISSION_RATE;
}

/**
 * Calculate platform fee for a given claim amount
 */
export function calculatePlatformFee(claimAmount: number): number {
  return claimAmount * PLATFORM_FEE_RATE;
}

/**
 * Save referral stats to localStorage
 */
export function saveReferralStats(stats: ReferralStats): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(REFERRALS_KEY, JSON.stringify(stats));
}

/**
 * Load referral stats from localStorage
 */
export function loadReferralStats(): ReferralStats {
  if (typeof window === 'undefined') {
    return { totalReferrals: 0, totalEarned: 0, referrals: [] };
  }
  const stored = localStorage.getItem(REFERRALS_KEY);
  if (!stored) {
    return { totalReferrals: 0, totalEarned: 0, referrals: [] };
  }
  try {
    return JSON.parse(stored) as ReferralStats;
  } catch {
    return { totalReferrals: 0, totalEarned: 0, referrals: [] };
  }
}

/**
 * Initialize referral tracking from URL on page load.
 * Call this in a useEffect on mount.
 */
export function initReferralTracking(): void {
  const code = extractReferralFromURL();
  if (code) {
    storeReferralCode(code);
  }
}

// ============================================================
// New functions for referral tracking system
// ============================================================

/**
 * Register a referrer with their wallet address.
 * Stores locally AND sends to API.
 */
export async function registerReferrer(walletAddress: string): Promise<{ code: string }> {
  // Generate code locally
  const code = generateReferralCode();

  const registration: ReferrerRegistration = {
    code,
    walletAddress: walletAddress.toLowerCase(),
    registeredAt: new Date().toISOString(),
  };

  // Store in localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem(REFERRER_KEY, JSON.stringify(registration));

    // Also add to referrers list
    const referrers = getStoredReferrers();
    const existing = referrers.find(r => r.walletAddress === walletAddress.toLowerCase());
    if (!existing) {
      referrers.push({
        code,
        walletAddress: walletAddress.toLowerCase(),
        registeredAt: registration.registeredAt,
        totalReferrals: 0,
        totalEarned: 0,
      });
      localStorage.setItem(REFERRERS_KEY, JSON.stringify(referrers));
    }
  }

  // Send to API
  try {
    const res = await fetch('/api/referral', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        referralCode: code,
        walletAddress: walletAddress.toLowerCase(),
      }),
    });
    if (!res.ok) {
      console.warn('[Referral] API registration failed, stored locally');
    }
  } catch {
    console.warn('[Referral] API unreachable, stored locally');
  }

  return { code };
}

/**
 * Get stored referrer registration
 */
export function getStoredReferrer(): ReferrerRegistration | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(REFERRER_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as ReferrerRegistration;
  } catch {
    return null;
  }
}

/**
 * Record a claim with referral tracking.
 * Stores locally AND sends to tracking API.
 */
export async function recordClaim(
  referralCode: string,
  claimAmount: number,
  claimerWallet: string,
  tokenType?: string
): Promise<void> {
  const platformFee = calculatePlatformFee(claimAmount);
  const referrerCommission = calculateCommission(platformFee);

  const claim: ClaimRecord = {
    referralCode,
    claimerWallet: claimerWallet.toLowerCase(),
    claimAmount,
    platformFee,
    referrerCommission,
    timestamp: new Date().toISOString(),
    status: 'completed',
    tokenType,
  };

  // Store in localStorage
  if (typeof window !== 'undefined') {
    const claims = getStoredClaims();
    claims.push(claim);
    localStorage.setItem(CLAIMS_KEY, JSON.stringify(claims));
  }

  // Send to tracking API
  try {
    await fetch('/api/referral/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        referralCode,
        claimAmount,
        claimerWallet: claimerWallet.toLowerCase(),
        tokenType,
      }),
    });
  } catch {
    console.warn('[Referral] Tracking API unreachable, claim stored locally');
  }
}

/**
 * Get all claims from localStorage
 */
export function getStoredClaims(): ClaimRecord[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(CLAIMS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as ClaimRecord[];
  } catch {
    return [];
  }
}

/**
 * Get claims for a specific referral code
 */
export function getReferralClaimsFromStorage(code: string): ClaimRecord[] {
  return getStoredClaims().filter(c => c.referralCode === code);
}

/**
 * Get referral claims from API
 */
export async function getReferralClaims(code: string): Promise<ClaimRecord[]> {
  try {
    const res = await fetch(`/api/referral/track?code=${encodeURIComponent(code)}`);
    if (res.ok) {
      const data = await res.json();
      return data.claims || [];
    }
  } catch {
    // Fall back to localStorage
  }
  return getReferralClaimsFromStorage(code);
}

/**
 * Get all referrers from localStorage
 */
export function getStoredReferrers(): ReferrerEntry[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(REFERRERS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as ReferrerEntry[];
  } catch {
    return [];
  }
}

/**
 * Get all payouts from localStorage
 */
export function getStoredPayouts(): PayoutRecord[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(PAYOUTS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as PayoutRecord[];
  } catch {
    return [];
  }
}

/**
 * Get admin stats (aggregated from localStorage + API)
 */
export async function getAdminStats(): Promise<AdminStats> {
  // Try API first
  try {
    const res = await fetch('/api/admin/stats');
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fall back to localStorage
  }

  // Calculate from localStorage
  const claims = getStoredClaims();
  const referrers = getStoredReferrers();
  const payouts = getStoredPayouts();

  const totalPlatformFees = claims.reduce((sum, c) => sum + c.platformFee, 0);
  const totalReferrerCommissions = claims.reduce((sum, c) => sum + c.referrerCommission, 0);
  const totalPaidOut = payouts.reduce((sum, p) => sum + p.amount, 0);

  return {
    totalClaims: claims.length,
    totalPlatformFees,
    totalReferrerCommissions,
    netRevenue: totalPlatformFees - totalReferrerCommissions,
    totalReferrers: referrers.length,
    pendingPayouts: totalReferrerCommissions - totalPaidOut,
  };
}

/**
 * Mark a referrer as paid (record payout)
 */
export async function markAsPaid(
  referralCode: string,
  amount: number,
  txHash: string
): Promise<void> {
  const payout: PayoutRecord = {
    referralCode,
    amount,
    txHash,
    paidAt: new Date().toISOString(),
  };

  // Store in localStorage
  if (typeof window !== 'undefined') {
    const payouts = getStoredPayouts();
    payouts.push(payout);
    localStorage.setItem(PAYOUTS_KEY, JSON.stringify(payouts));
  }

  // Send to API
  try {
    await fetch('/api/admin/payout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referralCode, amount, txHash }),
    });
  } catch {
    console.warn('[Admin] Payout API unreachable, stored locally');
  }
}

export {
  COMMISSION_RATE,
  PLATFORM_FEE_RATE,
  STORAGE_KEY,
  REFERRALS_KEY,
  REFERRER_KEY,
  CLAIMS_KEY,
  PAYOUTS_KEY,
  REFERRERS_KEY,
};
