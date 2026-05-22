'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

type StepStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped'
type PanicPhase = 'idle' | 'confirming' | 'executing' | 'complete'

interface EmergencyStep {
  id: string
  label: string
  description: string
  icon: string
  status: StepStatus
  txHash?: string
  error?: string
  chainName?: string
}

const MOCK_STEPS: EmergencyStep[] = [
  { id: 'revoke-eth', label: 'Revoke ETH Approvals', description: 'Revoking all ERC-20 approvals on Ethereum', icon: '🔓', status: 'pending', chainName: 'Ethereum' },
  { id: 'revoke-base', label: 'Revoke Base Approvals', description: 'Revoking all approvals on Base', icon: '🔓', status: 'pending', chainName: 'Base' },
  { id: 'revoke-arb', label: 'Revoke Arbitrum Approvals', description: 'Revoking all approvals on Arbitrum', icon: '🔓', status: 'pending', chainName: 'Arbitrum' },
  { id: 'sweep-eth', label: 'Sweep ETH Funds', description: 'Transferring ETH & tokens to cold wallet', icon: '💸', status: 'pending', chainName: 'Ethereum' },
  { id: 'sweep-base', label: 'Sweep Base Funds', description: 'Transferring Base assets to cold wallet', icon: '💸', status: 'pending', chainName: 'Base' },
  { id: 'sweep-arb', label: 'Sweep Arbitrum Funds', description: 'Transferring Arbitrum assets to cold wallet', icon: '💸', status: 'pending', chainName: 'Arbitrum' },
  { id: 'notify', label: 'Alert Emergency Contacts', description: 'Sending SMS & call alerts to all contacts', icon: '🚨', status: 'pending' },
  { id: 'freeze', label: 'Request Exchange Freeze', description: 'Requesting CEX freeze on associated addresses', icon: '🧊', status: 'pending' },
]

export default function PanicButtonPage() {
  const [phase, setPhase] = useState<PanicPhase>('idle')
  const [steps, setSteps] = useState<EmergencyStep[]>(MOCK_STEPS)
  const [confirmText, setConfirmText] = useState('')
  const [holdProgress, setHoldProgress] = useState(0)
  const [isHolding, setIsHolding] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [pulseIntensity, setPulseIntensity] = useState(0)

  // Ambient pulse animation
  useEffect(() => {
    const interval = setInterval(() => {
      setPulseIntensity(prev => (prev + 1) % 360)
    }, 50)
    return () => clearInterval(interval)
  }, [])

  // Hold-to-activate
  useEffect(() => {
    if (!isHolding) return
    const interval = setInterval(() => {
      setHoldProgress(prev => {
        if (prev >= 100) {
          setPhase('confirming')
          setIsHolding(false)
          return 0
        }
        return prev + 2
      })
    }, 30)
    return () => clearInterval(interval)
  }, [isHolding])

  // Execute emergency steps
  const executePanic = useCallback(async () => {
    if (confirmText !== 'CONFIRM PANIC') return
    setPhase('executing')
    setElapsed(0)

    const timer = setInterval(() => setElapsed(prev => prev + 100), 100)

    for (let i = 0; i < steps.length; i++) {
      setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'running' } : s))
      await new Promise(r => setTimeout(r, 800 + Math.random() * 1200))
      const success = Math.random() > 0.1
      setSteps(prev => prev.map((s, idx) => idx === i ? {
        ...s,
        status: success ? 'success' : 'failed',
        txHash: success ? `0x${Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')}` : undefined,
        error: success ? undefined : 'Transaction reverted: insufficient gas',
      } : s))
    }

    clearInterval(timer)
    setPhase('complete')
  }, [confirmText, steps])

  const successCount = steps.filter(s => s.status === 'success').length
  const failedCount = steps.filter(s => s.status === 'failed').length
  const runningStep = steps.find(s => s.status === 'running')

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#050507] via-[#0a0a0f] to-[#050507] text-white overflow-hidden">
      {/* Animated background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-[128px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-600/5 rounded-full blur-[128px] animate-pulse" style={{ animationDelay: '1s' }} />
        {phase === 'executing' && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500/10 rounded-full blur-[200px] animate-ping" />
        )}
      </div>

      {/* Nav */}
      <nav className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05] relative z-10">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-[#00ff87] to-[#00e5ff] bg-clip-text text-transparent">SweepGuard</span>
        </Link>
        <div className="flex gap-4">
          <Link href="/scan" className="text-sm text-white/50 hover:text-green-400 transition-colors">Scan</Link>
          <Link href="/dashboard" className="text-sm text-white/50 hover:text-green-400 transition-colors">Dashboard</Link>
          <Link href="/panic" className="text-sm text-[#ff3b3b] font-medium">Panic Button</Link>
        </div>
      </nav>

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-12 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#ff3b3b]/10 border border-[#ff3b3b]/20 text-[#ff3b3b] text-xs font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-[#ff3b3b] animate-pulse" />
            EMERGENCY RESPONSE SYSTEM
          </div>
          <h1 className="text-5xl font-black mb-3 bg-gradient-to-r from-[#ff3b3b] via-[#ff6b6b] to-[#ff3b3b] bg-clip-text text-transparent">
            🚨 Panic Button
          </h1>
          <p className="text-white/40 text-lg max-w-lg mx-auto">
            One-click emergency: revoke all approvals, sweep funds to cold wallet, and alert your emergency contacts
          </p>
        </div>

        {/* Idle State — The Button */}
        {phase === 'idle' && (
          <div className="flex flex-col items-center">
            {/* MASSIVE glowing button */}
            <div className="relative mb-8">
              {/* Glow rings */}
              <div className="absolute inset-0 rounded-full bg-[#ff3b3b]/20 blur-[60px] animate-pulse" />
              <div className="absolute inset-[-20px] rounded-full border-2 border-[#ff3b3b]/10 animate-ping" />
              <div className="absolute inset-[-40px] rounded-full border border-[#ff3b3b]/5 animate-ping" style={{ animationDelay: '0.5s' }} />

              {/* Button */}
              <button
                onMouseDown={() => { setIsHolding(true); setHoldProgress(0) }}
                onMouseUp={() => setIsHolding(false)}
                onMouseLeave={() => setIsHolding(false)}
                onTouchStart={() => { setIsHolding(true); setHoldProgress(0) }}
                onTouchEnd={() => setIsHolding(false)}
                className="relative w-64 h-64 rounded-full cursor-pointer select-none transition-all duration-200"
                style={{
                  background: `radial-gradient(circle at 30% 30%, #ff5555, #ff3b3b 40%, #cc0000 100%)`,
                  boxShadow: `0 0 ${30 + holdProgress * 0.5}px rgba(255, 59, 59, ${0.3 + holdProgress * 0.005}), inset 0 -6px 12px rgba(0,0,0,0.3), inset 0 6px 12px rgba(255,255,255,0.1)`,
                  transform: `scale(${1 - holdProgress * 0.002})`,
                }}
              >
                <div className="absolute inset-0 rounded-full flex flex-col items-center justify-center">
                  <span className="text-6xl mb-2">☠️</span>
                  <span className="text-2xl font-black tracking-wider text-white drop-shadow-lg">PANIC</span>
                  <span className="text-xs text-white/60 mt-1">Hold to activate</span>
                </div>

                {/* Progress ring */}
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 256 256">
                  <circle cx="128" cy="128" r="120" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                  <circle
                    cx="128" cy="128" r="120" fill="none" stroke="white" strokeWidth="4"
                    strokeDasharray={`${holdProgress * 7.54} 754`}
                    strokeLinecap="round"
                    className="transition-all duration-100"
                  />
                </svg>
              </button>
            </div>

            <p className="text-white/30 text-sm text-center max-w-md">
              Press and hold the panic button for 3 seconds to initiate emergency response.
              This will revoke all token approvals and sweep funds to your cold wallet.
            </p>

            {/* Safety info */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
              {[
                { icon: '🔓', title: 'Revoke All', desc: 'Cancel every token approval across all chains' },
                { icon: '💸', title: 'Sweep Funds', desc: 'Transfer all assets to your cold wallet' },
                { icon: '🚨', title: 'Alert Contacts', desc: 'SMS + call all emergency contacts instantly' },
              ].map(item => (
                <div key={item.title} className="p-5 bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl text-center hover:border-[#ff3b3b]/20 transition-all duration-300">
                  <span className="text-3xl block mb-3">{item.icon}</span>
                  <h3 className="font-bold text-sm mb-1">{item.title}</h3>
                  <p className="text-white/30 text-xs">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Confirmation Phase */}
        {phase === 'confirming' && (
          <div className="max-w-lg mx-auto">
            <div className="p-8 bg-[#ff3b3b]/5 backdrop-blur-xl border border-[#ff3b3b]/20 rounded-3xl">
              <div className="text-center mb-6">
                <span className="text-5xl block mb-4">⚠️</span>
                <h2 className="text-2xl font-black text-[#ff3b3b]">Confirm Emergency Action</h2>
                <p className="text-white/40 text-sm mt-2">This action cannot be undone. Type <strong className="text-white">CONFIRM PANIC</strong> to proceed.</p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-black/30 rounded-xl border border-white/[0.06]">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div><span className="text-white/30">Compromised:</span><p className="text-white font-mono">0x1234...5678</p></div>
                    <div><span className="text-white/30">Cold Wallet:</span><p className="text-[#00ff87] font-mono">0xABCD...EF01</p></div>
                    <div><span className="text-white/30">Chains:</span><p className="text-white">ETH, Base, Arbitrum</p></div>
                    <div><span className="text-white/30">Priority:</span><p className="text-yellow-400">⚡ 3x Gas Priority</p></div>
                  </div>
                </div>

                <input
                  type="text"
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  placeholder="Type CONFIRM PANIC"
                  className="w-full px-4 py-3 bg-black/40 border border-[#ff3b3b]/30 rounded-xl text-white text-center font-bold placeholder:text-white/20 focus:outline-none focus:border-[#ff3b3b]/60 tracking-wider"
                  autoFocus
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => { setPhase('idle'); setConfirmText(''); setSteps(MOCK_STEPS) }}
                    className="flex-1 px-4 py-3 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white/60 hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={executePanic}
                    disabled={confirmText !== 'CONFIRM PANIC'}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-[#ff3b3b] to-[#cc0000] rounded-xl text-sm font-bold disabled:opacity-30 hover:shadow-[0_0_30px_rgba(255,59,59,0.3)] transition-all"
                  >
                    🚨 EXECUTE PANIC
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Execution Phase */}
        {phase === 'executing' && (
          <div className="space-y-6">
            {/* Live timer */}
            <div className="text-center">
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-[#ff3b3b]/10 border border-[#ff3b3b]/20 rounded-2xl">
                <span className="w-3 h-3 rounded-full bg-[#ff3b3b] animate-pulse" />
                <span className="text-[#ff3b3b] font-mono text-2xl font-bold">{(elapsed / 1000).toFixed(1)}s</span>
                <span className="text-white/30 text-sm">elapsed</span>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-3">
              {steps.map((step, i) => (
                <div
                  key={step.id}
                  className={`p-4 rounded-2xl border backdrop-blur-xl transition-all duration-500 ${
                    step.status === 'running' ? 'bg-[#ff3b3b]/10 border-[#ff3b3b]/30 shadow-[0_0_20px_rgba(255,59,59,0.1)]' :
                    step.status === 'success' ? 'bg-[#00ff87]/5 border-[#00ff87]/20' :
                    step.status === 'failed' ? 'bg-[#ff3b3b]/5 border-[#ff3b3b]/20' :
                    'bg-white/[0.02] border-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                      step.status === 'running' ? 'bg-[#ff3b3b]/20 animate-pulse' :
                      step.status === 'success' ? 'bg-[#00ff87]/20' :
                      step.status === 'failed' ? 'bg-[#ff3b3b]/20' :
                      'bg-white/[0.05]'
                    }`}>
                      {step.status === 'running' ? (
                        <svg className="animate-spin h-5 w-5 text-[#ff3b3b]" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : step.status === 'success' ? '✅' : step.status === 'failed' ? '❌' : step.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm">{step.label}</h4>
                        {step.chainName && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] text-white/30">{step.chainName}</span>}
                      </div>
                      <p className="text-white/30 text-xs mt-0.5">{step.description}</p>
                      {step.txHash && <p className="text-[#00ff87]/60 text-[10px] font-mono mt-1">{step.txHash.slice(0, 20)}...</p>}
                      {step.error && <p className="text-[#ff3b3b]/80 text-xs mt-1">{step.error}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Complete Phase */}
        {phase === 'complete' && (
          <div className="text-center">
            <div className="p-8 bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-3xl max-w-lg mx-auto">
              <span className="text-6xl block mb-4">{failedCount === 0 ? '✅' : '⚠️'}</span>
              <h2 className="text-2xl font-bold mb-2">
                {failedCount === 0 ? 'Emergency Response Complete' : 'Partial Success'}
              </h2>
              <p className="text-white/40 text-sm mb-6">
                {successCount}/{steps.length} steps completed in {(elapsed / 1000).toFixed(1)}s
              </p>

              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="p-3 bg-[#00ff87]/5 border border-[#00ff87]/10 rounded-xl">
                  <p className="text-2xl font-bold text-[#00ff87]">{successCount}</p>
                  <p className="text-white/30 text-xs">Success</p>
                </div>
                <div className="p-3 bg-[#ff3b3b]/5 border border-[#ff3b3b]/10 rounded-xl">
                  <p className="text-2xl font-bold text-[#ff3b3b]">{failedCount}</p>
                  <p className="text-white/30 text-xs">Failed</p>
                </div>
                <div className="p-3 bg-[#00e5ff]/5 border border-[#00e5ff]/10 rounded-xl">
                  <p className="text-2xl font-bold text-[#00e5ff]">{(elapsed / 1000).toFixed(1)}s</p>
                  <p className="text-white/30 text-xs">Duration</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setPhase('idle'); setSteps(MOCK_STEPS); setHoldProgress(0) }}
                  className="flex-1 px-4 py-3 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white/60 hover:text-white transition-all"
                >
                  Reset
                </button>
                <Link href="/dashboard" className="flex-1 px-4 py-3 bg-gradient-to-r from-[#00ff87] to-[#00e5ff] rounded-xl text-sm font-bold text-black hover:shadow-[0_0_30px_rgba(0,255,135,0.2)] transition-all text-center">
                  View Dashboard
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
