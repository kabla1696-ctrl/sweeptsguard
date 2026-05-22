import { NextRequest, NextResponse } from 'next/server'
import { isValidAddress, sanitizeErrorMessage } from '@/lib/validation'

type MemberRole = 'admin' | 'member' | 'viewer'
type WalletStatus = 'safe' | 'warning' | 'compromised' | 'unknown'

interface FamilyMember {
  id: string
  address: string
  label: string
  role: MemberRole
  avatarEmoji: string
  chains: number[]
  walletStatus: WalletStatus
  lastActivity: string
  securityScore: number
  addedAt: string
}

interface FamilyAlert {
  id: string
  memberId: string
  memberLabel: string
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  chainName: string
  timestamp: string
  read: boolean
}

// In-memory stores
const members = new Map<string, FamilyMember>()
const alerts = new Map<string, FamilyAlert>()

// Seed some initial data
const seedMembers: FamilyMember[] = [
  { id: '1', address: '0x1234567890abcdef1234567890abcdef12345678', label: 'My Wallet', role: 'admin', avatarEmoji: '🦊', chains: [1, 8453, 42161], walletStatus: 'safe', lastActivity: new Date(Date.now() - 3600000).toISOString(), securityScore: 92, addedAt: new Date(Date.now() - 86400000 * 30).toISOString() },
  { id: '2', address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', label: 'Cold Storage', role: 'admin', avatarEmoji: '🧊', chains: [1], walletStatus: 'safe', lastActivity: new Date(Date.now() - 86400000 * 5).toISOString(), securityScore: 98, addedAt: new Date(Date.now() - 86400000 * 90).toISOString() },
  { id: '3', address: '0x9876543210fedcba9876543210fedcba98765432', label: "Wife's Wallet", role: 'member', avatarEmoji: '👩', chains: [1, 137], walletStatus: 'warning', lastActivity: new Date(Date.now() - 7200000).toISOString(), securityScore: 68, addedAt: new Date(Date.now() - 86400000 * 15).toISOString() },
  { id: '4', address: '0x1111111111111111111111111111111111111111', label: 'Trading Wallet', role: 'member', avatarEmoji: '📈', chains: [1, 8453, 42161, 137], walletStatus: 'safe', lastActivity: new Date(Date.now() - 1800000).toISOString(), securityScore: 75, addedAt: new Date(Date.now() - 86400000 * 7).toISOString() },
]
const seedAlerts: FamilyAlert[] = [
  { id: 'a1', memberId: '3', memberLabel: "Wife's Wallet", type: 'new_approval', severity: 'medium', message: 'New unlimited USDT approval granted to unknown spender', chainName: 'Polygon', timestamp: new Date(Date.now() - 1800000).toISOString(), read: false },
  { id: 'a2', memberId: '1', memberLabel: 'My Wallet', type: 'large_transfer', severity: 'low', message: 'Outgoing transfer of 0.5 ETH to known address', chainName: 'Ethereum', timestamp: new Date(Date.now() - 7200000).toISOString(), read: true },
]
seedMembers.forEach(m => members.set(m.id, m))
seedAlerts.forEach(a => alerts.set(a.id, a))

const VALID_ROLES: MemberRole[] = ['admin', 'member', 'viewer']
const VALID_AVATARS = ['👤', '👩', '👨', '🧑', '👴', '👵', '🧒', '🦊', '🐱', '🐶', '🐼', '🦁', '🐸', '🦉']
const MAX_MEMBERS = 50

/**
 * GET /api/family — list members and alerts
 */
export async function GET() {
  try {
    return NextResponse.json({
      members: Array.from(members.values()),
      alerts: Array.from(alerts.values()),
    })
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
}

/**
 * POST /api/family — add / remove member, mark alert read
 * Body: { action: 'add' | 'remove' | 'markRead', ... }
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
      case 'add': {
        const { address, label, role, avatarEmoji } = body as {
          address?: string; label?: string; role?: MemberRole; avatarEmoji?: string
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
        if (role && !VALID_ROLES.includes(role)) {
          return NextResponse.json({ error: `Role must be one of: ${VALID_ROLES.join(', ')}` }, { status: 400 })
        }
        if (avatarEmoji && !VALID_AVATARS.includes(avatarEmoji)) {
          return NextResponse.json({ error: 'Invalid avatar emoji' }, { status: 400 })
        }
        if (members.size >= MAX_MEMBERS) {
          return NextResponse.json({ error: `Maximum ${MAX_MEMBERS} members allowed` }, { status: 429 })
        }

        // Check duplicate address
        for (const m of members.values()) {
          if (m.address.toLowerCase() === address.toLowerCase()) {
            return NextResponse.json({ error: 'Address already added' }, { status: 409 })
          }
        }

        const member: FamilyMember = {
          id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          address: address.trim(),
          label: label.trim(),
          role: role || 'member',
          avatarEmoji: avatarEmoji || '👤',
          chains: [1],
          walletStatus: 'unknown',
          lastActivity: new Date().toISOString(),
          securityScore: 50,
          addedAt: new Date().toISOString(),
        }
        members.set(member.id, member)
        return NextResponse.json({ member }, { status: 201 })
      }

      case 'remove': {
        const { id } = body as { id?: string }
        if (!id) {
          return NextResponse.json({ error: 'Member id required' }, { status: 400 })
        }
        const member = members.get(id)
        if (!member) {
          return NextResponse.json({ error: 'Member not found' }, { status: 404 })
        }
        if (member.role === 'admin') {
          return NextResponse.json({ error: 'Cannot remove admin members' }, { status: 403 })
        }
        members.delete(id)
        // Remove related alerts
        for (const [alertId, alert] of alerts) {
          if (alert.memberId === id) alerts.delete(alertId)
        }
        return NextResponse.json({ success: true })
      }

      case 'markRead': {
        const { id } = body as { id?: string }
        if (!id) {
          return NextResponse.json({ error: 'Alert id required' }, { status: 400 })
        }
        const alert = alerts.get(id)
        if (!alert) {
          return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
        }
        alert.read = true
        alerts.set(id, alert)
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action. Use: add, remove, markRead' }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
}
