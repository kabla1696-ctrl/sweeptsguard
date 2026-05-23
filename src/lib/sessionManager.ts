// WalletConnect Session Manager — list, monitor, and disconnect dApp sessions
import { ethers } from 'ethers'

export type SessionStatus = 'active' | 'idle' | 'suspicious' | 'expired'

export interface ManagedSession {
  id: string
  topic: string
  dAppName: string
  dAppUrl: string
  dAppIcon: string
  dAppDescription: string
  connectedAccounts: string[]
  chainIds: number[]
  namespaces: string[]
  status: SessionStatus
  connectedAt: string
  lastActivity: string
  idleMinutes: number
  reputation: DAppReputation
  permissions: SessionPermission[]
  metadata: Record<string, string>
}

export interface DAppReputation {
  score: number // 0-100
  level: 'trusted' | 'neutral' | 'suspicious' | 'malicious'
  factors: string[]
  reports: number
  verified: boolean
}

export interface SessionPermission {
  method: string
  description: string
  risk: 'low' | 'medium' | 'high'
}

export interface SessionHistoryEntry {
  id: string
  dAppName: string
  action: 'connected' | 'disconnected' | 'auto-disconnected' | 'revoked'
  timestamp: string
  reason?: string
  accounts: string[]
}

export interface SessionManagerResult {
  sessions: ManagedSession[]
  history: SessionHistoryEntry[]
  stats: {
    total: number
    active: number
    idle: number
    suspicious: number
    autoDisconnectThreshold: number
  }
}

// Known dApp reputation database
const DAPP_REPUTATION: Record<string, Partial<DAppReputation>> = {
  'app.uniswap.org': { score: 95, level: 'trusted', verified: true, reports: 0, factors: ['Verified DEX', 'Open source', 'Audited'] },
  'aave.com': { score: 95, level: 'trusted', verified: true, reports: 0, factors: ['Verified lending protocol', 'Audited'] },
  'opensea.io': { score: 90, level: 'trusted', verified: true, reports: 0, factors: ['Verified NFT marketplace'] },
  'curve.fi': { score: 90, level: 'trusted', verified: true, reports: 0, factors: ['Verified DEX', 'Battle tested'] },
  'app.1inch.io': { score: 88, level: 'trusted', verified: true, reports: 0, factors: ['Verified aggregator'] },
  'pancakeswap.finance': { score: 85, level: 'trusted', verified: true, reports: 0, factors: ['Verified DEX on BNB'] },
  'matcha.xyz': { score: 85, level: 'trusted', verified: true, reports: 0, factors: ['0x backed aggregator'] },
  'blur.io': { score: 80, level: 'trusted', verified: true, reports: 0, factors: ['NFT marketplace'] },
  'app.compound.finance': { score: 90, level: 'trusted', verified: true, reports: 0, factors: ['Verified lending protocol'] },
}

// Suspicious patterns in dApp URLs
const SUSPICIOUS_URL_PATTERNS = [
  /airdrop.*claim/i,
  /free.*mint/i,
  /connect.*wallet.*now/i,
  /urgent.*action/i,
  /\.xyz$/i,
  /\.top$/i,
  /\.click$/i,
  /uniswap-.*\.com/i,
  /aave-.*\.com/i,
  /opensea-.*\.com/i,
]

// High-risk methods that need extra scrutiny
const HIGH_RISK_METHODS: Record<string, { description: string; risk: 'low' | 'medium' | 'high' }> = {
  eth_sendTransaction: { description: 'Send transactions on your behalf', risk: 'high' },
  personal_sign: { description: 'Request message signatures', risk: 'medium' },
  eth_signTypedData_v4: { description: 'Sign structured data (Permit, etc.)', risk: 'high' },
  eth_signTypedData: { description: 'Sign typed data', risk: 'high' },
  eth_sign: { description: 'Raw message signing', risk: 'high' },
  wallet_switchEthereumChain: { description: 'Switch active chain', risk: 'low' },
  wallet_addEthereumChain: { description: 'Add new chain to wallet', risk: 'medium' },
  eth_requestAccounts: { description: 'Request account access', risk: 'low' },
}

export class SessionManager {
  private sessions: ManagedSession[] = []
  private history: SessionHistoryEntry[] = []
  private autoDisconnectMinutes: number = 1440 // 24 hours

  constructor() {
    this.loadMockSessions()
  }

  /**
   * Get all managed sessions with stats.
   */
  async getSessions(): Promise<SessionManagerResult> {
    // Update idle times
    const now = Date.now()
    for (const session of this.sessions) {
      const lastActivity = new Date(session.lastActivity).getTime()
      session.idleMinutes = Math.floor((now - lastActivity) / 60000)

      if (session.status === 'active' && session.idleMinutes > 60) {
        session.status = 'idle'
      }
      if (session.status === 'idle' && session.idleMinutes > this.autoDisconnectMinutes) {
        session.status = 'expired'
      }
    }

    return {
      sessions: this.sessions,
      history: this.history,
      stats: {
        total: this.sessions.length,
        active: this.sessions.filter(s => s.status === 'active').length,
        idle: this.sessions.filter(s => s.status === 'idle').length,
        suspicious: this.sessions.filter(s => s.status === 'suspicious').length,
        autoDisconnectThreshold: this.autoDisconnectMinutes,
      },
    }
  }

  /**
   * Disconnect a specific session.
   */
  async disconnectSession(sessionId: string, reason: string = 'User disconnected'): Promise<{ success: boolean; error?: string }> {
    const session = this.sessions.find(s => s.id === sessionId)
    if (!session) {
      return { success: false, error: 'Session not found' }
    }

    // Remove from active sessions
    this.sessions = this.sessions.filter(s => s.id !== sessionId)

    // Add to history
    this.history.unshift({
      id: `hist-${Date.now()}`,
      dAppName: session.dAppName,
      action: reason.includes('auto') ? 'auto-disconnected' : 'disconnected',
      timestamp: new Date().toISOString(),
      reason,
      accounts: session.connectedAccounts,
    })

    return { success: true }
  }

  /**
   * Disconnect all suspicious sessions.
   */
  async disconnectSuspicious(): Promise<{ disconnected: number }> {
    const suspicious = this.sessions.filter(s => s.status === 'suspicious')
    for (const session of suspicious) {
      await this.disconnectSession(session.id, 'Bulk disconnect — suspicious sessions')
    }
    return { disconnected: suspicious.length }
  }

  /**
   * Auto-disconnect sessions idle beyond threshold.
   */
  async autoDisconnectIdle(): Promise<{ disconnected: number }> {
    const now = Date.now()
    const idle = this.sessions.filter(s => {
      const idleMin = Math.floor((now - new Date(s.lastActivity).getTime()) / 60000)
      return idleMin > this.autoDisconnectMinutes
    })

    for (const session of idle) {
      await this.disconnectSession(session.id, `Auto-disconnected — idle for ${Math.floor((now - new Date(session.lastActivity).getTime()) / 60000)} minutes`)
    }

    return { disconnected: idle.length }
  }

  /**
   * Get reputation for a dApp URL.
   */
  getDAppReputation(url: string): DAppReputation {
    const domain = this.extractDomain(url)

    // Check known database
    const known = DAPP_REPUTATION[domain]
    if (known) {
      return {
        score: known.score ?? 50,
        level: known.level ?? 'neutral',
        factors: known.factors ?? [],
        reports: known.reports ?? 0,
        verified: known.verified ?? false,
      }
    }

    // Check suspicious patterns
    const suspiciousFactors: string[] = []
    for (const pattern of SUSPICIOUS_URL_PATTERNS) {
      if (pattern.test(url) || pattern.test(domain)) {
        suspiciousFactors.push(`Matches suspicious pattern: ${pattern.source}`)
      }
    }

    if (suspiciousFactors.length > 0) {
      return {
        score: 20,
        level: 'suspicious',
        factors: suspiciousFactors,
        reports: 0,
        verified: false,
      }
    }

    // Default neutral
    return {
      score: 50,
      level: 'neutral',
      factors: ['Unknown dApp — no reputation data'],
      reports: 0,
      verified: false,
    }
  }

  /**
   * Set auto-disconnect threshold (in minutes).
   */
  setAutoDisconnectThreshold(minutes: number): void {
    this.autoDisconnectMinutes = Math.max(30, minutes)
  }

  /**
   * Get session history.
   */
  getHistory(): SessionHistoryEntry[] {
    return this.history
  }

  // --- Helpers ---

  private extractDomain(url: string): string {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`)
      return parsed.hostname.replace(/^www\./, '')
    } catch {
      return url
    }
  }

  private loadMockSessions(): void {
    const now = Date.now()
    this.sessions = [
      {
        id: 'session-1',
        topic: 'wc:abc123def456',
        dAppName: 'Uniswap',
        dAppUrl: 'app.uniswap.org',
        dAppIcon: '🦄',
        dAppDescription: 'Decentralized trading protocol',
        connectedAccounts: ['0x1234567890abcdef1234567890abcdef12345678'],
        chainIds: [1, 8453],
        namespaces: ['eip155'],
        status: 'active',
        connectedAt: new Date(now - 3600000 * 2).toISOString(),
        lastActivity: new Date(now - 300000).toISOString(),
        idleMinutes: 5,
        reputation: this.getDAppReputation('app.uniswap.org'),
        permissions: [
          { method: 'eth_sendTransaction', ...HIGH_RISK_METHODS.eth_sendTransaction },
          { method: 'personal_sign', ...HIGH_RISK_METHODS.personal_sign },
          { method: 'eth_signTypedData_v4', ...HIGH_RISK_METHODS.eth_signTypedData_v4 },
        ],
        metadata: {},
      },
      {
        id: 'session-2',
        topic: 'wc:ghi789jkl012',
        dAppName: 'OpenSea',
        dAppUrl: 'opensea.io',
        dAppIcon: '⛵',
        dAppDescription: 'NFT marketplace',
        connectedAccounts: ['0x1234567890abcdef1234567890abcdef12345678'],
        chainIds: [1, 137],
        namespaces: ['eip155'],
        status: 'active',
        connectedAt: new Date(now - 86400000).toISOString(),
        lastActivity: new Date(now - 1800000).toISOString(),
        idleMinutes: 30,
        reputation: this.getDAppReputation('opensea.io'),
        permissions: [
          { method: 'eth_sendTransaction', ...HIGH_RISK_METHODS.eth_sendTransaction },
          { method: 'eth_signTypedData_v4', ...HIGH_RISK_METHODS.eth_signTypedData_v4 },
        ],
        metadata: {},
      },
      {
        id: 'session-3',
        topic: 'wc:mno345pqr678',
        dAppName: 'Free Airdrop Claim',
        dAppUrl: 'free-airdrop-claim.xyz',
        dAppIcon: '🎁',
        dAppDescription: 'Claim your free tokens now!',
        connectedAccounts: ['0x1234567890abcdef1234567890abcdef12345678'],
        chainIds: [1],
        namespaces: ['eip155'],
        status: 'suspicious',
        connectedAt: new Date(now - 7200000).toISOString(),
        lastActivity: new Date(now - 600000).toISOString(),
        idleMinutes: 10,
        reputation: this.getDAppReputation('free-airdrop-claim.xyz'),
        permissions: [
          { method: 'eth_sendTransaction', ...HIGH_RISK_METHODS.eth_sendTransaction },
          { method: 'eth_sign', ...HIGH_RISK_METHODS.eth_sign },
          { method: 'eth_signTypedData_v4', ...HIGH_RISK_METHODS.eth_signTypedData_v4 },
        ],
        metadata: {},
      },
      {
        id: 'session-4',
        topic: 'wc:stu901vwx234',
        dAppName: 'Aave',
        dAppUrl: 'aave.com',
        dAppIcon: '👻',
        dAppDescription: 'Decentralized lending protocol',
        connectedAccounts: ['0x1234567890abcdef1234567890abcdef12345678'],
        chainIds: [1, 42161, 137],
        namespaces: ['eip155'],
        status: 'idle',
        connectedAt: new Date(now - 86400000 * 3).toISOString(),
        lastActivity: new Date(now - 7200000).toISOString(),
        idleMinutes: 120,
        reputation: this.getDAppReputation('aave.com'),
        permissions: [
          { method: 'eth_sendTransaction', ...HIGH_RISK_METHODS.eth_sendTransaction },
          { method: 'personal_sign', ...HIGH_RISK_METHODS.personal_sign },
        ],
        metadata: {},
      },
    ]

    this.history = [
      {
        id: 'hist-1',
        dAppName: 'PancakeSwap',
        action: 'disconnected',
        timestamp: new Date(now - 86400000 * 2).toISOString(),
        reason: 'User disconnected',
        accounts: ['0x1234567890abcdef1234567890abcdef12345678'],
      },
      {
        id: 'hist-2',
        dAppName: 'Unknown Airdrop',
        action: 'auto-disconnected',
        timestamp: new Date(now - 86400000 * 4).toISOString(),
        reason: 'Auto-disconnected — idle for 1500 minutes',
        accounts: ['0x1234567890abcdef1234567890abcdef12345678'],
      },
      {
        id: 'hist-3',
        dAppName: 'Curve Finance',
        action: 'disconnected',
        timestamp: new Date(now - 86400000 * 5).toISOString(),
        reason: 'User disconnected after review',
        accounts: ['0x1234567890abcdef1234567890abcdef12345678'],
      },
    ]
  }
}

export const sessionManager = new SessionManager()
