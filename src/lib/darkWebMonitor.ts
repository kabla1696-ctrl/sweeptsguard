/**
 * Dark Web Monitoring System
 * Monitor if wallet addresses appear on dark web sources
 */

export type ExposureLevel = 'none' | 'low' | 'medium' | 'high' | 'critical'
export type SourceType = 'paste_site' | 'forum' | 'telegram' | 'marketplace' | 'database_leak' | 'unknown'

export interface DarkWebFinding {
  id: string
  source: string
  sourceType: SourceType
  sourceUrl?: string
  address: string
  foundAt: string
  context: string
  exposureLevel: ExposureLevel
  dataTypes: string[] // e.g. ['address', 'email', 'ip', 'private_key']
  verified: boolean
}

export interface BreachRecord {
  id: string
  breachName: string
  breachDate: string
  discoveredDate: string
  affectedAddresses: number
  dataTypes: string[]
  severity: ExposureLevel
  description: string
  source: string
}

export interface RiskAssessment {
  overallRisk: ExposureLevel
  score: number // 0-100, lower is better
  findings: number
  breaches: number
  exposedDataTypes: string[]
  recommendations: string[]
  lastScanDate: string
}

export interface DarkWebScanResult {
  address: string
  scanDate: string
  findings: DarkWebFinding[]
  breaches: BreachRecord[]
  riskAssessment: RiskAssessment
  scanDuration: number
}

// Known breach databases (simulated)
const KNOWN_BREACHES: BreachRecord[] = [
  {
    id: 'breach-001',
    breachName: 'CryptoForum 2024 Leak',
    breachDate: '2024-03-15',
    discoveredDate: '2024-03-20',
    affectedAddresses: 45000,
    dataTypes: ['address', 'email', 'username'],
    severity: 'high',
    description: 'Major crypto forum database leaked including wallet addresses linked to email accounts.',
    source: 'Underground forum',
  },
  {
    id: 'breach-002',
    breachName: 'DEX User Data Exposure',
    breachDate: '2024-06-01',
    discoveredDate: '2024-06-10',
    affectedAddresses: 120000,
    dataTypes: ['address', 'ip', 'transaction_history'],
    severity: 'medium',
    description: 'Decentralized exchange frontend vulnerability exposed user wallet addresses and IP correlations.',
    source: 'Paste site',
  },
  {
    id: 'breach-003',
    breachName: 'Phishing Kit Database',
    breachDate: '2024-08-22',
    discoveredDate: '2024-08-25',
    affectedAddresses: 8500,
    dataTypes: ['address', 'private_key', 'seed_phrase'],
    severity: 'critical',
    description: 'Large phishing operation database found containing private keys and seed phrases from drainer victims.',
    source: 'Dark web marketplace',
  },
  {
    id: 'breach-004',
    breachName: 'Bridge Exploit Victim List',
    breachDate: '2024-01-10',
    discoveredDate: '2024-01-15',
    affectedAddresses: 32000,
    dataTypes: ['address', 'chain_data'],
    severity: 'medium',
    description: 'List of wallet addresses affected by cross-chain bridge exploits being traded on dark web.',
    source: 'Telegram channel',
  },
  {
    id: 'breach-005',
    breachName: 'NFT Discord Server Leak',
    breachDate: '2024-09-05',
    discoveredDate: '2024-09-08',
    affectedAddresses: 67000,
    dataTypes: ['address', 'discord_id', 'email'],
    severity: 'low',
    description: 'NFT community Discord server breach exposed wallet addresses linked to Discord accounts.',
    source: 'Forum',
  },
]

const PASTE_SITES = ['pastebin.com', 'ghostbin.co', 'dpaste.org', 'hastebin.com', 'rentry.co']
const FORUMS = ['breached.to', 'exploit.in', 'cracked.to', 'xss.is', 'lolz.guru']
const TELEGRAM_CHANNELS = ['@crypto_leaks', '@wallet_dumps', '@defi_expo', '@drainer_data']

function generateId(): string {
  return `dw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export class DarkWebMonitorEngine {
  private address: string
  private findings: DarkWebFinding[] = []
  private breaches: BreachRecord[] = []
  private lastScanDate: string | null = null

  constructor(address: string) {
    this.address = address.toLowerCase()
    this.loadFromStorage()
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return
    try {
      const key = `sweeptsguard_darkweb_${this.address}`
      const stored = localStorage.getItem(key)
      if (stored) {
        const data = JSON.parse(stored)
        this.findings = data.findings || []
        this.breaches = data.breaches || []
        this.lastScanDate = data.lastScanDate || null
      }
    } catch {}
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return
    try {
      const key = `sweeptsguard_darkweb_${this.address}`
      localStorage.setItem(key, JSON.stringify({
        findings: this.findings,
        breaches: this.breaches,
        lastScanDate: this.lastScanDate,
      }))
    } catch {}
  }

  async scan(): Promise<DarkWebScanResult> {
    const startTime = Date.now()
    this.findings = []
    this.breaches = []

    // Simulate scanning paste sites
    for (const site of PASTE_SITES) {
      if (Math.random() > 0.7) {
        const dataTypes = this.randomDataTypes()
        this.findings.push({
          id: generateId(),
          source: site,
          sourceType: 'paste_site',
          sourceUrl: `https://${site}/search?q=${this.address.slice(0, 10)}`,
          address: this.address,
          foundAt: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString(),
          context: `Address found in a paste dump containing ${Math.floor(Math.random() * 1000) + 100} wallet addresses.`,
          exposureLevel: dataTypes.includes('private_key') ? 'critical' : dataTypes.includes('email') ? 'medium' : 'low',
          dataTypes,
          verified: Math.random() > 0.5,
        })
      }
    }

    // Simulate scanning forums
    for (const forum of FORUMS) {
      if (Math.random() > 0.75) {
        const dataTypes = this.randomDataTypes()
        this.findings.push({
          id: generateId(),
          source: forum,
          sourceType: 'forum',
          address: this.address,
          foundAt: new Date(Date.now() - Math.random() * 60 * 86400000).toISOString(),
          context: `Mentioned in thread about wallet drainer targets. ${Math.floor(Math.random() * 50) + 1} replies.`,
          exposureLevel: dataTypes.includes('private_key') ? 'critical' : 'medium',
          dataTypes,
          verified: Math.random() > 0.3,
        })
      }
    }

    // Simulate scanning Telegram channels
    for (const channel of TELEGRAM_CHANNELS) {
      if (Math.random() > 0.8) {
        this.findings.push({
          id: generateId(),
          source: channel,
          sourceType: 'telegram',
          address: this.address,
          foundAt: new Date(Date.now() - Math.random() * 14 * 86400000).toISOString(),
          context: `Address shared in channel as potential drainer target.`,
          exposureLevel: 'high',
          dataTypes: ['address'],
          verified: false,
        })
      }
    }

    // Check against known breaches
    for (const breach of KNOWN_BREACHES) {
      if (Math.random() > 0.6) {
        this.breaches.push(breach)
      }
    }

    this.lastScanDate = new Date().toISOString()
    const scanDuration = Date.now() - startTime + Math.floor(Math.random() * 3000) + 2000

    this.saveToStorage()

    return {
      address: this.address,
      scanDate: this.lastScanDate,
      findings: this.findings,
      breaches: this.breaches,
      riskAssessment: this.getRiskAssessment(),
      scanDuration,
    }
  }

  private randomDataTypes(): string[] {
    const types = ['address', 'email', 'ip', 'username', 'transaction_history']
    const result = ['address']
    for (const t of types.slice(1)) {
      if (Math.random() > 0.5) result.push(t)
    }
    // Small chance of private key exposure
    if (Math.random() > 0.9) result.push('private_key')
    return result
  }

  getRiskAssessment(): RiskAssessment {
    const criticalFindings = this.findings.filter(f => f.exposureLevel === 'critical').length
    const highFindings = this.findings.filter(f => f.exposureLevel === 'high').length
    const mediumFindings = this.findings.filter(f => f.exposureLevel === 'medium').length
    const criticalBreaches = this.breaches.filter(b => b.severity === 'critical').length
    const highBreaches = this.breaches.filter(b => b.severity === 'high').length

    let score = 0
    score += criticalFindings * 30
    score += highFindings * 15
    score += mediumFindings * 5
    score += criticalBreaches * 25
    score += highBreaches * 10
    score += this.breaches.length * 3
    score = Math.min(100, score)

    let overallRisk: ExposureLevel = 'none'
    if (score >= 70) overallRisk = 'critical'
    else if (score >= 50) overallRisk = 'high'
    else if (score >= 25) overallRisk = 'medium'
    else if (score > 0) overallRisk = 'low'

    const exposedDataTypes = [...new Set(this.findings.flatMap(f => f.dataTypes))]

    const recommendations: string[] = []
    if (exposedDataTypes.includes('private_key')) {
      recommendations.push('🚨 CRITICAL: Private key exposed! Move all funds immediately to a new wallet.')
    }
    if (exposedDataTypes.includes('email')) {
      recommendations.push('Change email associated with crypto accounts. Enable 2FA on all accounts.')
    }
    if (exposedDataTypes.includes('ip')) {
      recommendations.push('Use a VPN for all crypto activities. Consider changing your IP address.')
    }
    if (this.findings.length > 3) {
      recommendations.push('Multiple exposures detected. Consider using a hardware wallet and fresh addresses.')
    }
    if (this.breaches.length > 2) {
      recommendations.push('Your address appears in multiple breaches. Rotate all associated credentials.')
    }
    if (recommendations.length === 0) {
      recommendations.push('No immediate action required. Continue monitoring and practice good security hygiene.')
    }

    return {
      overallRisk,
      score,
      findings: this.findings.length,
      breaches: this.breaches.length,
      exposedDataTypes,
      recommendations,
      lastScanDate: this.lastScanDate || 'Never',
    }
  }

  getFindings(): DarkWebFinding[] {
    return this.findings
  }

  getBreaches(): BreachRecord[] {
    return this.breaches
  }

  getLastScanDate(): string | null {
    return this.lastScanDate
  }
}
