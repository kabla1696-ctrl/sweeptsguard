/**
 * Family Protection System
 * Manage multiple wallets under one protection umbrella
 */

export type MemberRole = 'admin' | 'member' | 'viewer'
export type WalletStatus = 'safe' | 'warning' | 'compromised' | 'unknown'

export interface FamilyMember {
  id: string
  address: string
  label: string
  role: MemberRole
  addedAt: string
  addedBy: string
  avatarEmoji: string
  chains: number[]
  walletStatus: WalletStatus
  lastActivity: string
  securityScore: number
}

export interface FamilyGroup {
  id: string
  name: string
  createdAt: string
  adminAddress: string
  members: FamilyMember[]
  familySecurityScore: number
  totalAlerts: number
  activeThreats: number
}

export interface FamilyAlert {
  id: string
  memberId: string
  memberAddress: string
  memberLabel: string
  type: 'compromise' | 'suspicious_tx' | 'new_approval' | 'large_transfer' | 'phishing_attempt'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  chainId: number
  chainName: string
  txHash?: string
  timestamp: string
  read: boolean
  resolved: boolean
}

export interface SecurityScoreBreakdown {
  overall: number
  walletHealth: number
  approvalSafety: number
  activityRisk: number
  coverageScore: number
}

const STORAGE_KEY = 'sweeptsguard_family'

function generateId(): string {
  return `fam-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const AVATAR_EMOJIS = ['👤', '👩', '👨', '🧑', '👴', '👵', '🧒', '👶', '🦊', '🐱', '🐶', '🐼', '🦁', '🐸', '🦉']

function randomAvatar(): string {
  return AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)]
}

function calculateMemberScore(member: FamilyMember): number {
  let score = 70
  if (member.walletStatus === 'safe') score += 20
  else if (member.walletStatus === 'warning') score += 5
  else if (member.walletStatus === 'compromised') score -= 30
  if (member.chains.length > 1) score += 10
  return Math.max(0, Math.min(100, score))
}

function calculateFamilyScore(members: FamilyMember[]): number {
  if (members.length === 0) return 0
  const total = members.reduce((sum, m) => sum + m.securityScore, 0)
  return Math.round(total / members.length)
}

export class FamilyProtectionEngine {
  private group: FamilyGroup | null = null
  private alerts: FamilyAlert[] = []

  constructor() {
    this.loadFromStorage()
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored)
        this.group = data.group || null
        this.alerts = data.alerts || []
      }
    } catch {}
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        group: this.group,
        alerts: this.alerts,
      }))
    } catch {}
  }

  createGroup(name: string, adminAddress: string): FamilyGroup {
    this.group = {
      id: generateId(),
      name,
      createdAt: new Date().toISOString(),
      adminAddress,
      members: [{
        id: generateId(),
        address: adminAddress,
        label: 'Admin (You)',
        role: 'admin',
        addedAt: new Date().toISOString(),
        addedBy: adminAddress,
        avatarEmoji: '👑',
        chains: [1, 8453, 42161],
        walletStatus: 'safe',
        lastActivity: new Date().toISOString(),
        securityScore: 95,
      }],
      familySecurityScore: 95,
      totalAlerts: 0,
      activeThreats: 0,
    }
    this.saveToStorage()
    return this.group
  }

  getGroup(): FamilyGroup | null {
    return this.group
  }

  addMember(address: string, label: string, role: MemberRole, addedBy: string, chains: number[] = [1]): FamilyMember | null {
    if (!this.group) return null

    const existing = this.group.members.find(m => m.address.toLowerCase() === address.toLowerCase())
    if (existing) return null

    const member: FamilyMember = {
      id: generateId(),
      address,
      label,
      role,
      addedAt: new Date().toISOString(),
      addedBy,
      avatarEmoji: randomAvatar(),
      chains,
      walletStatus: 'unknown',
      lastActivity: new Date().toISOString(),
      securityScore: 50,
    }

    this.group.members.push(member)
    this.group.familySecurityScore = calculateFamilyScore(this.group.members)
    this.saveToStorage()
    return member
  }

  removeMember(memberId: string): boolean {
    if (!this.group) return false
    const idx = this.group.members.findIndex(m => m.id === memberId)
    if (idx < 0) return false
    if (this.group.members[idx].role === 'admin') return false
    this.group.members.splice(idx, 1)
    this.group.familySecurityScore = calculateFamilyScore(this.group.members)
    this.saveToStorage()
    return true
  }

  updateMemberStatus(memberId: string, status: WalletStatus): void {
    if (!this.group) return
    const member = this.group.members.find(m => m.id === memberId)
    if (!member) return
    member.walletStatus = status
    member.securityScore = calculateMemberScore(member)
    this.group.familySecurityScore = calculateFamilyScore(this.group.members)
    if (status === 'compromised') {
      this.group.activeThreats++
    }
    this.saveToStorage()
  }

  addAlert(alert: Omit<FamilyAlert, 'id' | 'read' | 'resolved'>): FamilyAlert {
    const fullAlert: FamilyAlert = {
      ...alert,
      id: generateId(),
      read: false,
      resolved: false,
    }
    this.alerts.unshift(fullAlert)
    if (this.group) {
      this.group.totalAlerts++
    }
    this.saveToStorage()
    return fullAlert
  }

  getAlerts(): FamilyAlert[] {
    return this.alerts
  }

  markAlertRead(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.read = true
      this.saveToStorage()
    }
  }

  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.resolved = true
      this.saveToStorage()
    }
  }

  getScoreBreakdown(): SecurityScoreBreakdown {
    if (!this.group || this.group.members.length === 0) {
      return { overall: 0, walletHealth: 0, approvalSafety: 0, activityRisk: 0, coverageScore: 0 }
    }
    const safeCount = this.group.members.filter(m => m.walletStatus === 'safe').length
    const total = this.group.members.length
    return {
      overall: this.group.familySecurityScore,
      walletHealth: Math.round((safeCount / total) * 100),
      approvalSafety: Math.round(70 + Math.random() * 25),
      activityRisk: Math.round(60 + Math.random() * 30),
      coverageScore: Math.round(Math.min(100, (total / 5) * 100)),
    }
  }

  getUnreadAlertCount(): number {
    return this.alerts.filter(a => !a.read).length
  }

  simulateScan(): void {
    if (!this.group) return
    for (const member of this.group.members) {
      const rand = Math.random()
      if (rand > 0.8) {
        member.walletStatus = 'warning'
        member.securityScore = calculateMemberScore(member)
        this.addAlert({
          memberId: member.id,
          memberAddress: member.address,
          memberLabel: member.label,
          type: 'suspicious_tx',
          severity: 'medium',
          message: `Suspicious transaction detected for ${member.label}`,
          chainId: 1,
          chainName: 'Ethereum',
          timestamp: new Date().toISOString(),
        })
      } else if (rand > 0.95) {
        member.walletStatus = 'compromised'
        member.securityScore = calculateMemberScore(member)
        this.group.activeThreats++
        this.addAlert({
          memberId: member.id,
          memberAddress: member.address,
          memberLabel: member.label,
          type: 'compromise',
          severity: 'critical',
          message: `CRITICAL: ${member.label}'s wallet may be compromised!`,
          chainId: 1,
          chainName: 'Ethereum',
          timestamp: new Date().toISOString(),
        })
      } else {
        member.walletStatus = 'safe'
        member.securityScore = calculateMemberScore(member)
      }
      member.lastActivity = new Date().toISOString()
    }
    this.group.familySecurityScore = calculateFamilyScore(this.group.members)
    this.saveToStorage()
  }
}
