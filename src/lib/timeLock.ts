// Time-Locked Withdrawals — delay-based protection for cold wallet funds
import { ethers } from 'ethers'

export type LockStatus = 'active' | 'pending' | 'completed' | 'cancelled' | 'emergency'
export type DelayOption = 24 | 48 | 72

export interface TimeLock {
  id: string
  walletAddress: string
  targetAddress: string
  tokenAddress: string
  tokenSymbol: string
  amount: string
  amountFormatted: string
  chainId: number
  chainName: string
  delayHours: DelayOption
  createdAt: string
  executeAfter: string
  status: LockStatus
  initiatedBy: string
  confirmations: number
  requiredConfirmations: number
  cancellers: string[]
  notes: string
}

export interface PendingWithdrawal {
  lockId: string
  walletAddress: string
  targetAddress: string
  tokenSymbol: string
  amountFormatted: string
  chainName: string
  executeAfter: string
  timeRemaining: string
  timeRemainingMs: number
  canCancel: boolean
  canExtend: boolean
  canEmergencyOverride: boolean
  confirmations: number
  requiredConfirmations: number
}

export interface LockHistoryEntry {
  id: string
  lockId: string
  action: 'created' | 'executed' | 'cancelled' | 'extended' | 'emergency-override'
  timestamp: string
  actor: string
  details: string
}

export interface TimeLockResult {
  locks: TimeLock[]
  pending: PendingWithdrawal[]
  history: LockHistoryEntry[]
  stats: {
    totalLocks: number
    activeLocks: number
    pendingWithdrawals: number
    completedWithdrawals: number
    cancelledLocks: number
    totalValueSecured: string
  }
}

export interface CreateLockParams {
  walletAddress: string
  targetAddress: string
  tokenAddress: string
  tokenSymbol: string
  amount: string
  amountFormatted: string
  chainId: number
  delayHours: DelayOption
  notes?: string
}

export interface EmergencyOverrideParams {
  lockId: string
  reason: string
  multisigSigners: string[]
  signatures: string[]
}

// Time lock delay presets
export const DELAY_OPTIONS: { value: DelayOption; label: string; description: string }[] = [
  { value: 24, label: '24 Hours', description: 'Standard protection — allows time to detect unauthorized access' },
  { value: 48, label: '48 Hours', description: 'Enhanced protection — recommended for large holdings' },
  { value: 72, label: '72 Hours', description: 'Maximum protection — for cold storage / treasury wallets' },
]

// Multi-sig configuration for emergency overrides
const DEFAULT_MULTISIG_CONFIG = {
  requiredConfirmations: 3,
  signers: [
    '0x1111111111111111111111111111111111111111',
    '0x2222222222222222222222222222222222222222',
    '0x3333333333333333333333333333333333333333',
    '0x4444444444444444444444444444444444444444',
    '0x5555555555555555555555555555555555555555',
  ],
}

const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum',
  8453: 'Base',
  56: 'BNB Chain',
  42161: 'Arbitrum',
  137: 'Polygon',
  10: 'Optimism',
}

export class TimeLockManager {
  private locks: TimeLock[] = []
  private history: LockHistoryEntry[] = []
  private multisigConfig = DEFAULT_MULTISIG_CONFIG

  constructor() {
    this.loadMockData()
  }

  /**
   * Get all locks, pending withdrawals, and history.
   */
  async getTimeLocks(): Promise<TimeLockResult> {
    const now = Date.now()

    // Update lock statuses
    for (const lock of this.locks) {
      if (lock.status === 'active' && new Date(lock.executeAfter).getTime() <= now) {
        lock.status = 'pending'
      }
    }

    const pending = this.locks
      .filter(l => l.status === 'pending' || l.status === 'active')
      .map(l => this.toPendingWithdrawal(l, now))
      .filter((p): p is PendingWithdrawal => p !== null)

    return {
      locks: this.locks,
      pending,
      history: this.history,
      stats: {
        totalLocks: this.locks.length,
        activeLocks: this.locks.filter(l => l.status === 'active').length,
        pendingWithdrawals: this.locks.filter(l => l.status === 'pending').length,
        completedWithdrawals: this.locks.filter(l => l.status === 'completed').length,
        cancelledLocks: this.locks.filter(l => l.status === 'cancelled').length,
        totalValueSecured: this.locks
          .filter(l => l.status === 'active' || l.status === 'pending')
          .reduce((sum, l) => sum + parseFloat(l.amountFormatted || '0'), 0)
          .toFixed(4),
      },
    }
  }

  /**
   * Create a new time lock.
   */
  async createLock(params: CreateLockParams): Promise<{ success: boolean; lock?: TimeLock; error?: string }> {
    // Validate target address
    if (!ethers.isAddress(params.targetAddress)) {
      return { success: false, error: 'Invalid target address' }
    }

    const chainName = CHAIN_NAMES[params.chainId] || `Chain ${params.chainId}`
    const now = new Date()
    const executeAfter = new Date(now.getTime() + params.delayHours * 3600000)

    const lock: TimeLock = {
      id: `lock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      walletAddress: params.walletAddress,
      targetAddress: params.targetAddress,
      tokenAddress: params.tokenAddress,
      tokenSymbol: params.tokenSymbol,
      amount: params.amount,
      amountFormatted: params.amountFormatted,
      chainId: params.chainId,
      chainName,
      delayHours: params.delayHours,
      createdAt: now.toISOString(),
      executeAfter: executeAfter.toISOString(),
      status: 'active',
      initiatedBy: params.walletAddress,
      confirmations: 0,
      requiredConfirmations: this.multisigConfig.requiredConfirmations,
      cancellers: [params.walletAddress],
      notes: params.notes || '',
    }

    this.locks.push(lock)

    this.history.unshift({
      id: `hist-${Date.now()}`,
      lockId: lock.id,
      action: 'created',
      timestamp: now.toISOString(),
      actor: params.walletAddress,
      details: `Time lock created: ${params.amountFormatted} ${params.tokenSymbol} → ${params.targetAddress.slice(0, 10)}... (${params.delayHours}h delay)`,
    })

    return { success: true, lock }
  }

  /**
   * Cancel a pending time lock.
   */
  async cancelLock(lockId: string, cancellerAddress: string): Promise<{ success: boolean; error?: string }> {
    const lock = this.locks.find(l => l.id === lockId)
    if (!lock) return { success: false, error: 'Lock not found' }
    if (lock.status !== 'active') return { success: false, error: `Cannot cancel lock in ${lock.status} status` }

    lock.status = 'cancelled'

    this.history.unshift({
      id: `hist-${Date.now()}`,
      lockId,
      action: 'cancelled',
      timestamp: new Date().toISOString(),
      actor: cancellerAddress,
      details: `Time lock cancelled by ${cancellerAddress.slice(0, 10)}...`,
    })

    return { success: true }
  }

  /**
   * Extend the delay on an existing lock.
   */
  async extendLock(lockId: string, additionalHours: DelayOption, actorAddress: string): Promise<{ success: boolean; error?: string }> {
    const lock = this.locks.find(l => l.id === lockId)
    if (!lock) return { success: false, error: 'Lock not found' }
    if (lock.status !== 'active') return { success: false, error: `Cannot extend lock in ${lock.status} status` }

    const currentExecuteAfter = new Date(lock.executeAfter)
    const newExecuteAfter = new Date(currentExecuteAfter.getTime() + additionalHours * 3600000)
    lock.executeAfter = newExecuteAfter.toISOString()
    lock.delayHours = (lock.delayHours + additionalHours) as DelayOption

    this.history.unshift({
      id: `hist-${Date.now()}`,
      lockId,
      action: 'extended',
      timestamp: new Date().toISOString(),
      actor: actorAddress,
      details: `Lock extended by ${additionalHours}h — new execution time: ${newExecuteAfter.toISOString()}`,
    })

    return { success: true }
  }

  /**
   * Execute a pending withdrawal (after delay has elapsed).
   */
  async executeWithdrawal(lockId: string): Promise<{ success: boolean; txHash?: string; error?: string }> {
    const lock = this.locks.find(l => l.id === lockId)
    if (!lock) return { success: false, error: 'Lock not found' }
    if (lock.status !== 'pending') return { success: false, error: `Lock must be in pending status (current: ${lock.status})` }

    const now = Date.now()
    const executeAt = new Date(lock.executeAfter).getTime()
    if (now < executeAt) {
      const remaining = Math.ceil((executeAt - now) / 3600000)
      return { success: false, error: `Withdrawal time-lock not yet elapsed. ${remaining}h remaining.` }
    }

    lock.status = 'completed'

    const txHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`

    this.history.unshift({
      id: `hist-${Date.now()}`,
      lockId,
      action: 'executed',
      timestamp: new Date().toISOString(),
      actor: lock.walletAddress,
      details: `Withdrawal executed: ${lock.amountFormatted} ${lock.tokenSymbol} → ${lock.targetAddress.slice(0, 10)}...`,
    })

    return { success: true, txHash }
  }

  /**
   * Emergency override with multi-sig approval.
   */
  async emergencyOverride(params: EmergencyOverrideParams, actorAddress: string): Promise<{ success: boolean; error?: string }> {
    const lock = this.locks.find(l => l.id === params.lockId)
    if (!lock) return { success: false, error: 'Lock not found' }
    if (lock.status !== 'active' && lock.status !== 'pending') {
      return { success: false, error: `Cannot override lock in ${lock.status} status` }
    }

    // Validate multi-sig signatures
    if (params.multisigSigners.length < this.multisigConfig.requiredConfirmations) {
      return { success: false, error: `Requires ${this.multisigConfig.requiredConfirmations} multi-sig confirmations (got ${params.multisigSigners.length})` }
    }

    // Verify signers are authorized
    const validSigners = params.multisigSigners.filter(s =>
      this.multisigConfig.signers.some(known => known.toLowerCase() === s.toLowerCase())
    )

    if (validSigners.length < this.multisigConfig.requiredConfirmations) {
      return { success: false, error: 'Not enough valid multi-sig signers' }
    }

    lock.status = 'emergency'
    lock.confirmations = validSigners.length

    this.history.unshift({
      id: `hist-${Date.now()}`,
      lockId: params.lockId,
      action: 'emergency-override',
      timestamp: new Date().toISOString(),
      actor: actorAddress,
      details: `Emergency override activated. Reason: ${params.reason}. Confirmed by ${validSigners.length} signers.`,
    })

    return { success: true }
  }

  /**
   * Get lock history.
   */
  getHistory(): LockHistoryEntry[] {
    return this.history
  }

  /**
   * Get multi-sig configuration.
   */
  getMultisigConfig() {
    return { ...this.multisigConfig }
  }

  // --- Helpers ---

  private toPendingWithdrawal(lock: TimeLock, now: number): PendingWithdrawal | null {
    const executeAt = new Date(lock.executeAfter).getTime()
    const remaining = executeAt - now

    return {
      lockId: lock.id,
      walletAddress: lock.walletAddress,
      targetAddress: lock.targetAddress,
      tokenSymbol: lock.tokenSymbol,
      amountFormatted: lock.amountFormatted,
      chainName: lock.chainName,
      executeAfter: lock.executeAfter,
      timeRemaining: this.formatDuration(remaining),
      timeRemainingMs: remaining,
      canCancel: lock.status === 'active',
      canExtend: lock.status === 'active',
      canEmergencyOverride: lock.status === 'active' || lock.status === 'pending',
      confirmations: lock.confirmations,
      requiredConfirmations: lock.requiredConfirmations,
    }
  }

  private formatDuration(ms: number): string {
    if (ms <= 0) return 'Ready to execute'
    const hours = Math.floor(ms / 3600000)
    const minutes = Math.floor((ms % 3600000) / 60000)
    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days}d ${hours % 24}h ${minutes}m`
    }
    return `${hours}h ${minutes}m`
  }

  private loadMockData(): void {
    const now = Date.now()

    this.locks = [
      {
        id: 'lock-1',
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        targetAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        tokenAddress: '0x0000000000000000000000000000000000000000',
        tokenSymbol: 'ETH',
        amount: ethers.parseEther('5').toString(),
        amountFormatted: '5.0000',
        chainId: 1,
        chainName: 'Ethereum',
        delayHours: 48,
        createdAt: new Date(now - 86400000).toISOString(),
        executeAfter: new Date(now + 86400000).toISOString(),
        status: 'active',
        initiatedBy: '0x1234567890abcdef1234567890abcdef12345678',
        confirmations: 0,
        requiredConfirmations: 3,
        cancellers: ['0x1234567890abcdef1234567890abcdef12345678'],
        notes: 'Monthly cold wallet withdrawal to hot wallet',
      },
      {
        id: 'lock-2',
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        targetAddress: '0x9876543210fedcba9876543210fedcba98765432',
        tokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        tokenSymbol: 'USDC',
        amount: '10000000000',
        amountFormatted: '10000.0000',
        chainId: 1,
        chainName: 'Ethereum',
        delayHours: 24,
        createdAt: new Date(now - 172800000).toISOString(),
        executeAfter: new Date(now - 3600000).toISOString(),
        status: 'pending',
        initiatedBy: '0x1234567890abcdef1234567890abcdef12345678',
        confirmations: 0,
        requiredConfirmations: 3,
        cancellers: ['0x1234567890abcdef1234567890abcdef12345678'],
        notes: 'Treasury allocation for marketing',
      },
      {
        id: 'lock-3',
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        targetAddress: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
        tokenAddress: '0x0000000000000000000000000000000000000000',
        tokenSymbol: 'ETH',
        amount: ethers.parseEther('10').toString(),
        amountFormatted: '10.0000',
        chainId: 8453,
        chainName: 'Base',
        delayHours: 72,
        createdAt: new Date(now - 259200000).toISOString(),
        executeAfter: new Date(now - 86400000).toISOString(),
        status: 'completed',
        initiatedBy: '0x1234567890abcdef1234567890abcdef12345678',
        confirmations: 0,
        requiredConfirmations: 3,
        cancellers: ['0x1234567890abcdef1234567890abcdef12345678'],
        notes: 'Quarterly cold wallet rotation',
      },
    ]

    this.history = [
      {
        id: 'hist-1',
        lockId: 'lock-3',
        action: 'executed',
        timestamp: new Date(now - 86400000).toISOString(),
        actor: '0x1234567890abcdef1234567890abcdef12345678',
        details: 'Withdrawal executed: 10.0000 ETH → 0xdeadbeef...',
      },
      {
        id: 'hist-2',
        lockId: 'lock-3',
        action: 'created',
        timestamp: new Date(now - 259200000).toISOString(),
        actor: '0x1234567890abcdef1234567890abcdef12345678',
        details: 'Time lock created: 10.0000 ETH → 0xdeadbee... (72h delay)',
      },
      {
        id: 'hist-3',
        lockId: 'lock-cancelled-1',
        action: 'cancelled',
        timestamp: new Date(now - 432000000).toISOString(),
        actor: '0x1234567890abcdef1234567890abcdef12345678',
        details: 'Time lock cancelled — recipient address changed',
      },
    ]
  }
}

export const timeLockManager = new TimeLockManager()
