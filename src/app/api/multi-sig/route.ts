import { NextRequest, NextResponse } from 'next/server'
import { isValidAddress, sanitizeErrorMessage } from '@/lib/validation'

type GuardianStatus = 'pending' | 'active' | 'revoked'
type RecoveryStatus = 'pending' | 'approved' | 'executed' | 'expired' | 'cancelled'
type AuthMethod = 'wallet' | 'google-authenticator' | 'email'

interface Guardian {
  id: string
  address: string
  label: string
  email?: string
  authMethod: AuthMethod
  addedAt: string
  status: GuardianStatus
  lastConfirmedAt?: string
}

interface RecoveryRequest {
  id: string
  newOwnerAddress: string
  createdAt: string
  expiresAt: string
  status: RecoveryStatus
  confirmations: { guardianLabel: string; confirmedAt: string }[]
  requiredConfirmations: number
  totalGuardians: number
}

// In-memory stores
const guardians = new Map<string, Guardian>()
const recoveryRequests = new Map<string, RecoveryRequest>()
let threshold = 2

// Seed initial data
const seedGuardians: Guardian[] = [
  { id: 'g1', address: '0xAbCdEf0123456789AbCdEf0123456789AbCdEf01', label: 'Best Friend (Alex)', email: 'alex@email.com', authMethod: 'wallet', addedAt: new Date(Date.now() - 86400000 * 30).toISOString(), status: 'active', lastConfirmedAt: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: 'g2', address: '0xEfGhIj0123456789EfGhIj0123456789EfGhIj01', label: 'Brother (Sam)', email: 'sam@email.com', authMethod: 'google-authenticator', addedAt: new Date(Date.now() - 86400000 * 20).toISOString(), status: 'active' },
  { id: 'g3', address: '0xIjKlMn0123456789IjKlMn0123456789IjKlMn01', label: 'Lawyer (Jane)', email: 'jane@law.com', authMethod: 'email', addedAt: new Date(Date.now() - 86400000 * 10).toISOString(), status: 'active' },
  { id: 'g4', address: '0xMnOpQr0123456789MnOpQr0123456789MnOpQr01', label: 'Old Friend (Bob)', authMethod: 'wallet', addedAt: new Date(Date.now() - 86400000 * 60).toISOString(), status: 'revoked' },
]
seedGuardians.forEach(g => guardians.set(g.id, g))

const VALID_AUTH_METHODS: AuthMethod[] = ['wallet', 'google-authenticator', 'email']
const MAX_GUARDIANS = 20

/**
 * GET /api/multi-sig — list guardians, threshold, and recovery requests
 */
export async function GET() {
  try {
    return NextResponse.json({
      guardians: Array.from(guardians.values()),
      threshold,
      recoveryRequests: Array.from(recoveryRequests.values()),
    })
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
}

/**
 * POST /api/multi-sig — manage guardians, threshold, recovery
 * Body: { action: 'addGuardian' | 'revokeGuardian' | 'setThreshold' | 'startRecovery' | 'confirmRecovery', ... }
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action } = body as { action?: string }

  try {
    switch (action) {
      case 'addGuardian': {
        const { address, label, email, authMethod } = body as {
          address?: string; label?: string; email?: string; authMethod?: AuthMethod
        }

        if (!address || !isValidAddress(address)) {
          return NextResponse.json({ error: 'Valid Ethereum address required' }, { status: 400 })
        }
        if (!label || typeof label !== 'string' || label.trim().length === 0) {
          return NextResponse.json({ error: 'Label is required' }, { status: 400 })
        }
        if (label.length > 64) {
          return NextResponse.json({ error: 'Label must be 64 characters or fewer' }, { status: 400 })
        }
        if (authMethod && !VALID_AUTH_METHODS.includes(authMethod)) {
          return NextResponse.json({ error: `Auth method must be one of: ${VALID_AUTH_METHODS.join(', ')}` }, { status: 400 })
        }
        if (email && typeof email === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
        }

        const activeCount = Array.from(guardians.values()).filter(g => g.status === 'active' || g.status === 'pending').length
        if (activeCount >= MAX_GUARDIANS) {
          return NextResponse.json({ error: `Maximum ${MAX_GUARDIANS} guardians allowed` }, { status: 429 })
        }

        // Check duplicate address
        for (const g of guardians.values()) {
          if (g.address.toLowerCase() === address.toLowerCase() && g.status !== 'revoked') {
            return NextResponse.json({ error: 'Address already registered as guardian' }, { status: 409 })
          }
        }

        const guardian: Guardian = {
          id: `g-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          address: address.trim(),
          label: label.trim(),
          email: email?.trim() || undefined,
          authMethod: authMethod || 'wallet',
          addedAt: new Date().toISOString(),
          status: 'pending',
        }
        guardians.set(guardian.id, guardian)
        return NextResponse.json({ guardian }, { status: 201 })
      }

      case 'revokeGuardian': {
        const { id } = body as { id?: string }
        if (!id) {
          return NextResponse.json({ error: 'Guardian id required' }, { status: 400 })
        }
        const guardian = guardians.get(id)
        if (!guardian) {
          return NextResponse.json({ error: 'Guardian not found' }, { status: 404 })
        }
        if (guardian.status === 'revoked') {
          return NextResponse.json({ error: 'Guardian already revoked' }, { status: 400 })
        }
        guardian.status = 'revoked'
        guardians.set(id, guardian)
        return NextResponse.json({ guardian })
      }

      case 'setThreshold': {
        const { value } = body as { value?: number }
        if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
          return NextResponse.json({ error: 'Threshold must be a positive integer' }, { status: 400 })
        }
        const activeCount = Array.from(guardians.values()).filter(g => g.status === 'active').length
        if (value > activeCount) {
          return NextResponse.json({ error: `Threshold cannot exceed active guardian count (${activeCount})` }, { status: 400 })
        }
        threshold = value
        return NextResponse.json({ threshold })
      }

      case 'startRecovery': {
        const { newOwnerAddress } = body as { newOwnerAddress?: string }
        if (!newOwnerAddress || !isValidAddress(newOwnerAddress)) {
          return NextResponse.json({ error: 'Valid new owner address required' }, { status: 400 })
        }

        const activeGuardians = Array.from(guardians.values()).filter(g => g.status === 'active')
        if (activeGuardians.length < threshold) {
          return NextResponse.json({ error: `Not enough active guardians (${activeGuardians.length}) for threshold (${threshold})` }, { status: 400 })
        }

        // Check for existing pending recovery
        for (const r of recoveryRequests.values()) {
          if (r.status === 'pending') {
            return NextResponse.json({ error: 'A recovery request is already pending' }, { status: 409 })
          }
        }

        const request: RecoveryRequest = {
          id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          newOwnerAddress: newOwnerAddress.trim(),
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 48 * 3600000).toISOString(),
          status: 'pending',
          confirmations: [],
          requiredConfirmations: threshold,
          totalGuardians: activeGuardians.length,
        }
        recoveryRequests.set(request.id, request)
        return NextResponse.json({ recoveryRequest: request }, { status: 201 })
      }

      case 'confirmRecovery': {
        const { recoveryId, guardianId } = body as { recoveryId?: string; guardianId?: string }
        if (!recoveryId || !guardianId) {
          return NextResponse.json({ error: 'Recovery ID and guardian ID required' }, { status: 400 })
        }
        const request = recoveryRequests.get(recoveryId)
        if (!request) {
          return NextResponse.json({ error: 'Recovery request not found' }, { status: 404 })
        }
        if (request.status !== 'pending') {
          return NextResponse.json({ error: `Recovery request is ${request.status}, not pending` }, { status: 400 })
        }
        if (new Date(request.expiresAt) < new Date()) {
          request.status = 'expired'
          recoveryRequests.set(recoveryId, request)
          return NextResponse.json({ error: 'Recovery request has expired' }, { status: 410 })
        }

        const guardian = guardians.get(guardianId)
        if (!guardian || guardian.status !== 'active') {
          return NextResponse.json({ error: 'Active guardian not found' }, { status: 404 })
        }

        // Check if already confirmed
        if (request.confirmations.some(c => c.guardianLabel === guardian.label)) {
          return NextResponse.json({ error: 'Guardian already confirmed' }, { status: 409 })
        }

        request.confirmations.push({
          guardianLabel: guardian.label,
          confirmedAt: new Date().toISOString(),
        })

        if (request.confirmations.length >= request.requiredConfirmations) {
          request.status = 'approved'
        }
        recoveryRequests.set(recoveryId, request)
        return NextResponse.json({ recoveryRequest: request })
      }

      default:
        return NextResponse.json({ error: 'Unknown action. Use: addGuardian, revokeGuardian, setThreshold, startRecovery, confirmRecovery' }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
}
