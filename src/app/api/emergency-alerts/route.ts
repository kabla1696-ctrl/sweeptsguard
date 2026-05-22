import { NextRequest, NextResponse } from 'next/server'
import {
  addContact,
  updateContact,
  deleteContact,
  getContact,
  getAllContacts,
  dispatchAlert,
  sendTestAlert,
  getAlertHistory,
  acknowledgeAlert,
  getConfig,
  updateConfig,
  updateTwilioConfig,
  getAlertStats,
  ALERT_TRIGGERS,
  type AlertTrigger,
  type AlertPriority,
} from '@/lib/emergencyAlert'
import { sanitizeErrorMessage } from '@/lib/validation'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

export async function GET(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = rateLimit(ip)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetTime - Date.now()) / 1000)) } }
    )
  }

  const action = request.nextUrl.searchParams.get('action')

  try {
    switch (action) {
      case 'contacts':
        return NextResponse.json({ contacts: getAllContacts() })

      case 'contact': {
        const id = request.nextUrl.searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'Missing contact id' }, { status: 400 })
        const contact = getContact(id)
        if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
        return NextResponse.json(contact)
      }

      case 'history': {
        const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50', 10)
        return NextResponse.json({ alerts: getAlertHistory(limit) })
      }

      case 'triggers':
        return NextResponse.json({ triggers: ALERT_TRIGGERS })

      case 'config':
        return NextResponse.json(getConfig())

      case 'stats':
        return NextResponse.json(getAlertStats())

      default:
        return NextResponse.json({
          contacts: getAllContacts(),
          stats: getAlertStats(),
          config: getConfig(),
        })
    }
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = rateLimit(ip)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetTime - Date.now()) / 1000)) } }
    )
  }

  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'addContact': {
        const { name, phone, email, priority, triggers } = body
        if (!name || !phone) {
          return NextResponse.json({ error: 'Missing required fields: name, phone' }, { status: 400 })
        }
        const validPriorities: AlertPriority[] = ['sms', 'call', 'both']
        if (priority && !validPriorities.includes(priority)) {
          return NextResponse.json({ error: 'Invalid priority. Must be: sms, call, or both' }, { status: 400 })
        }
        const contact = addContact({
          name,
          phone,
          email,
          priority: priority || 'both',
          enabled: true,
          triggers: triggers || ['hack_detected', 'drainer_activity', 'balance_drain'],
        })
        return NextResponse.json(contact, { status: 201 })
      }

      case 'updateContact': {
        const { id, ...updates } = body
        if (!id) return NextResponse.json({ error: 'Missing contact id' }, { status: 400 })
        const updated = updateContact(id, updates)
        if (!updated) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
        return NextResponse.json(updated)
      }

      case 'deleteContact': {
        const { id } = body
        if (!id) return NextResponse.json({ error: 'Missing contact id' }, { status: 400 })
        const deleted = deleteContact(id)
        if (!deleted) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
        return NextResponse.json({ success: true })
      }

      case 'dispatch': {
        const { contactId, trigger, walletAddress, chainId, amount, txHash, customMessage } = body
        if (!contactId || !trigger || !walletAddress) {
          return NextResponse.json({ error: 'Missing required fields: contactId, trigger, walletAddress' }, { status: 400 })
        }
        const validTriggers: AlertTrigger[] = ['hack_detected', 'large_transfer', 'approval_granted', 'drainer_activity', 'balance_drain', 'custom']
        if (!validTriggers.includes(trigger)) {
          return NextResponse.json({ error: 'Invalid trigger type' }, { status: 400 })
        }
        const alert = await dispatchAlert({ contactId, trigger, walletAddress, chainId, amount, txHash, customMessage })
        return NextResponse.json(alert)
      }

      case 'test': {
        const { contactId } = body
        if (!contactId) return NextResponse.json({ error: 'Missing contactId' }, { status: 400 })
        const alert = await sendTestAlert(contactId)
        return NextResponse.json(alert)
      }

      case 'acknowledge': {
        const { alertId } = body
        if (!alertId) return NextResponse.json({ error: 'Missing alertId' }, { status: 400 })
        const alert = acknowledgeAlert(alertId)
        if (!alert) return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
        return NextResponse.json(alert)
      }

      case 'updateConfig': {
        const { config } = body
        if (!config || typeof config !== 'object') {
          return NextResponse.json({ error: 'Missing config object' }, { status: 400 })
        }
        const updated = updateConfig(config)
        return NextResponse.json(updated)
      }

      case 'updateTwilio': {
        const { twilio } = body
        if (!twilio || typeof twilio !== 'object') {
          return NextResponse.json({ error: 'Missing twilio config object' }, { status: 400 })
        }
        const updated = updateTwilioConfig(twilio)
        return NextResponse.json(updated)
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
}
