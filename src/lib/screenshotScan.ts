// Screenshot-to-Scan — AI-powered image analysis for scam detection
// Extracts text (OCR placeholder), detects phishing patterns, and assesses risk

// ── Types ────────────────────────────────────────────────────────────────────

export interface ScanFinding {
  type: 'phishing_url' | 'scam_address' | 'fake_website' | 'urgency_tactic' | 'impersonation' | 'suspicious_pattern' | 'malicious_link' | 'known_scam'
  severity: 'critical' | 'high' | 'medium' | 'low'
  description: string
  evidence: string           // extracted text or matched pattern
  confidence: number         // 0-100
}

export interface ExtractedEntity {
  type: 'address' | 'url' | 'email' | 'phone' | 'domain' | 'seed_phrase'
  value: string
  riskLevel: 'danger' | 'warning' | 'safe' | 'unknown'
}

export interface ScreenshotScanResult {
  id: string
  timestamp: number
  riskScore: number          // 0-100
  riskLevel: 'critical' | 'high' | 'medium' | 'low' | 'safe'
  summary: string
  findings: ScanFinding[]
  extractedEntities: ExtractedEntity[]
  ocrText: string
  knownPhishingMatch: boolean
  reportedToCommunity: boolean
}

export interface ScamReport {
  scanId: string
  screenshotHash: string
  findings: ScanFinding[]
  reporterAddress?: string
  timestamp: number
}

// ── Known phishing patterns ──────────────────────────────────────────────────

const PHISHING_URL_PATTERNS = [
  /metamask[.-]?(wallet|support|connect|verify|restore|update)\./i,
  /wallet[.-]?(connect|verify|restore|sync|claim)\./i,
  /uniswap[.-]?(airdrop|claim|reward|bonus)\./i,
  /airdrop[.-]?(claim|free|bonus|reward)\./i,
  /opensea[.-]?(verify|claim|mint|free)\./i,
  /binance[.-]?(verify|claim|support|airdrop)\./i,
  /crypto[.-]?(giveaway|free|bonus|claim)\./i,
  /defi[.-]?(claim|airdrop|reward|bonus)\./i,
  /eth[-.]?(merge|claim|free|airdrop)\./i,
]

const SCAM_KEYWORDS = [
  'congratulations', 'you have been selected', 'claim your reward',
  'verify your wallet', 'connect wallet to claim', 'urgent action required',
  'your account will be suspended', 'limited time offer', 'free airdrop',
  'send 1 get 10 back', 'guaranteed returns', 'seed phrase required',
  'private key needed', 'validate your wallet', 'synchronize your wallet',
  'unlock your funds', 'gas fee refund', 'rectify your wallet',
]

const URGENCY_PATTERNS = [
  /within \d+ (hours?|minutes?|days?)/i,
  /expires? (today|soon|in)/i,
  /act (now|fast|immediately|quickly)/i,
  /last chance/i,
  /don'?t miss out/i,
  /time (is )?(running )?(out|limited)/i,
]

const KNOWN_SCAM_ADDRESSES = new Set([
  '0x0000000000000000000000000000000000000000',
  '0x000000000000000000000000000000000000dead',
])

// ── OCR / Text Extraction ────────────────────────────────────────────────────

/**
 * Extract text from an image (placeholder — production would use Tesseract.js or cloud OCR)
 * For now, simulates extraction based on common scam screenshot patterns
 */
export async function extractTextFromImage(imageData: string | File): Promise<string> {
  // In production: send to Tesseract.js / Google Vision / AWS Textract
  // For demo, return a simulated extraction
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve('[OCR extraction would appear here — connect Tesseract.js or cloud OCR provider for production use]')
    }, 500)
  })
}

/**
 * Parse extracted text into structured entities
 */
export function extractEntities(text: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = []

  // Ethereum addresses
  const addressRegex = /0x[a-fA-F0-9]{40}/g
  let match: RegExpExecArray | null
  while ((match = addressRegex.exec(text)) !== null) {
    const addr = match[0]
    const risk = KNOWN_SCAM_ADDRESSES.has(addr.toLowerCase()) ? 'danger' : 'unknown'
    entities.push({ type: 'address', value: addr, riskLevel: risk })
  }

  // URLs
  const urlRegex = /https?:\/\/[^\s<>"')\]]+/g
  while ((match = urlRegex.exec(text)) !== null) {
    const url = match[0]
    const isPhishing = PHISHING_URL_PATTERNS.some(p => p.test(url))
    entities.push({ type: 'url', value: url, riskLevel: isPhishing ? 'danger' : 'unknown' })
  }

  // Domains (without protocol)
  const domainRegex = /\b([a-z0-9-]+\.)+(com|net|org|io|xyz|site|online|tech|app|finance)\b/gi
  while ((match = domainRegex.exec(text)) !== null) {
    const domain = match[0]
    const isPhishing = PHISHING_URL_PATTERNS.some(p => p.test(domain))
    if (!entities.some(e => e.type === 'url' && e.value.includes(domain))) {
      entities.push({ type: 'domain', value: domain, riskLevel: isPhishing ? 'danger' : 'unknown' })
    }
  }

  // Emails
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
  while ((match = emailRegex.exec(text)) !== null) {
    entities.push({ type: 'email', value: match[0], riskLevel: 'unknown' })
  }

  // Seed phrases (12/24 common words)
  const seedWords = text.match(/\b(\w+\s+){11,23}\w+\b/g)
  if (seedWords) {
    for (const phrase of seedWords) {
      const words = phrase.trim().split(/\s+/)
      if (words.length === 12 || words.length === 24) {
        entities.push({ type: 'seed_phrase', value: phrase.substring(0, 60) + '…', riskLevel: 'danger' })
      }
    }
  }

  return entities
}

// ── AI Analysis Engine ───────────────────────────────────────────────────────

/**
 * Analyze a screenshot for scam indicators
 * In production, this would call a vision model API
 */
export async function analyzeScreenshot(
  imageData: string | File,
  ocrText?: string
): Promise<ScreenshotScanResult> {
  const id = `scan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const text = ocrText || await extractTextFromImage(imageData)
  const entities = extractEntities(text)
  const findings: ScanFinding[] = []
  let riskScore = 0

  // Check for phishing URLs
  const phishingUrls = entities.filter(e => (e.type === 'url' || e.type === 'domain') && e.riskLevel === 'danger')
  if (phishingUrls.length > 0) {
    findings.push({
      type: 'phishing_url',
      severity: 'critical',
      description: `Detected ${phishingUrls.length} known phishing URL pattern(s)`,
      evidence: phishingUrls.map(e => e.value).join(', '),
      confidence: 90,
    })
    riskScore += 35
  }

  // Check for known scam addresses
  const scamAddresses = entities.filter(e => e.type === 'address' && e.riskLevel === 'danger')
  if (scamAddresses.length > 0) {
    findings.push({
      type: 'scam_address',
      severity: 'critical',
      description: `Found ${scamAddresses.length} address(es) in the known scam database`,
      evidence: scamAddresses.map(e => e.value).join(', '),
      confidence: 95,
    })
    riskScore += 30
  }

  // Check for scam keywords
  const lowerText = text.toLowerCase()
  const matchedKeywords = SCAM_KEYWORDS.filter(kw => lowerText.includes(kw))
  if (matchedKeywords.length > 0) {
    findings.push({
      type: 'suspicious_pattern',
      severity: matchedKeywords.length >= 3 ? 'high' : 'medium',
      description: `Found ${matchedKeywords.length} scam indicator keyword(s)`,
      evidence: matchedKeywords.join(', '),
      confidence: 70 + matchedKeywords.length * 5,
    })
    riskScore += matchedKeywords.length * 8
  }

  // Check for urgency tactics
  const urgencyMatches = URGENCY_PATTERNS.filter(p => p.test(text))
  if (urgencyMatches.length > 0) {
    findings.push({
      type: 'urgency_tactic',
      severity: 'high',
      description: 'Social engineering urgency tactics detected',
      evidence: urgencyMatches.map(p => p.source).join(', '),
      confidence: 80,
    })
    riskScore += 15
  }

  // Check for seed phrase exposure
  const seedPhrases = entities.filter(e => e.type === 'seed_phrase')
  if (seedPhrases.length > 0) {
    findings.push({
      type: 'suspicious_pattern',
      severity: 'critical',
      description: 'Seed phrase / recovery phrase detected — NEVER share these!',
      evidence: 'Seed phrase pattern found in image',
      confidence: 85,
    })
    riskScore += 25
  }

  // Check for wallet verification scams
  if (lowerText.includes('verify') && (lowerText.includes('wallet') || lowerText.includes('account'))) {
    findings.push({
      type: 'fake_website',
      severity: 'high',
      description: 'Wallet verification scam pattern detected',
      evidence: 'Text contains "verify" + "wallet/account" — common phishing tactic',
      confidence: 75,
    })
    riskScore += 20
  }

  // Impersonation check
  const brands = ['metamask', 'coinbase', 'binance', 'uniswap', 'opensea', 'trezor', 'ledger', 'phantom']
  const foundBrands = brands.filter(b => lowerText.includes(b))
  if (foundBrands.length > 0 && (lowerText.includes('support') || lowerText.includes('verify') || lowerText.includes('update'))) {
    findings.push({
      type: 'impersonation',
      severity: 'high',
      description: `Possible brand impersonation: ${foundBrands.join(', ')}`,
      evidence: `Found brand names combined with support/verify/update language`,
      confidence: 70,
    })
    riskScore += 15
  }

  // Cap risk score
  riskScore = Math.min(100, Math.max(0, riskScore))

  const riskLevel: ScreenshotScanResult['riskLevel'] =
    riskScore >= 75 ? 'critical' :
    riskScore >= 50 ? 'high' :
    riskScore >= 25 ? 'medium' :
    riskScore >= 10 ? 'low' : 'safe'

  const summary = riskLevel === 'safe'
    ? 'No significant scam indicators detected in this screenshot.'
    : riskLevel === 'critical'
    ? '⚠️ CRITICAL: This screenshot shows strong indicators of a scam. Do NOT interact with any links or addresses shown.'
    : riskLevel === 'high'
    ? 'High risk detected. This screenshot contains multiple indicators of a phishing or scam attempt.'
    : `Moderate risk (${riskScore}/100). Some suspicious patterns found — exercise caution.`

  return {
    id,
    timestamp: Date.now(),
    riskScore,
    riskLevel,
    summary,
    findings,
    extractedEntities: entities,
    ocrText: text,
    knownPhishingMatch: phishingUrls.length > 0 || scamAddresses.length > 0,
    reportedToCommunity: false,
  }
}

// ── Community Reporting ──────────────────────────────────────────────────────

const reportedScams: ScamReport[] = []

/**
 * Report a scan result to the community scam database
 */
export function reportScam(result: ScreenshotScanResult, reporterAddress?: string): ScamReport {
  const report: ScamReport = {
    scanId: result.id,
    screenshotHash: `hash_${result.id}`,
    findings: result.findings,
    reporterAddress,
    timestamp: Date.now(),
  }
  reportedScams.push(report)
  return report
}

/**
 * Get recent community scam reports
 */
export function getRecentReports(limit = 50): ScamReport[] {
  return reportedScams
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit)
}

/**
 * Get community report count
 */
export function getReportCount(): number {
  return reportedScams.length
}

/**
 * Check if a URL appears in any community report
 */
export function isUrlReported(url: string): boolean {
  return reportedScams.some(r =>
    r.findings.some(f => f.evidence.includes(url))
  )
}
