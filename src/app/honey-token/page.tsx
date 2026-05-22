'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'

type TrapStatus = 'inactive' | 'armed' | 'triggered' | 'expired'
type WizardStep = 'config' | 'deploy' | 'complete'

interface HoneyTrap {
  id: string
  contractAddress: string
  chainName: string
  tokenName: string
  tokenSymbol: string
  amount: string
  label: string
  status: TrapStatus
  deployedAt: string
  triggeredAt?: string
  drainerAddress?: string
}

interface TrapAlert {
  id: string
  trapId: string
  drainerAddress: string
  chainName: string
  amount: string
  timestamp: string
  method: string
}

const STATUS_STYLES: Record<TrapStatus, { bg: string; text: string; border: string; icon: string }> = {
  inactive: { bg: 'bg-white/5', text: 'text-white/30', border: 'border-white/10', icon: '⚪' },
  armed: { bg: 'bg-[#00ff87]/10', text: 'text-[#00ff87]', border: 'border-[#00ff87]/20', icon: '🟢' },
  triggered: { bg: 'bg-[#ff3b3b]/10', text: 'text-[#ff3b3b]', border: 'border-[#ff3b3b]/20', icon: '🔴' },
  expired: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20', icon: '🟡' },
}

const MOCK_TRAPS: HoneyTrap[] = [
  { id: 't1', contractAddress: '0xabc...111', chainName: 'Ethereum', tokenName: 'Free ETH Airdrop', tokenSymbol: 'FETH', amount: '10,000', label: 'Lure #1', status: 'armed', deployedAt: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: 't2', contractAddress: '0xdef...222', chainName: 'Base', tokenName: 'Base Rewards', tokenSymbol: 'BREW', amount: '50,000', label: 'Lure #2', status: 'triggered', deployedAt: new Date(Date.now() - 86400000 * 5).toISOString(), triggeredAt: new Date(Date.now() - 3600000).toISOString(), drainerAddress: '0xdrainer...abc' },
  { id: 't3', contractAddress: '0xghi...333', chainName: 'Arbitrum', tokenName: 'Arb Giveaway', tokenSymbol: 'AGIVE', amount: '5,000', label: 'Lure #3', status: 'armed', deployedAt: new Date(Date.now() - 86400000).toISOString() },
]

const MOCK_ALERTS: TrapAlert[] = [
  { id: 'a1', trapId: 't2', drainerAddress: '0xdrainer...abc', chainName: 'Base', amount: '50,000 BREW', timestamp: new Date(Date.now() - 3600000).toISOString(), method: 'sweep' },
  { id: 'a2', trapId: 't1', drainerAddress: '0xphish...xyz', chainName: 'Ethereum', amount: '2,500 FETH', timestamp: new Date(Date.now() - 7200000).toISOString(), method: 'approval' },
]

export default function HoneyTokenPage() {
  const [traps, setTraps] = useState<HoneyTrap[]>(MOCK_TRAPS)
  const [alerts] = useState<TrapAlert[]>(MOCK_ALERTS)
  const [wizardStep, setWizardStep] = useState<WizardStep>('config')
  const [showWizard, setShowWizard] = useState(false)
  const [newTrap, setNewTrap] = useState({ tokenName: '', tokenSymbol: '', amount: '', chain: '1', label: '' })

  const handleDeploy = useCallback(async () => {
    setWizardStep('deploy')
    await new Promise(r => setTimeout(r, 2000))
    const trap: HoneyTrap = {
      id: `t-${Date.now()}`,
      contractAddress: `0x${Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      chainName: newTrap.chain === '1' ? 'Ethereum' : newTrap.chain === '8453' ? 'Base' : 'Arbitrum',
      tokenName: newTrap.tokenName,
      tokenSymbol: newTrap.tokenSymbol,
      amount: newTrap.amount,
      label: newTrap.label,
      status: 'armed',
      deployedAt: new Date().toISOString(),
    }
    setTraps(prev => [...prev, trap])
    setWizardStep('complete')
  }, [newTrap])

  const armedCount = traps.filter(t => t.status === 'armed').length
  const triggeredCount = traps.filter(t => t.status === 'triggered').length

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#050507] via-[#0a0a0f] to-[#050507] text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-[#ffd700]/3 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-[#ff3b3b]/3 rounded-full blur-[150px]" />
      </div>

      <nav className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05] relative z-10">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-[#00ff87] to-[#00e5ff] bg-clip-text text-transparent">SweepGuard</span>
        </Link>
        <div className="flex gap-4">
          <Link href="/dashboard" className="text-sm text-white/50 hover:text-green-400 transition-colors">Dashboard</Link>
          <Link href="/honey-token" className="text-sm text-[#ffd700] font-medium">Honey Token</Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12 relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ffd700]/10 border border-[#ffd700]/20 text-[#ffd700] text-xs font-medium mb-4">
              🍯 TRAP SYSTEM
            </div>
            <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-[#ffd700] via-[#ff8c00] to-[#ffd700] bg-clip-text text-transparent">🍯 Honey Token</h1>
            <p className="text-white/40">Deploy trap tokens to detect and trace drainer activity</p>
          </div>
          <button onClick={() => { setShowWizard(true); setWizardStep('config') }} className="px-5 py-2.5 bg-gradient-to-r from-[#ffd700] to-[#ff8c00] rounded-xl text-sm font-bold text-black hover:shadow-[0_0_30px_rgba(255,215,0,0.2)] transition-all">
            + Deploy Trap
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Active Traps', value: armedCount, icon: '🎯', color: '#00ff87' },
            { label: 'Triggered', value: triggeredCount, icon: '🚨', color: '#ff3b3b' },
            { label: 'Total Alerts', value: alerts.length, icon: '🔔', color: '#ffd700' },
            { label: 'Drainers Caught', value: triggeredCount, icon: '🕷️', color: '#00e5ff' },
          ].map(s => (
            <div key={s.label} className="p-5 bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl hover:border-white/[0.12] transition-all">
              <span className="text-2xl">{s.icon}</span>
              <p className="text-2xl font-black mt-2" style={{ color: s.color }}>{s.value}</p>
              <p className="text-white/30 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Wizard Modal */}
        {showWizard && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowWizard(false)}>
            <div className="w-full max-w-lg p-6 bg-[#0a0a0f] border border-white/[0.1] rounded-3xl" onClick={e => e.stopPropagation()}>
              {wizardStep === 'config' && (
                <>
                  <h2 className="text-xl font-bold mb-2">🍯 Deploy Honey Token</h2>
                  <p className="text-white/30 text-sm mb-6">Configure your trap token to lure drainers</p>
                  <div className="space-y-3 mb-4">
                    <div>
                      <label className="text-white/40 text-xs mb-1 block">Token Name *</label>
                      <input value={newTrap.tokenName} onChange={e => setNewTrap(p => ({ ...p, tokenName: e.target.value }))} placeholder="Free ETH Airdrop" className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#ffd700]/40" />
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-white/40 text-xs mb-1 block">Symbol *</label>
                        <input value={newTrap.tokenSymbol} onChange={e => setNewTrap(p => ({ ...p, tokenSymbol: e.target.value }))} placeholder="FETH" className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#ffd700]/40" />
                      </div>
                      <div className="flex-1">
                        <label className="text-white/40 text-xs mb-1 block">Amount *</label>
                        <input value={newTrap.amount} onChange={e => setNewTrap(p => ({ ...p, amount: e.target.value }))} placeholder="10000" className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#ffd700]/40" />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-white/40 text-xs mb-1 block">Chain</label>
                        <select value={newTrap.chain} onChange={e => setNewTrap(p => ({ ...p, chain: e.target.value }))} className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white text-sm focus:outline-none focus:border-[#ffd700]/40">
                          <option value="1">⟠ Ethereum</option>
                          <option value="8453">🔵 Base</option>
                          <option value="42161">🔷 Arbitrum</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="text-white/40 text-xs mb-1 block">Label</label>
                        <input value={newTrap.label} onChange={e => setNewTrap(p => ({ ...p, label: e.target.value }))} placeholder="Lure #1" className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#ffd700]/40" />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setShowWizard(false)} className="flex-1 px-4 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white/50">Cancel</button>
                    <button onClick={() => setWizardStep('deploy')} disabled={!newTrap.tokenName || !newTrap.tokenSymbol} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#ffd700] to-[#ff8c00] rounded-xl text-sm font-bold text-black disabled:opacity-30">Next: Deploy</button>
                  </div>
                </>
              )}
              {wizardStep === 'deploy' && (
                <div className="text-center py-8">
                  <svg className="animate-spin h-16 w-16 text-[#ffd700] mx-auto mb-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <p className="text-white/60 font-medium">Deploying honey token...</p>
                  <p className="text-white/30 text-xs mt-1">Deploying contract and seeding balance</p>
                  <button onClick={handleDeploy} className="mt-6 px-6 py-2 bg-gradient-to-r from-[#ffd700] to-[#ff8c00] rounded-xl text-sm font-bold text-black">
                    Simulate Deploy
                  </button>
                </div>
              )}
              {wizardStep === 'complete' && (
                <div className="text-center py-8">
                  <span className="text-5xl block mb-4">✅</span>
                  <h3 className="text-xl font-bold mb-2">Trap Deployed!</h3>
                  <p className="text-white/30 text-sm mb-6">Your honey token is now armed and monitoring</p>
                  <button onClick={() => setShowWizard(false)} className="px-6 py-2.5 bg-gradient-to-r from-[#ffd700] to-[#ff8c00] rounded-xl text-sm font-bold text-black">Done</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Active Traps */}
        <div className="mb-10">
          <h2 className="text-lg font-bold mb-4">🎯 Active Traps</h2>
          <div className="space-y-3">
            {traps.map(trap => {
              const style = STATUS_STYLES[trap.status]
              return (
                <div key={trap.id} className={`p-5 bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl hover:border-white/[0.12] transition-all`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${style.bg} border ${style.border}`}>
                        {trap.status === 'armed' ? '🍯' : trap.status === 'triggered' ? '🚨' : '⏱️'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold">{trap.label}</h4>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${style.bg} ${style.text} border ${style.border} capitalize`}>{trap.status}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] bg-white/[0.05] text-white/30">{trap.chainName}</span>
                        </div>
                        <p className="text-white/30 text-xs mt-0.5">{trap.tokenName} ({trap.tokenSymbol}) — {trap.amount} tokens</p>
                        <p className="text-white/20 text-[10px] font-mono mt-0.5">{trap.contractAddress}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white/20 text-[10px]">Deployed {new Date(trap.deployedAt).toLocaleDateString()}</p>
                      {trap.triggeredAt && <p className="text-[#ff3b3b]/60 text-[10px]">Triggered {new Date(trap.triggeredAt).toLocaleString()}</p>}
                      {trap.drainerAddress && <p className="text-[#ff3b3b]/40 text-[10px] font-mono">Drainer: {trap.drainerAddress}</p>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Alert Feed */}
        <div>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">🔔 Alert Feed {alerts.length > 0 && <span className="px-2 py-0.5 rounded-full bg-[#ff3b3b]/20 text-[#ff3b3b] text-xs">{alerts.length}</span>}</h2>
          {alerts.length === 0 ? (
            <div className="p-8 bg-white/[0.02] border border-white/[0.06] rounded-2xl text-center">
              <span className="text-4xl block mb-3">🔔</span>
              <p className="text-white/30 text-sm">No alerts yet — waiting for drainers to take the bait</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map(alert => (
                <div key={alert.id} className="p-4 bg-[#ff3b3b]/5 backdrop-blur-xl border border-[#ff3b3b]/15 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🚨</span>
                      <div>
                        <p className="text-sm font-medium text-[#ff3b3b]">Drainer detected on {alert.chainName}!</p>
                        <p className="text-white/30 text-xs mt-0.5">Method: {alert.method} • Amount: {alert.amount}</p>
                        <p className="text-white/20 text-[10px] font-mono mt-0.5">Drainer: {alert.drainerAddress}</p>
                      </div>
                    </div>
                    <span className="text-white/20 text-[10px]">{new Date(alert.timestamp).toLocaleString()}</span>
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
