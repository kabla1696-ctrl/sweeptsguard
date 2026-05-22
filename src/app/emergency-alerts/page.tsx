'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const PRIORITY_OPTIONS = [
  { value: 'sms', label: 'SMS Only', icon: '💬', desc: 'Text message alert' },
  { value: 'call', label: 'Call Only', icon: '📞', desc: 'Phone call alert' },
  { value: 'both', label: 'SMS + Call', icon: '📱', desc: 'Both text and call' },
]

const TRIGGERS = [
  { id: 'hack', label: 'Hack Detected', icon: '🔓', enabled: true },
  { id: 'drainer', label: 'Drainer Activity', icon: '🪣', enabled: true },
  { id: 'drain', label: 'Balance Drain', icon: '💸', enabled: true },
  { id: 'approval', label: 'Suspicious Approval', icon: '⚠️', enabled: false },
  { id: 'large_tx', label: 'Large Transaction', icon: '🐋', enabled: false },
]

const MOCK_ALERTS = [
  { id: '1', contact: 'Alice', type: 'sms', status: 'delivered', time: '2 min ago', trigger: 'Hack Detected' },
  { id: '2', contact: 'Bob', type: 'call', status: 'failed', time: '1 hour ago', trigger: 'Drainer Activity' },
  { id: '3', contact: 'Charlie', type: 'both', status: 'acknowledged', time: '3 hours ago', trigger: 'Balance Drain' },
]

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  sent: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  delivered: 'text-green-400 bg-green-500/10 border-green-500/20',
  failed: 'text-red-400 bg-red-500/10 border-red-500/20',
  acknowledged: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
}

export default function EmergencyAlertsPage() {
  const [tab, setTab] = useState<'contacts' | 'triggers' | 'history'>('contacts')
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [priority, setPriority] = useState('both')
  const [contacts, setContacts] = useState<{ id: string; name: string; phone: string; email?: string; priority: string; enabled: boolean; triggers: string[] }[]>([])
  const [alerts, setAlerts] = useState<typeof MOCK_ALERTS>(MOCK_ALERTS)
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState('')

  const fetchContacts = async () => {
    try {
      const res = await fetch('/api/emergency-alerts?action=contacts')
      const data = await res.json()
      if (res.ok && data.contacts) setContacts(data.contacts)
    } catch {}
  }

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/emergency-alerts?action=history')
      const data = await res.json()
      if (res.ok && data.alerts) setAlerts(data.alerts)
    } catch {}
  }

  useEffect(() => {
    fetchContacts()
    fetchHistory()
  }, [])

  const handleAddContact = async () => {
    if (!name || !phone) return
    setLoading(true)
    try {
      const res = await fetch('/api/emergency-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'addContact', name, phone, email, priority }),
      })
      if (res.ok) {
        await fetchContacts()
        setShowAdd(false)
        setName('')
        setPhone('')
        setEmail('')
        setPriority('both')
      }
    } catch {}
    setLoading(false)
  }

  const handleTest = async (contactId?: string) => {
    setTesting(true)
    setTestResult('')
    try {
      const id = contactId || contacts[0]?.id
      if (!id) { setTestResult('❌ No contacts to test'); setTesting(false); return }
      const res = await fetch('/api/emergency-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', contactId: id }),
      })
      if (res.ok) setTestResult('✅ Test alert sent successfully!')
      else setTestResult('❌ Test failed')
    } catch {
      setTestResult('❌ Network error')
    }
    setTesting(false)
  }

  const handleDeleteContact = async (id: string) => {
    try {
      await fetch('/api/emergency-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteContact', id }),
      })
      await fetchContacts()
    } catch {}
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#050507] via-[#0a0a0f] to-[#050507] text-white">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 -left-32 w-96 h-96 bg-red-500/5 rounded-full blur-[128px] animate-pulse" />
        <div className="absolute bottom-1/3 -right-32 w-96 h-96 bg-[#00e5ff]/5 rounded-full blur-[128px] animate-pulse delay-1000" />
      </div>

      <nav className="relative z-10 flex justify-between items-center px-6 py-5 max-w-7xl mx-auto border-b border-white/[0.06]">
        <Link href="/" className="flex items-center gap-3">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-[#00ff87] to-[#00e5ff] bg-clip-text text-transparent">SweepGuard</span>
        </Link>
        <div className="flex gap-6">
          <Link href="/dashboard" className="text-sm text-white/40 hover:text-white/80 transition-colors">Dashboard</Link>
          <Link href="/emergency-alerts" className="text-sm text-red-400 font-semibold">Emergency Alerts</Link>
        </div>
      </nav>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            Emergency System
          </div>
          <h1 className="text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">Emergency</span>{' '}
            <span className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Alerts</span>
          </h1>
          <p className="text-white/40 text-lg max-w-xl mx-auto">Instant notifications when threats are detected. Keep your contacts safe.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-1.5">
          {(['contacts', 'triggers', 'history'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                tab === t
                  ? 'bg-gradient-to-r from-[#00ff87]/20 to-[#00e5ff]/20 text-[#00ff87] border border-[#00ff87]/20'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              {t === 'contacts' ? '👥 Contacts' : t === 'triggers' ? '⚡ Triggers' : '📋 History'}
            </button>
          ))}
        </div>

        {/* Contacts Tab */}
        {tab === 'contacts' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Emergency Contacts</h2>
              <button
                onClick={() => setShowAdd(!showAdd)}
                className="px-4 py-2 bg-[#00ff87]/10 border border-[#00ff87]/20 text-[#00ff87] rounded-xl text-sm font-medium hover:bg-[#00ff87]/20 transition-all"
              >
                + Add Contact
              </button>
            </div>

            {showAdd && (
              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">Name</label>
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="Contact name" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#00ff87]/40 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">Phone</label>
                    <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 234 567 8900" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#00ff87]/40 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">Email</label>
                    <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#00ff87]/40 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">Priority</label>
                    <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00ff87]/40 transition-all appearance-none">
                      {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.icon} {o.label}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={handleAddContact} disabled={loading} className="px-6 py-3 bg-gradient-to-r from-[#00ff87] to-[#00e5ff] text-black rounded-xl font-semibold text-sm hover:shadow-[0_0_20px_rgba(0,255,135,0.3)] transition-all disabled:opacity-50">
                  {loading ? 'Saving...' : 'Save Contact'}
                </button>
              </div>
            )}

            {/* Contact Cards */}
            {contacts.length === 0 ? (
              <div className="text-center py-8 text-white/40">
                <p>No contacts yet. Add your first emergency contact above.</p>
              </div>
            ) : contacts.map((c, i) => (
              <div key={c.id || i} className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5 hover:border-[#00ff87]/20 transition-all duration-300 group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00ff87]/20 to-[#00e5ff]/20 flex items-center justify-center text-lg font-bold text-[#00ff87]">
                      {c.name[0]}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white/90">{c.name}</h3>
                      <p className="text-white/40 text-sm">{c.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-[#00e5ff]/10 border border-[#00e5ff]/20 text-[#00e5ff] rounded-lg text-xs">
                      {PRIORITY_OPTIONS.find(o => o.value === c.priority)?.icon} {c.priority.toUpperCase()}
                    </span>
                    <span className="text-white/30 text-xs">{c.triggers?.length || 0} triggers</span>
                    <button onClick={() => handleTest(c.id)} className="px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-lg text-xs">
                      Test
                    </button>
                    <button onClick={() => handleDeleteContact(c.id)} className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs opacity-0 group-hover:opacity-100 transition-all">
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Test Alert */}
            <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-2xl p-6 mt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-yellow-400 mb-1">🧪 Test Alert System</h3>
                  <p className="text-white/40 text-sm">Send a test alert to verify your setup works correctly.</p>
                </div>
                <button
                  onClick={() => handleTest()}
                  disabled={testing}
                  className="px-5 py-2.5 bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 rounded-xl text-sm font-medium hover:bg-yellow-500/30 transition-all disabled:opacity-50"
                >
                  {testing ? 'Sending...' : 'Send Test'}
                </button>
              </div>
              {testResult && <p className="mt-3 text-green-400 text-sm">{testResult}</p>}
            </div>
          </div>
        )}

        {/* Triggers Tab */}
        {tab === 'triggers' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold mb-4">Alert Triggers</h2>
            {TRIGGERS.map((t, i) => (
              <div key={i} className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5 flex items-center justify-between hover:border-white/[0.1] transition-all">
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{t.icon}</span>
                  <span className="font-medium text-white/80">{t.label}</span>
                </div>
                <button className={`w-12 h-6 rounded-full transition-all ${t.enabled ? 'bg-[#00ff87]' : 'bg-white/10'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-all ${t.enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* History Tab */}
        {tab === 'history' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold mb-4">Alert History</h2>
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-white/40">
                <p>No alerts yet. Alerts will appear here when triggered.</p>
              </div>
            ) : alerts.map((a) => (
              <div key={a.id} className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5 hover:border-white/[0.1] transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`px-3 py-1 rounded-lg text-xs border ${STATUS_COLORS[a.status]}`}>
                      {a.status}
                    </div>
                    <div>
                      <span className="font-medium text-white/80">{a.contact}</span>
                      <span className="text-white/30 mx-2">→</span>
                      <span className="text-white/60 text-sm">{a.trigger}</span>
                    </div>
                  </div>
                  <span className="text-white/30 text-sm">{a.time}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
