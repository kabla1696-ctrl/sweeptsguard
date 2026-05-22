import { ethers } from 'ethers'

const ADMIN_WALLET = '0x7A3725154a2E6468F9549334394802e9E2822C2A'
const AUTH_MESSAGE = 'SweepGuard Admin Access'
const AUTH_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

interface AdminAuth {
  wallet: string
  signature: string
  timestamp: number
}

// Verify admin signature
export function verifyAdminSignature(auth: AdminAuth): { valid: boolean; error?: string } {
  try {
    // Check wallet matches admin
    if (auth.wallet.toLowerCase() !== ADMIN_WALLET.toLowerCase()) {
      return { valid: false, error: 'Not admin wallet' }
    }

    // Check timestamp is recent (prevent replay attacks)
    const now = Date.now()
    if (Math.abs(now - auth.timestamp) > AUTH_TIMEOUT_MS) {
      return { valid: false, error: 'Signature expired' }
    }

    // Reconstruct the message that was signed
    const message = `${AUTH_MESSAGE}\nTimestamp: ${auth.timestamp}`

    // Recover signer from signature
    const recovered = ethers.verifyMessage(message, auth.signature)

    if (recovered.toLowerCase() !== ADMIN_WALLET.toLowerCase()) {
      return { valid: false, error: 'Invalid signature' }
    }

    return { valid: true }
  } catch {
    return { valid: false, error: 'Signature verification failed' }
  }
}

// Extract admin auth from request headers
export function extractAdminAuth(request: Request): AdminAuth | null {
  const wallet = request.headers.get('x-admin-wallet')
  const signature = request.headers.get('x-admin-signature')
  const timestampStr = request.headers.get('x-admin-timestamp')

  if (!wallet || !signature || !timestampStr) {
    return null
  }

  return {
    wallet,
    signature,
    timestamp: parseInt(timestampStr, 10),
  }
}

// Middleware function to verify admin access
export function requireAdmin(request: Request): { authorized: boolean; error?: string } {
  const auth = extractAdminAuth(request)
  if (!auth) {
    return { authorized: false, error: 'Missing admin authentication headers' }
  }
  return verifyAdminSignature(auth)
}
