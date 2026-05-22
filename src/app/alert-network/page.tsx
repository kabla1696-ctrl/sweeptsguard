'use client'

import { useState } from 'react'

interface Alert {
  id: string
  reporter: string
  reporterRep: number
  type: 'drainer' | 'phishing' | 'scam' | 'rugpull'
  target: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  votes: { up: number; down: number }
  timestamp: string
  verified: boolean
  chain: string
}

const DEMO_ALERTS: Alert[] = [
  { id: '1', reporter: '0xs3c...urity', reporterRep: 950, type: 'drainer', target: '0xDEAD...BEEF', description: 'Known drainer contract — steals NFTs via setApprovalForAll', severity: 'critical', votes: { up: 247, down: 3 }, timestamp: '10m ago', verified: true, chain: 'Ethereum' },
  { id: '2', reporter: '0xwat...chdog', reporterRep: 820, type: 'phishing', target: 'fake-uniswap[.]com', description: 'Phishing site mimicking Uniswap — steals seed phrases', severity: 'critical', votes: { up: 189, down: 5 }, timestamp: '25m ago', verified: true, chain: 'Multi' },
  { id: '3', reporter: '0xpro...tect', reporterRep: 650, type: 'scam', target: '0xSCAM...1234', description: 'Fake airdrop contract — requires approval then drains', severity: 'high', votes: { up: 92, down: 12 }, timestamp: '1h ago', verified: false, chain: 'BSC' },
  { id: '4', reporter: '0xbou...nty', reporterRep: 430, type: 'rugpull', target: 'SAFEMOON2', description: 'Honeypot token — can sell only by dev wallet', severity: 'high', votes: { up: 67, down: 8 }, timestamp: '2h ago', verified: false, chain: 'Ethereum' },
]

export default function AlertNetworkPage() {
  const [alerts, setAlerts] = useState<Alert[]>(DEMO_ALERTS)
  const [filter, setFilter] = useState<string>('all')
  const [newAlert, setNewAlert] = useState({ type: 'drainer' as 'drainer' | 'phishing' | 'scam' | 'rugpull', target: '', description: '', severity: 'high' as 'low' | 'medium' | 'high' | 'critical' })
  const [showSubmit, setShowSubmit] = useState(false)
  const [userVotes, setUserVotes] = useState<Record<string, 'up' | 'down'>>({})

  const filteredAlerts = alerts.filter(a => filter === 'all' || a.type === filter)

  const vote = (id: string, dir: 'up' | 'down') => {
    if (userVotes[id]) return
    setUserVotes({ ...userVotes, [id]: dir })
    setAlerts(alerts.map(a => a.id === id ? { ...a, votes: { ...a.votes, [dir]: a.votes[dir] + 1 } } : a))
  }

  const submitAlert = () => {
    if (!newAlert.target || !newAlert.description) return
    const alert: Alert = {
      id: String(alerts.length + 1),
      reporter: '0xYou...rAdd',
      reporterRep: 500,
      ...newAlert,
      votes: { up: 1, down: 0 },
      timestamp: 'just now',
      verified: false,
      chain: 'Ethereum'
    }
    setAlerts([alert, ...alerts])
    setNewAlert({ type: 'drainer', target: '', description: '', severity: 'high' })
    setShowSubmit(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-950 to-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">🌐 Decentralized Alert Network</h1>
            <p className="text-gray-400">Community-powered threat intelligence. Warn others, save funds.</p>
          </div>
          <button onClick={() => setShowSubmit(!showSubmit)} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium">
            🚨 Report Threat
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Alerts', value: alerts.length, icon: '🔔' },
            { label: 'Verified', value: alerts.filter(a => a.verified).length, icon: '✅' },
            { label: 'Community Reports', value: '2,847', icon: '👥' },
            { label: 'Funds Saved', value: '$12.4M', icon: '💰' },
          ].map((s, i) => (
            <div key={i} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-xl font-bold text-white">{s.value}</div>
              <div className="text-xs text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Submit Alert Form */}
        {showSubmit && (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-red-500 rounded-xl p-6 mb-8">
            <h3 className="text-white font-semibold mb-4">🚨 Report New Threat</h3>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <select value={newAlert.type} onChange={e => setNewAlert({ ...newAlert, type: e.target.value as 'drainer' | 'phishing' | 'scam' | 'rugpull' })} className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white">
                <option value="drainer">Drainer Contract</option>
                <option value="phishing">Phishing Site</option>
                <option value="scam">Scam Token</option>
                <option value="rugpull">Rugpull</option>
              </select>
              <select value={newAlert.severity} onChange={e => setNewAlert({ ...newAlert, severity: e.target.value as 'low' | 'medium' | 'high' | 'critical' })} className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white">
                <option value="low">Low Severity</option>
                <option value="medium">Medium Severity</option>
                <option value="high">High Severity</option>
                <option value="critical">Critical Severity</option>
              </select>
            </div>
            <input value={newAlert.target} onChange={e => setNewAlert({ ...newAlert, target: e.target.value })} placeholder="Target address or URL" className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 mb-3" />
            <textarea value={newAlert.description} onChange={e => setNewAlert({ ...newAlert, description: e.target.value })} placeholder="Describe the threat..." className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 h-20 resize-none mb-3" />
            <button onClick={submitAlert} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium">Submit Alert</button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          {['all', 'drainer', 'phishing', 'scam', 'rugpull'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === f ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
              {f === 'all' ? '🔔 All' : f === 'drainer' ? '💀 Drainer' : f === 'phishing' ? '🎣 Phishing' : f === 'scam' ? '⚠️ Scam' : '🏃 Rugpull'}
            </button>
          ))}
        </div>

        {/* Alerts Feed */}
        <div className="space-y-4">
          {filteredAlerts.map(a => (
            <div key={a.id} className={`bg-gray-800/50 backdrop-blur-sm border rounded-xl p-5 ${a.verified ? 'border-green-500/30' : a.severity === 'critical' ? 'border-red-500/30' : 'border-gray-700'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{a.type === 'drainer' ? '💀' : a.type === 'phishing' ? '🎣' : a.type === 'scam' ? '⚠️' : '🏃'}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold">{a.type.toUpperCase()}</span>
                      {a.verified && <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-xs">✓ Verified</span>}
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${a.severity === 'critical' ? 'bg-red-500/20 text-red-400' : a.severity === 'high' ? 'bg-orange-500/20 text-orange-400' : a.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'}`}>
                        {a.severity}
                      </span>
                    </div>
                    <div className="text-gray-400 text-sm">by <span className="text-purple-400">{a.reporter}</span> (rep: {a.reporterRep}) • {a.timestamp}</div>
                  </div>
                </div>
                <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs">{a.chain}</span>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3 mb-3">
                <div className="text-gray-400 text-xs mb-1">Target:</div>
                <div className="text-red-400 font-mono text-sm">{a.target}</div>
              </div>
              <p className="text-gray-300 text-sm mb-3">{a.description}</p>
              <div className="flex items-center gap-4">
                <button onClick={() => vote(a.id, 'up')} className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm ${userVotes[a.id] === 'up' ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                  👍 {a.votes.up}
                </button>
                <button onClick={() => vote(a.id, 'down')} className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm ${userVotes[a.id] === 'down' ? 'bg-red-500/20 text-red-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                  👎 {a.votes.down}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
