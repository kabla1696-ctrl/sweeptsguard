'use client'

import { useState } from 'react'
import Link from 'next/link'

const BOT_COMMANDS = [
  { cmd: '/scan', desc: 'Scan an address for threats', icon: '🔍' },
  { cmd: '/shield', desc: 'Enable scam shield', icon: '🛡️' },
  { cmd: '/whale', desc: 'Track whale movements', icon: '🐋' },
  { cmd: '/gas', desc: 'Check gas prices', icon: '⛽' },
  { cmd: '/alert', desc: 'Set up alerts', icon: '🔔' },
  { cmd: '/recover', desc: 'Recovery options', icon: '🔑' },
]

const INLINE_QUERIES = [
  { query: 'scan 0x1234...abcd', result: 'Safe — No threats detected', status: 'safe' },
  { query: 'whale eth', result: '3 whales moved 12,500 ETH in last hour', status: 'info' },
  { query: 'gas polygon', result: 'Current: 32 gwei | Recommended: 28 gwei', status: 'info' },
]

export default function BotScanPage() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState<string[]>([])
  const [scanning, setScanning] = useState(false)

  const handleCommand = async (cmd: string) => {
    setScanning(true)
    setOutput(prev => [...prev, `$ ${cmd}`])
    await new Promise(r => setTimeout(r, 1500))
    setOutput(prev => [...prev, `✅ Command executed: ${cmd}`, ''])
    setScanning(false)
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#050507] via-[#0a0a0f] to-[#050507] text-white">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -right-32 w-96 h-96 bg-purple-500/5 rounded-full blur-[128px] animate-pulse" />
        <div className="absolute bottom-1/4 -left-32 w-96 h-96 bg-[#00ff87]/5 rounded-full blur-[128px] animate-pulse delay-1000" />
      </div>

      <nav className="relative z-10 flex justify-between items-center px-6 py-5 max-w-7xl mx-auto border-b border-white/[0.06]">
        <Link href="/" className="flex items-center gap-3">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-[#00ff87] to-[#00e5ff] bg-clip-text text-transparent">SweepGuard</span>
        </Link>
        <div className="flex gap-6">
          <Link href="/dashboard" className="text-sm text-white/40 hover:text-white/80 transition-colors">Dashboard</Link>
          <Link href="/bot-scan" className="text-sm text-purple-400 font-semibold">Bot Scanner</Link>
        </div>
      </nav>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            Telegram Bot
          </div>
          <h1 className="text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-[#00e5ff] bg-clip-text text-transparent">Bot</span>{' '}
            <span className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Scanner</span></h1>
          <p className="text-white/40 text-lg max-w-xl mx-auto">Interact with SweepGuard directly from Telegram. Scan, protect, and monitor.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Terminal */}
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
              <span className="ml-2 text-xs text-white/30 font-mono">sweepguard-bot</span>
            </div>
            <div className="p-4 h-80 overflow-y-auto font-mono text-sm">
              {output.map((line, i) => (
                <div key={i} className={`${line.startsWith('$') ? 'text-[#00ff87]' : line.startsWith('✅') ? 'text-green-400' : 'text-white/60'} mb-1`}>
                  {line}
                </div>
              ))}
              {scanning && (
                <div className="text-yellow-400 animate-pulse">
                  <span className="inline-block w-2 h-4 bg-yellow-400 animate-blink" />
                </div>
              )}
            </div>
            <div className="border-t border-white/[0.06] p-3">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && input) { handleCommand(input); setInput('') } }}
                  placeholder="Type a command..."
                  className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/40 transition-all font-mono"
                />
                <button
                  onClick={() => { if (input) { handleCommand(input); setInput('') } }}
                  className="px-4 py-2.5 bg-gradient-to-r from-purple-500 to-violet-500 text-white rounded-xl text-sm font-medium hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all"
                >
                  Send
                </button>
              </div>
            </div>
          </div>

          {/* Commands & Inline Queries */}
          <div className="space-y-6">
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-purple-400">⌨️</span> Bot Commands
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {BOT_COMMANDS.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => handleCommand(c.cmd)}
                    className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3 text-left hover:border-purple-500/30 hover:bg-purple-500/5 transition-all group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span>{c.icon}</span>
                      <span className="text-sm font-mono text-purple-400 group-hover:text-purple-300">{c.cmd}</span>
                    </div>
                    <p className="text-xs text-white/30">{c.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-[#00e5ff]">💡</span> Inline Queries
              </h3>
              <p className="text-white/40 text-sm mb-4">Use @SweepGuardBot inline in any chat:</p>
              <div className="space-y-3">
                {INLINE_QUERIES.map((q, i) => (
                  <div key={i} className="bg-white/[0.03] border border-white/[0.04] rounded-xl p-3">
                    <div className="font-mono text-sm text-purple-400 mb-1">@SweepGuardBot {q.query}</div>
                    <div className="text-xs text-white/50">{q.result}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Config */}
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-[#00ff87]">⚙️</span> Configuration
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Auto-scan addresses', enabled: true },
                  { label: 'Whale alerts', enabled: true },
                  { label: 'Gas notifications', enabled: false },
                  { label: 'Daily summary', enabled: true },
                ].map((c, i) => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <span className="text-sm text-white/60">{c.label}</span>
                    <button className={`w-10 h-5 rounded-full transition-all ${c.enabled ? 'bg-[#00ff87]' : 'bg-white/10'}`}>
                      <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-all ${c.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
