'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  addContact,
  updateContact,
  deleteContact,
  getAllContacts,
  sendTestAlert,
  getAlertHistory,
  getAlertStats,
  updateTwilioConfig,
  getConfig,
  ALERT_TRIGGERS,
  type EmergencyContact,
  type EmergencyAlert,
  type AlertPriority,
  type AlertTrigger,
  type TwilioConfig,
} from '@/lib/emergencyAlert'

const PRIORITY_OPTIONS: { value: AlertPriority; label: string; icon: string; desc: string }[] = [
  { value: 'sms', label: 'SMS Only', icon: '💬', desc: 'Text message alert' },
  { value: 'call', label: 'Call Only', icon: '📞', desc: 'Phone call alert' },
  { value: 'both', label: 'SMS + Call', icon: '📱', desc: 'Both text and call' },
]

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-yellow-400 bg-yellow-500/10',
  sent: 'text-blue-400 bg-blue-500/10',
  delivered: 'text-green-400 bg-green-500/10',
  failed: 'text-red-400 bg-red-500/10',
  acknowledged: 'text-purple-400 bg-purple-500/10',
}

export default function EmergencyAlertsPage() {
  const [contacts, setContacts] = useState<EmergencyContact[]>([])
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([])
  const [stats, setStats] = useState<ReturnType<typeof getAlertStats> | null>(null)
  const [showAddContact, setShowAddContact] = useState(false)
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null)
  const [showTwilio, setShowTwilio] = useState(false)
  const [showTriggers, setShowTriggers] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<string>('')

  // Form state
  const [formName, setFormName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPriority, setFormPriority] = useState<AlertPriority>('both')
  const [formTriggers, setFormTriggers] = useState<AlertTrigger[]>(['hack_detected', 'drainer_activity', 'balance_drain'])

  // Twilio form
  const [twilioSid, setTwilioSid] = useState('')
  const [twilioToken, setTwilioToken] = useState('')
  const [twilioFrom, setTwilioFrom] = useState('')

  useEffect(() => {
    refreshData()
  }, [])

  const refreshData = () => {
    setContacts(getAllContacts())
    setAlerts(getAlertHistory())
    setStats(getAlertStats())
  }

  const resetForm = () => {
    setFormName('')
    setFormPhone('')
    setFormEmail('')
    setFormPriority('both')
    setFormTriggers(['hack_detected', 'drainer_activity', 'balance_drain'])
    setEditingContact(null)
    setShowAddContact(false)
  }

  const handleEditContact = (contact: EmergencyContact) => {
    setEditingContact(contact)
    setFormName(contact.name)
    setFormPhone(contact.phone)
    setFormEmail(contact.email || '')
    setFormPriority(contact.priority)
    setFormTriggers(contact.triggers)
    setShowAddContact(true)
  }

  const handleSaveContact = () => {
    if (!formName || !formPhone) return

    if (editingContact) {
      updateContact(editingContact.id, {
        name: formName,
        phone: formPhone,
        email: formEmail || undefined,
        priority: formPriority,
        triggers: formTriggers,
        enabled: true,
      })
    } else {
      addContact({
        name: formName,
        phone: formPhone,
        email: formEmail || undefined,
        priority: formPriority,
        enabled: true,
        triggers: formTriggers,
      })
    }

    resetForm()
    refreshData()
  }

  const handleDeleteContact = (id: string) => {
    deleteContact(id)
    refreshData()
  }

  const handleTestAlert = async (contactId: string) => {
    setTestingId(contactId)
    setTestResult('')
    try {
      const alert = await sendTestAlert(contactId)
      setTestResult(alert.status === 'sent' ? '✅ Test alert sent successfully!' : '⚠️ Test alert sent (demo mode)')
    } catch (err) {
      setTestResult('❌ Failed to send test alert')
    }
    setTestingId(null)
    setTimeout(() => setTestResult(''), 3000)
    refreshData()
  }

  const handleToggleTrigger = (trigger: AlertTrigger) => {
    setFormTriggers(prev =>
      prev.includes(trigger) ? prev.filter(t => t !== trigger) : [...prev, trigger]
    )
  }

  const handleSaveTwilio = () => {
    updateTwilioConfig({
      accountSid: twilioSid,
      authToken: twilioToken,
      fromNumber: twilioFrom,
      enabled: !!(twilioSid && twilioToken && twilioFrom),
    })
    setShowTwilio(false)
    refreshData()
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <nav className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">SweepGuard</span>
        </Link>
        <div className="flex gap-4">
          <Link href="/scan" className="text-sm text-white/50 hover:text-white transition-colors">Scan</Link>
          <Link href="/dashboard" className="text-sm text-white/50 hover:text-white transition-colors">Dashboard</Link>
          <Link href="/emergency-alerts" className="text-sm text-green-400 font-medium">Emergency Alerts</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">🚨</span>
            <div>
              <h1 className="text-3xl font-bold">Emergency Alert System</h1>
              <p className="text-white/40">SMS & phone call alerts when your wallet is compromised</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {[
              { label: 'Active Contacts', value: stats.activeContacts, icon: '👥' },
              { label: 'Total Alerts', value: stats.totalAlerts, icon: '🔔' },
              { label: 'Success Rate', value: `${stats.successRate}%`, icon: '📊' },
              { label: 'Failed', value: stats.failed, icon: '❌' },
            ].map((card, i) => (
              <div key={i} className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                <span className="text-lg">{card.icon}</span>
                <p className="text-2xl font-bold mt-1">{card.value}</p>
                <p className="text-white/30 text-xs">{card.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Twilio Config */}
        <div className="mb-6">
          <button onClick={() => setShowTwilio(!showTwilio)} className="text-sm text-white/40 hover:text-white/70 transition-colors flex items-center gap-2">
            <span>{showTwilio ? '▼' : '▶'}</span> 📞 Twilio Configuration
          </button>
          {showTwilio && (
            <div className="mt-3 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-white/30 mb-1 block">Account SID</label>
                  <input value={twilioSid} onChange={e => setTwilioSid(e.target.value)} placeholder="AC..."
                    className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white text-sm font-mono focus:outline-none focus:border-green-500/40" />
                </div>
                <div>
                  <label className="text-xs text-white/30 mb-1 block">Auth Token</label>
                  <input type="password" value={twilioToken} onChange={e => setTwilioToken(e.target.value)} placeholder="..."
                    className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white text-sm font-mono focus:outline-none focus:border-green-500/40" />
                </div>
                <div>
                  <label className="text-xs text-white/30 mb-1 block">From Number</label>
                  <input value={twilioFrom} onChange={e => setTwilioFrom(e.target.value)} placeholder="+1..."
                    className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white text-sm font-mono focus:outline-none focus:border-green-500/40" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-white/30 text-xs">Configure Twilio credentials to enable real SMS/call alerts. Without credentials, alerts run in demo mode.</p>
                <button onClick={handleSaveTwilio} className="px-4 py-2 bg-green-600 rounded-lg text-sm font-medium hover:bg-green-500 transition-all">
                  Save
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Alert Triggers Config */}
        <div className="mb-8">
          <button onClick={() => setShowTriggers(!showTriggers)} className="text-sm text-white/40 hover:text-white/70 transition-colors flex items-center gap-2">
            <span>{showTriggers ? '▼' : '▶'}</span> ⚡ Alert Triggers
          </button>
          {showTriggers && (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              {ALERT_TRIGGERS.map(trigger => (
                <div key={trigger.trigger} className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{trigger.icon}</span>
                    <span className="font-semibold text-sm">{trigger.label}</span>
                    {trigger.threshold && <span className="text-[10px] px-2 py-0.5 bg-white/[0.05] rounded text-white/30">{trigger.threshold}</span>}
                  </div>
                  <p className="text-white/40 text-xs">{trigger.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contacts Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">👥 Emergency Contacts</h2>
            <button
              onClick={() => { resetForm(); setShowAddContact(true) }}
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl text-sm font-semibold hover:from-green-500 hover:to-emerald-500 transition-all"
            >
              + Add Contact
            </button>
          </div>

          {/* Add/Edit Contact Form */}
          {showAddContact && (
            <div className="p-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl mb-4 space-y-4">
              <h3 className="font-semibold">{editingContact ? 'Edit Contact' : 'Add Emergency Contact'}</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/30 mb-1 block">Name *</label>
                  <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="John Doe"
                    className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white text-sm focus:outline-none focus:border-green-500/40" />
                </div>
                <div>
                  <label className="text-xs text-white/30 mb-1 block">Phone *</label>
                  <input value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="+1234567890"
                    className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white text-sm font-mono focus:outline-none focus:border-green-500/40" />
                </div>
              </div>

              <div>
                <label className="text-xs text-white/30 mb-1 block">Email (optional)</label>
                <input value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="john@example.com"
                  className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white text-sm focus:outline-none focus:border-green-500/40" />
              </div>

              <div>
                <label className="text-xs text-white/30 mb-2 block">Alert Priority</label>
                <div className="flex gap-2">
                  {PRIORITY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setFormPriority(opt.value)}
                      className={`flex-1 p-3 rounded-xl border text-center transition-all ${
                        formPriority === opt.value
                          ? 'border-green-500/40 bg-green-500/10 text-green-400'
                          : 'border-white/[0.06] bg-white/[0.02] text-white/40 hover:border-white/[0.12]'
                      }`}
                    >
                      <span className="text-lg block">{opt.icon}</span>
                      <span className="text-xs font-medium">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-white/30 mb-2 block">Triggers</label>
                <div className="flex flex-wrap gap-2">
                  {ALERT_TRIGGERS.map(trigger => (
                    <button
                      key={trigger.trigger}
                      onClick={() => handleToggleTrigger(trigger.trigger)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        formTriggers.includes(trigger.trigger)
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-white/[0.03] text-white/30 border border-white/[0.06] hover:border-white/[0.12]'
                      }`}
                    >
                      {trigger.icon} {trigger.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button onClick={resetForm} className="px-4 py-2 bg-white/[0.05] rounded-lg text-sm text-white/50 hover:text-white/80 transition-all">
                  Cancel
                </button>
                <button onClick={handleSaveContact} disabled={!formName || !formPhone}
                  className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg text-sm font-semibold disabled:opacity-40 hover:from-green-500 hover:to-emerald-500 transition-all">
                  {editingContact ? 'Update' : 'Add Contact'}
                </button>
              </div>
            </div>
          )}

          {/* Contact List */}
          {contacts.length === 0 ? (
            <div className="p-8 bg-white/[0.02] border border-white/[0.06] rounded-2xl text-center">
              <span className="text-4xl block mb-3">👥</span>
              <p className="text-white/40 text-sm">No emergency contacts yet.</p>
              <p className="text-white/20 text-xs mt-1">Add a contact to receive SMS/call alerts when your wallet is compromised.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {contacts.map(contact => (
                <div key={contact.id} className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center text-lg">
                        {contact.name[0].toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">{contact.name}</h4>
                        <p className="text-white/40 text-xs font-mono">{contact.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-white/[0.05] text-white/40">
                        {PRIORITY_OPTIONS.find(p => p.value === contact.priority)?.icon} {contact.priority}
                      </span>
                      <button onClick={() => handleTestAlert(contact.id)} disabled={testingId === contact.id}
                        className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-400 hover:bg-blue-500/20 transition-all disabled:opacity-50">
                        {testingId === contact.id ? '...' : '🔔 Test'}
                      </button>
                      <button onClick={() => handleEditContact(contact)}
                        className="px-3 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-xs text-white/40 hover:text-white/70 transition-all">
                        ✏️
                      </button>
                      <button onClick={() => handleDeleteContact(contact.id)}
                        className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 hover:bg-red-500/20 transition-all">
                        🗑️
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {contact.triggers.map(t => {
                      const trigger = ALERT_TRIGGERS.find(at => at.trigger === t)
                      return trigger ? (
                        <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.03] text-white/30">
                          {trigger.icon} {trigger.label}
                        </span>
                      ) : null
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
          {testResult && <p className="mt-2 text-sm text-center">{testResult}</p>}
        </div>

        {/* Alert History */}
        <div>
          <h2 className="text-lg font-semibold mb-4">📋 Alert History</h2>
          {alerts.length === 0 ? (
            <div className="p-8 bg-white/[0.02] border border-white/[0.06] rounded-2xl text-center">
              <span className="text-4xl block mb-3">📋</span>
              <p className="text-white/40 text-sm">No alerts sent yet.</p>
              <p className="text-white/20 text-xs mt-1">Alerts will appear here when triggered or tested.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map(alert => (
                <div key={alert.id} className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{ALERT_TRIGGERS.find(t => t.trigger === alert.trigger)?.icon || '🔔'}</span>
                      <span className="font-semibold text-sm">{alert.contactName}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[alert.status]}`}>
                        {alert.status}
                      </span>
                    </div>
                    <span className="text-white/30 text-xs">{new Date(alert.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-white/50 text-xs">{alert.message.slice(0, 120)}...</p>
                  <div className="mt-2 flex items-center gap-3 text-[10px] text-white/20">
                    <span>Priority: {alert.priority}</span>
                    <span>Wallet: {alert.walletAddress.slice(0, 10)}...</span>
                    {alert.retryCount > 0 && <span>Retries: {alert.retryCount}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
