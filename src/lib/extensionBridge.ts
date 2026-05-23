// Browser Extension Bridge — Communication layer between SweepGuard and browser extensions
import { ethers } from 'ethers'
import { CHAINS } from './chains'

export interface ExtensionMessage {
  type: 'SIMULATE_TX' | 'CHECK_RISK' | 'GET_WALLET' | 'ALERT' | 'PING' | 'CONFIG_UPDATE'
  id: string
  payload: unknown
  timestamp: number
}

export interface ExtensionResponse {
  id: string
  success: boolean
  data?: unknown
  error?: string
}

export interface TransactionSimulation {
  success: boolean
  gasUsed: string
  gasCostETH: string
  gasCostUSD: string
  tokenTransfers: { from: string; to: string; token: string; amount: string; symbol: string }[]
  warnings: string[]
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical'
  riskScore: number // 0-100
  revertReason?: string
}

export interface RiskCheck {
  address: string
  isKnownDrainer: boolean
  drainerName?: string
  isContract: boolean
  isProxy: boolean
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical'
  warnings: string[]
  tokenInfo?: { name: string; symbol: string; isHoneypot: boolean }
}

export interface ExtensionConfig {
  enabled: boolean
  autoSimulate: boolean // Auto-simulate before signing
  blockHighRisk: boolean // Block transactions with risk >= high
  showWarnings: boolean
  whitelistedAddresses: string[]
  blacklistedAddresses: string[]
  alertThreshold: number // 0-100 risk score threshold for alerts
  theme: 'dark' | 'light' | 'auto'
}

export const DEFAULT_EXTENSION_CONFIG: ExtensionConfig = {
  enabled: true,
  autoSimulate: true,
  blockHighRisk: true,
  showWarnings: true,
  whitelistedAddresses: [],
  blacklistedAddresses: [],
  alertThreshold: 50,
  theme: 'dark',
}

// Known drainer addresses
const KNOWN_DRAINERS: Record<string, string> = {
  '0xcce0a2ebe17c5e532802896fc8afcaab8abd8ba0': 'Inferno Drainer',
  '0xb0d6b42f6406d8b9ae980de584c21f517bf0b746': 'Inferno Drainer (Base)',
  '0x54ba52cbd043b0b2e11a6823a910360e31bb2544': 'Phishing Drainer',
  '0x8652767d52054d2cd29343369b19ba357f46869d': 'Secondary Drainer',
}

// Suspicious method selectors
const SUSPICIOUS_METHODS: Record<string, { name: string; risk: number }> = {
  '0xa1798512': { name: 'Inferno Drain', risk: 100 },
  '0x095ea7b3': { name: 'approve', risk: 30 },
  '0xa22cb465': { name: 'setApprovalForAll', risk: 70 },
  '0xd505accf': { name: 'permit', risk: 40 },
  '0x2b67b570': { name: 'Permit2', risk: 40 },
  '0x1cff79cd': { name: 'execute (delegatecall)', risk: 60 },
}

export class ExtensionBridge {
  private config: ExtensionConfig
  private messageHandlers: Map<string, (response: ExtensionResponse) => void> = new Map()
  private connected: boolean = false
  private simulationCache: Map<string, TransactionSimulation> = new Map()

  constructor(config: Partial<ExtensionConfig> = {}) {
    this.config = { ...DEFAULT_EXTENSION_CONFIG, ...config }
  }

  // Check if extension is available
  isAvailable(): boolean {
    if (typeof window === 'undefined') return false
    return !!(window as unknown as Record<string, unknown>).__sweepguard_extension
  }

  // Connect to the extension
  async connect(): Promise<boolean> {
    if (this.isAvailable()) {
      this.connected = true
      return true
    }

    // Try postMessage bridge
    return new Promise((resolve) => {
      const handler = (event: MessageEvent) => {
        if (event.data?.type === 'SWEEPGUARD_EXTENSION_READY') {
          this.connected = true
          window.removeEventListener('message', handler)
          resolve(true)
        }
      }
      window.addEventListener('message', handler)

      // Timeout after 3 seconds
      setTimeout(() => {
        window.removeEventListener('message', handler)
        resolve(false)
      }, 3000)
    })
  }

  // Send message to extension
  async sendMessage<T>(type: ExtensionMessage['type'], payload: unknown): Promise<T> {
    const message: ExtensionMessage = {
      type,
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      payload,
      timestamp: Date.now(),
    }

    // Try direct extension API
    if (this.isAvailable()) {
      const ext = (window as unknown as Record<string, unknown>).__sweepguard_extension as { send: (msg: ExtensionMessage) => Promise<unknown> }
      return ext.send(message) as Promise<T>
    }

    // Try postMessage
    return new Promise((resolve, reject) => {
      const handler = (event: MessageEvent) => {
        if (event.data?.id === message.id) {
          window.removeEventListener('message', handler)
          if (event.data.success) {
            resolve(event.data.data as T)
          } else {
            reject(new Error(event.data.error || 'Extension error'))
          }
        }
      }
      window.addEventListener('message', handler)
      window.postMessage(message, '*')

      // Timeout
      setTimeout(() => {
        window.removeEventListener('message', handler)
        reject(new Error('Extension response timeout'))
      }, 10000)
    })
  }

  // Simulate a transaction
  async simulateTransaction(chainId: number, tx: { from: string; to: string; data: string; value?: string }): Promise<TransactionSimulation> {
    const cacheKey = `${chainId}-${tx.from}-${tx.to}-${tx.data.slice(0, 20)}-${tx.value || '0'}`
    const cached = this.simulationCache.get(cacheKey)
    if (cached) return cached

    // Client-side simulation
    const simulation = await this.clientSimulate(chainId, tx)
    this.simulationCache.set(cacheKey, simulation)
    return simulation
  }

  // Client-side transaction simulation
  private async clientSimulate(
    chainId: number,
    tx: { from: string; to: string; data: string; value?: string }
  ): Promise<TransactionSimulation> {
    const warnings: string[] = []
    let riskScore = 0
    const tokenTransfers: TransactionSimulation['tokenTransfers'] = []

    // Check if target is a known drainer
    const toLower = tx.to?.toLowerCase()
    if (toLower && KNOWN_DRAINERS[toLower]) {
      warnings.push(`🚨 RECIPIENT IS A KNOWN DRAINER: ${KNOWN_DRAINERS[toLower]}`)
      riskScore += 80
    }

    // Analyze method selector
    if (tx.data && tx.data.length >= 10) {
      const selector = tx.data.slice(0, 10).toLowerCase()
      const method = SUSPICIOUS_METHODS[selector]
      if (method) {
        if (method.risk >= 70) {
          warnings.push(`🚨 HIGH RISK METHOD: ${method.name} (${selector})`)
        } else if (method.risk >= 40) {
          warnings.push(`⚠️ Medium risk method: ${method.name}`)
        }
        riskScore += method.risk * 0.3

        // Decode approve calls
        if (selector === '0x095ea7b3') {
          try {
            const iface = new ethers.Interface(['function approve(address spender, uint256 amount)'])
            const decoded = iface.decodeFunctionData('approve', tx.data)
            const amount = decoded[1] as bigint
            if (amount === ethers.MaxUint256) {
              warnings.push('⚠️ UNLIMITED token approval — they can spend ALL your tokens')
              riskScore += 20
            }
            tokenTransfers.push({
              from: tx.from,
              to: decoded[0] as string,
              token: tx.to,
              amount: amount === ethers.MaxUint256 ? 'UNLIMITED' : amount.toString(),
              symbol: 'TOKEN',
            })
          } catch {}
        }

        // Decode setApprovalForAll
        if (selector === '0xa22cb465') {
          warnings.push('🖼️ This grants FULL control over your NFTs')
          riskScore += 25
        }
      }
    }

    // Check for native value transfer
    if (tx.value && tx.value !== '0x0' && tx.value !== '0') {
      const valueWei = BigInt(tx.value)
      const valueETH = parseFloat(ethers.formatEther(valueWei))
      if (valueETH > 1) {
        warnings.push(`💸 Sending ${valueETH.toFixed(4)} ETH`)
        riskScore += Math.min(valueETH * 5, 30)
      } else if (valueETH > 0.1) {
        warnings.push(`💰 Sending ${valueETH.toFixed(4)} ETH`)
        riskScore += valueETH * 10
      }
      tokenTransfers.push({
        from: tx.from,
        to: tx.to,
        token: 'Native',
        amount: valueETH.toFixed(6),
        symbol: 'ETH',
      })
    }

    // Check whitelist/blacklist
    if (toLower && this.config.blacklistedAddresses.includes(toLower)) {
      warnings.push('🚫 Recipient is on your BLACKLIST')
      riskScore += 50
    }
    if (toLower && this.config.whitelistedAddresses.includes(toLower)) {
      riskScore = Math.max(0, riskScore - 20)
    }

    // Cap risk score
    riskScore = Math.min(Math.round(riskScore), 100)

    // Determine risk level
    let riskLevel: TransactionSimulation['riskLevel']
    if (riskScore >= 80) riskLevel = 'critical'
    else if (riskScore >= 60) riskLevel = 'high'
    else if (riskScore >= 30) riskLevel = 'medium'
    else if (riskScore >= 10) riskLevel = 'low'
    else riskLevel = 'safe'

    // Add generic warnings based on risk
    if (riskLevel === 'critical') {
      warnings.unshift('🛑 DO NOT SIGN THIS TRANSACTION — HIGH DRAIN RISK')
    } else if (riskLevel === 'high') {
      warnings.unshift('⚠️ PROCEED WITH EXTREME CAUTION')
    }

    return {
      success: true,
      gasUsed: '0',
      gasCostETH: '0',
      gasCostUSD: '0',
      tokenTransfers,
      warnings,
      riskLevel,
      riskScore,
    }
  }

  // Check risk for an address
  async checkAddressRisk(address: string): Promise<RiskCheck> {
    const toLower = address.toLowerCase()
    const warnings: string[] = []
    let riskScore = 0

    const isKnownDrainer = !!KNOWN_DRAINERS[toLower]
    if (isKnownDrainer) {
      warnings.push(`🚨 KNOWN DRAINER: ${KNOWN_DRAINERS[toLower]}`)
      riskScore = 100
    }

    // Simulate contract check
    const isContract = false // Would check getCode in production
    const isProxy = false

    let riskLevel: RiskCheck['riskLevel']
    if (riskScore >= 80) riskLevel = 'critical'
    else if (riskScore >= 60) riskLevel = 'high'
    else if (riskScore >= 30) riskLevel = 'medium'
    else if (riskScore >= 10) riskLevel = 'low'
    else riskLevel = 'safe'

    return {
      address,
      isKnownDrainer,
      drainerName: KNOWN_DRAINERS[toLower],
      isContract,
      isProxy,
      riskLevel,
      warnings,
    }
  }

  // Update config
  updateConfig(config: Partial<ExtensionConfig>): void {
    this.config = { ...this.config, ...config }
  }

  getConfig(): ExtensionConfig {
    return { ...this.config }
  }

  // Get extension status
  getStatus(): { available: boolean; connected: boolean; config: ExtensionConfig } {
    return {
      available: this.isAvailable(),
      connected: this.connected,
      config: this.config,
    }
  }

  // Add to whitelist
  addToWhitelist(address: string): void {
    const normalized = address.toLowerCase()
    if (!this.config.whitelistedAddresses.includes(normalized)) {
      this.config.whitelistedAddresses.push(normalized)
    }
  }

  // Remove from whitelist
  removeFromWhitelist(address: string): void {
    this.config.whitelistedAddresses = this.config.whitelistedAddresses.filter(
      a => a !== address.toLowerCase()
    )
  }

  // Add to blacklist
  addToBlacklist(address: string): void {
    const normalized = address.toLowerCase()
    if (!this.config.blacklistedAddresses.includes(normalized)) {
      this.config.blacklistedAddresses.push(normalized)
    }
  }

  // Remove from blacklist
  removeFromBlacklist(address: string): void {
    this.config.blacklistedAddresses = this.config.blacklistedAddresses.filter(
      a => a !== address.toLowerCase()
    )
  }

  // Clear simulation cache
  clearCache(): void {
    this.simulationCache.clear()
  }
}

// Singleton instance
export const extensionBridge = new ExtensionBridge()
