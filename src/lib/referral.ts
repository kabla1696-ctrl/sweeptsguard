// Referral system for SweepGuard
// Handles referral code generation, tracking, and commission calculation

const REFERRAL_CODE_LENGTH = 8;
const COMMISSION_RATE = 0.05; // 5% of platform fees
const STORAGE_KEY = 'sweeptsguard_referral';
const REFERRALS_KEY = 'sweeptsguard_referral_stats';

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

export { COMMISSION_RATE, STORAGE_KEY, REFERRALS_KEY };
