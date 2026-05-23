// Emergency Alert System — SMS/Phone call alerts when hack detected
// Twilio integration placeholders + emergency contact management

// ============================================================
// Types
// ============================================================

export type AlertPriority = 'sms' | 'call' | 'both'
export type AlertTrigger = 'hack_detected' | 'large_transfer' | 'approval_granted' | 'drainer_activity' | 'balance_drain' | 'custom'
export type AlertStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'acknowledged'

export interface EmergencyContact {
  id: string
  name: string
  phone: string
  email?: string
  priority: AlertPriority
  enabled: boolean
  triggers: AlertTrigger[]
  createdAt: number
  updatedAt: number
}

export interface EmergencyAlert {
  id: string
  contactId: string
  contactName: string
  phone: string
  trigger: AlertTrigger
  priority: AlertPriority
  status: AlertStatus
  message: string
  walletAddress: string
  chainId: number
  amount?: string
  txHash?: string
  sentAt?: number
  deliveredAt?: number
  acknowledgedAt?: number
  retryCount: number
  createdAt: number
}

export interface AlertTriggerConfig {
  trigger: AlertTrigger
  label: string
  description: string
  icon: string
  defaultEnabled: boolean
  threshold?: string
}

export interface TwilioConfig {
  accountSid: string
  authToken: string
  fromNumber: string
  enabled: boolean
}

export interface EmergencyAlertConfig {
  twilio: TwilioConfig
  contacts: EmergencyContact[]
  globalEnabled: boolean
  cooldownMinutes: number // Minimum minutes between alerts to same contact
  maxRetries: number
}

// ============================================================
// Alert trigger definitions
// ============================================================

export const ALERT_TRIGGERS: AlertTriggerConfig[] = [
  {
    trigger: 'hack_detected',
    label: 'Hack Detected',
    description: 'Unauthorized access or private key compromise detected',
    icon: '🚨',
    defaultEnabled: true,
  },
  {
    trigger: 'large_transfer',
    label: 'Large Transfer',
    description: 'Transfer exceeding threshold amount detected',
    icon: '💸',
    defaultEnabled: true,
    threshold: '> $1,000',
  },
  {
    trigger: 'approval_granted',
    label: 'Token Approval',
    description: 'New unlimited or high-value token approval granted',
    icon: '🔓',
    defaultEnabled: true,
  },
  {
    trigger: 'drainer_activity',
    label: 'Drainer Activity',
    description: 'Known drainer contract interaction detected',
    icon: '🕷️',
    defaultEnabled: true,
  },
  {
    trigger: 'balance_drain',
    label: 'Balance Drain',
    description: 'Wallet balance dropping rapidly (multiple outflows)',
    icon: '📉',
    defaultEnabled: true,
    threshold: '> 50% in 1 hour',
  },
  {
    trigger: 'custom',
    label: 'Custom Trigger',
    description: 'Custom alert trigger configured by user',
    icon: '⚙️',
    defaultEnabled: false,
  },
]

// ============================================================
// In-memory stores (production: use database)
// ============================================================

const contacts: Map<string, EmergencyContact> = new Map()
const alertHistory: EmergencyAlert[] = []
let config: EmergencyAlertConfig = {
  twilio: {
    accountSid: '',
    authToken: '',
    fromNumber: '',
    enabled: false,
  },
  contacts: [],
  globalEnabled: true,
  cooldownMinutes: 5,
  maxRetries: 3,
}

// Track last alert time per contact to enforce cooldown
const lastAlertTime: Map<string, number> = new Map()

// ============================================================
// Helper functions
// ============================================================

function generateId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function formatPhone(phone: string): string {
  // Basic E.164 formatting
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('+')) return phone
  if (cleaned.length === 10) return `+1${cleaned}`
  return `+${cleaned}`
}

function isOnCooldown(contactId: string): boolean {
  const lastTime = lastAlertTime.get(contactId)
  if (!lastTime) return false
  const elapsed = (Date.now() - lastTime) / (1000 * 60)
  return elapsed < config.cooldownMinutes
}

// ============================================================
// Contact management
// ============================================================

export function addContact(contact: Omit<EmergencyContact, 'id' | 'createdAt' | 'updatedAt'>): EmergencyContact {
  const newContact: EmergencyContact = {
    ...contact,
    id: generateId(),
    phone: formatPhone(contact.phone),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  contacts.set(newContact.id, newContact)
  config.contacts = Array.from(contacts.values())
  return newContact
}

export function updateContact(id: string, updates: Partial<Omit<EmergencyContact, 'id' | 'createdAt'>>): EmergencyContact | null {
  const existing = contacts.get(id)
  if (!existing) return null

  const updated: EmergencyContact = {
    ...existing,
    ...updates,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: Date.now(),
  }
  if (updates.phone) updated.phone = formatPhone(updates.phone)

  contacts.set(id, updated)
  config.contacts = Array.from(contacts.values())
  return updated
}

export function deleteContact(id: string): boolean {
  const deleted = contacts.delete(id)
  if (deleted) config.contacts = Array.from(contacts.values())
  return deleted
}

export function getContact(id: string): EmergencyContact | null {
  return contacts.get(id) || null
}

export function getAllContacts(): EmergencyContact[] {
  return Array.from(contacts.values())
}

// ============================================================
// Twilio integration (placeholder)
// ============================================================

async function sendSMS(phone: string, message: string): Promise<{ success: boolean; sid?: string; error?: string }> {
  if (!config.twilio.enabled || !config.twilio.accountSid) {
    // Simulate SMS in demo mode
    console.log(`[DEMO SMS] To: ${phone} | Message: ${message}`)
    return { success: true, sid: `demo_sms_${Date.now()}` }
  }

  try {
    // Twilio REST API call (placeholder)
    const url = `https://api.twilio.com/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`
    const auth = Buffer.from(`${config.twilio.accountSid}:${config.twilio.authToken}`).toString('base64')

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: phone,
        From: config.twilio.fromNumber,
        Body: message,
      }),
    })

    const data = await response.json() as { sid?: string; message?: string }
    if (response.ok) {
      return { success: true, sid: data.sid }
    }
    return { success: false, error: data.message || 'SMS send failed' }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

async function makeCall(phone: string, message: string): Promise<{ success: boolean; sid?: string; error?: string }> {
  if (!config.twilio.enabled || !config.twilio.accountSid) {
    // Simulate call in demo mode
    console.log(`[DEMO CALL] To: ${phone} | Message: ${message}`)
    return { success: true, sid: `demo_call_${Date.now()}` }
  }

  try {
    // Twilio REST API call for voice (placeholder)
    const url = `https://api.twilio.com/2010-04-01/Accounts/${config.twilio.accountSid}/Calls.json`
    const auth = Buffer.from(`${config.twilio.accountSid}:${config.twilio.authToken}`).toString('base64')

    // TwiML for the call
    const twiml = `<Response><Say voice="alice">${message}</Say></Response>`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: phone,
        From: config.twilio.fromNumber,
        Twiml: twiml,
      }),
    })

    const data = await response.json() as { sid?: string; message?: string }
    if (response.ok) {
      return { success: true, sid: data.sid }
    }
    return { success: false, error: data.message || 'Call failed' }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ============================================================
// Alert dispatching
// ============================================================

function buildAlertMessage(trigger: AlertTrigger, walletAddress: string, details?: { amount?: string; txHash?: string; chainId?: number }): string {
  const shortAddr = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
  const chainNames: Record<number, string> = { 1: 'Ethereum', 8453: 'Base', 56: 'BNB', 42161: 'Arbitrum', 137: 'Polygon' }
  const chain = details?.chainId ? (chainNames[details.chainId] || `Chain ${details.chainId}`) : 'Unknown'

  switch (trigger) {
    case 'hack_detected':
      return `🚨 SWEEPGUARD ALERT: Potential hack detected on wallet ${shortAddr} (${chain}). Unauthorized activity in progress. Check your wallet immediately.`
    case 'large_transfer':
      return `💸 SWEEPGUARD ALERT: Large transfer ${details?.amount || ''} detected from wallet ${shortAddr} (${chain}). Tx: ${details?.txHash?.slice(0, 10) || 'pending'}`
    case 'approval_granted':
      return `🔓 SWEEPGUARD ALERT: High-value token approval granted from wallet ${shortAddr} (${chain}). Review and revoke if unauthorized.`
    case 'drainer_activity':
      return `🕷️ SWEEPGUARD ALERT: Known drainer contract interaction on wallet ${shortAddr} (${chain}). Your funds may be at risk!`
    case 'balance_drain':
      return `📉 SWEEPGUARD ALERT: Rapid balance drain detected on wallet ${shortAddr} (${chain}). Multiple outflows in progress.`
    case 'custom':
      return `⚙️ SWEEPGUARD ALERT: Custom alert triggered for wallet ${shortAddr} (${chain}).`
    default:
      return `⚠️ SWEEPGUARD ALERT: Activity detected on wallet ${shortAddr} (${chain}).`
  }
}

export async function dispatchAlert(params: {
  contactId: string
  trigger: AlertTrigger
  walletAddress: string
  chainId?: number
  amount?: string
  txHash?: string
  customMessage?: string
}): Promise<EmergencyAlert> {
  const contact = contacts.get(params.contactId)
  if (!contact) throw new Error('Contact not found')

  const message = params.customMessage || buildAlertMessage(params.trigger, params.walletAddress, {
    amount: params.amount,
    txHash: params.txHash,
    chainId: params.chainId,
  })

  const alert: EmergencyAlert = {
    id: generateId(),
    contactId: contact.id,
    contactName: contact.name,
    phone: contact.phone,
    trigger: params.trigger,
    priority: contact.priority,
    status: 'pending',
    message,
    walletAddress: params.walletAddress,
    chainId: params.chainId || 1,
    amount: params.amount,
    txHash: params.txHash,
    retryCount: 0,
    createdAt: Date.now(),
  }

  // Check cooldown
  if (isOnCooldown(contact.id)) {
    alert.status = 'failed'
    alertHistory.push(alert)
    return alert
  }

  // Dispatch based on priority
  try {
    if (contact.priority === 'sms' || contact.priority === 'both') {
      const smsResult = await sendSMS(contact.phone, message)
      if (smsResult.success) {
        alert.status = 'sent'
        alert.sentAt = Date.now()
      } else {
        alert.status = 'failed'
      }
    }

    if (contact.priority === 'call' || contact.priority === 'both') {
      const callResult = await makeCall(contact.phone, message)
      if (callResult.success) {
        if (alert.status !== 'failed') alert.status = 'sent'
        alert.sentAt = alert.sentAt || Date.now()
      } else {
        if (alert.status !== 'sent') alert.status = 'failed'
      }
    }

    lastAlertTime.set(contact.id, Date.now())
  } catch {
    alert.status = 'failed'
  }

  alertHistory.push(alert)
  return alert
}

export async function dispatchToAllContacts(params: {
  trigger: AlertTrigger
  walletAddress: string
  chainId?: number
  amount?: string
  txHash?: string
}): Promise<EmergencyAlert[]> {
  const activeContacts = Array.from(contacts.values()).filter(c => c.enabled)
  const matchingContacts = activeContacts.filter(c => c.triggers.includes(params.trigger))

  const alerts = await Promise.all(
    matchingContacts.map(contact =>
      dispatchAlert({ ...params, contactId: contact.id })
    )
  )

  return alerts
}

// ============================================================
// Test alert
// ============================================================

export async function sendTestAlert(contactId: string): Promise<EmergencyAlert> {
  return dispatchAlert({
    contactId,
    trigger: 'custom',
    walletAddress: '0x0000000000000000000000000000000000000000',
    customMessage: '🔔 SWEEPGUARD TEST: This is a test alert. Your emergency notification system is working correctly.',
  })
}

// ============================================================
// Alert history
// ============================================================

export function getAlertHistory(limit: number = 50): EmergencyAlert[] {
  return alertHistory.slice(-limit).reverse()
}

export function getAlertHistoryForContact(contactId: string): EmergencyAlert[] {
  return alertHistory.filter(a => a.contactId === contactId).reverse()
}

export function acknowledgeAlert(alertId: string): EmergencyAlert | null {
  const alert = alertHistory.find(a => a.id === alertId)
  if (!alert) return null
  alert.status = 'acknowledged'
  alert.acknowledgedAt = Date.now()
  return alert
}

// ============================================================
// Config management
// ============================================================

export function getConfig(): EmergencyAlertConfig {
  return { ...config }
}

export function updateConfig(updates: Partial<EmergencyAlertConfig>): EmergencyAlertConfig {
  config = { ...config, ...updates }
  return config
}

export function updateTwilioConfig(twilio: Partial<TwilioConfig>): TwilioConfig {
  config.twilio = { ...config.twilio, ...twilio }
  return config.twilio
}

// ============================================================
// Stats
// ============================================================

export function getAlertStats() {
  const total = alertHistory.length
  const sent = alertHistory.filter(a => a.status === 'sent' || a.status === 'delivered').length
  const failed = alertHistory.filter(a => a.status === 'failed').length
  const acknowledged = alertHistory.filter(a => a.status === 'acknowledged').length

  const triggerCounts: Record<string, number> = {}
  for (const alert of alertHistory) {
    triggerCounts[alert.trigger] = (triggerCounts[alert.trigger] || 0) + 1
  }

  return {
    totalAlerts: total,
    sentSuccessfully: sent,
    failed,
    acknowledged,
    successRate: total > 0 ? ((sent / total) * 100).toFixed(1) : '0',
    triggerBreakdown: triggerCounts,
    activeContacts: Array.from(contacts.values()).filter(c => c.enabled).length,
    totalContacts: contacts.size,
  }
}
