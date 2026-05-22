'use client'

import { useState } from 'react'
import Link from 'next/link'

type AlertLevel = 'info' | 'warning' | 'critical'
type WhaleCategory = 'fund' | 'exchange' | 'defi' | 'individual' | 'unknown'
type TxType = 'buy' | 'sell' | 'transfer' | 'approve'

interface WhaleTransaction {
  hash: string
  chainName: string
  fromLabel: string
  toLabel: string
  tokenSymbol: string
  amountFormatted: string
  usdValue: number
  timestamp: string
  type: TxType
  suspicious: boolean
  suspiciousReasons: string[]
}

const LEVEL_STYLES: Record<AlertLevel, { bg: string; text: string; border: string; icon: string }> = {
  info: { bg: 'bg-[#00e5ff]/10', text: 'text-[#00e5ff]', border: 'border-[#00e5ff]/20', icon: 'ℹ️' },
  warning: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20', icon: '⚠️' },
  critical: { bg: 'bg-[#ff3b3b]/10', text: 'text-[#ff3b3b]', border: 'border-[#ff3b3b]/20', icon: '🚨' },
}
const TX_TYPE_STYLES: Record<TxType, { color: string; icon: string }> = {
  buy: { color: 'text-[#00ff87]', icon: '📈' },
  sell: { color: 'text-[#ff3b3b]', icon: '📉' },
  transfer: { color: 'text-[#00e5ff]', icon: '↔️' },
  approve: { color: 'text-yellow-400', icon: '🔓' },
}

const MOCK_TXS: WhaleTransaction[] = [
  { hash: '0xabc...111', chainName: 'Ethereum', fromLabel: 'Binance Hot Wallet', toLabel: 'Unknown Wallet', tokenSymbol: 'ETH', amountFormatted: '15,000 ETH', usdValue: 45_000_000, timestamp: new Date(Date.now() - 600000).toISOString(), type: 'transfer', suspicious: true, suspiciousReasons: ['Large transfer to new wallet', 'No prior activity'] },
  { hash: '0xdef...222', chainName: 'Base', fromLabel: 'Whale Fund Alpha', toLabel: 'Uniswap V3', tokenSymbol: 'USDC', amountFormatted: '25,000,000 USDC', usdValue: 25_000_000, timestamp: new Date(Date.now() - 1800000).toISOString(), type: 'sell', suspicious: false, suspiciousReasons: [] },
  { hash: '0xghi...333', chainName: 'Ethereum', fromLabel: 'Jump Trading', toLabel: 'Unknown DEX', tokenSymbol: 'PEPE', amountFormatted: '500B PEPE', usdValue: 8_500_000, timestamp: new Date(Date.now() - 3600000).toISOString(), type: 'buy', suspicious: true, suspiciousReasons: ['Buying suspicious memecoin', 'Known pump pattern'] },
  { hash: '0xjkl...444', chainName: 'Arbitrum', fromLabel: 'Wintermute', toLabel: 'Aave V3', tokenSymbol: 'ARB', amountFormatted: '5,000,000 ARB', usdValue: 5_200_000, timestamp: new Date(Date.now() - 7200000).toISOString(), type: 'transfer', suspicious: false, suspiciousReasons: [] },
  { hash: '0xmn...555', chainName: 'Ethereum', fromLabel: 'Alameda Wallet', toLabel: 'Tornado Cash', tokenSymbol: 'ETH', amountFormatted: '3,200 ETH', usdValue: 9_600_000, timestamp: new Date(Date.now() - 10800000).toISOString(), type: 'transfer', suspicious: true, suspiciousReasons: ['Transfer to Tornado Cash', 'Sanctioned entity wallet'] },
]

export default function WhaleAlertsPage() {
  const [txs] = useState<WhaleTransaction[]>(MOCK_TXS)
  const [filterType, setFilterType] = useState<TxType | 'all' | 'suspicious'>('all')
  const [minValue, setMinValue] = useState(1_000_000)

  const filtered = txs.filter(tx => {
    if (filterType === 'suspicious') return tx.suspicious
    if (filterType !== 'all' && tx.type !== filterType) return false
    return tx.usdValue >= minValue
  })

  const totalVolume = txs.reduce((s, tx) => s + tx.usdValue, 0)
  const suspiciousCount = txs.filter(tx => tx.suspicious).length

  const formatUSD = (v: number) => {
    if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
    return `$${v.toLocaleString()}`
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#050507] via-[#0a0a0f] to-[#050507] text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 right-1/3 w-[500px] h-[500px] bg-[#00e5ff]/3 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-[#a855f7]/3 rounded-full blur-[150px]" />
      </div>

      <nav className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05] relative z-10">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-[#00ff87] to-[#00e5ff] bg-clip-text text-transparent">SweepGuard</span>
        </Link>
        <div className="flex gap-4">
          <Link href="/dashboard" className="text-sm text-white/50 hover:text-green-400 transition-colors">Dashboard</Link>
          <Link href="/whale-alerts" className="text-sm text-[#00e5ff] font-medium">Whale Alerts</Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12 relative z-10">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#00e5ff]/10 border border-[#00e5ff]/20 text-[#00e5ff] text-xs font-medium mb-6">
            🐋 WHALE TRACKING
          </div>
          <h1 className="text-5xl font-black mb-3 bg-gradient-to-r from-[#00e5ff] via-[#a855f7] to-[#00e5ff] bg-clip-text text-transparent">
            🐋 Whale Alerts
          </h1>
          <p className="text-white/40 text-lg max-w-xl mx-auto">
            Track whale movements, detect suspicious transactions, and stay ahead of market movers
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Volume', value: formatUSD(totalVolume), icon: '💰', color: '#00e5ff' },
            { label: 'Transactions', value: txs.length, icon: '📊', color: '#a855f7' },
            { label: 'Suspicious', value: suspiciousCount, icon: '🚨', color: '#ff3b3b' },
            { label: 'Chains Tracked', value: 6, icon: '⛓️', color: '#00ff87' },
          ].map(s => (
            <div key={s.label} className="p-5 bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl hover:border-white/[0.12] transition-all">
              <span className="text-2xl">{s.icon}</span>
              <p className="text-2xl font-black mt-2" style={{ color: s.color }}>{s.value}</p>
              <p className="text-white/30 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {(['all', 'suspicious', 'buy', 'sell', 'transfer', 'approve'] as const).map(f => (
            <button key={f} onClick={() => setFilterType(f)} className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all capitalize ${filterType === f ? 'bg-white/10 text-white border border-white/20' : 'bg-white/[0.03] text-white/30 border border-white/[0.06] hover:text-white/60'}`}>
              {f === 'all' ? '🔍 All' : f === 'suspicious' ? '🚨 Suspicious' : `${TX_TYPE_STYLES[f].icon} ${f}`}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-white/30 text-xs">Min Value:</span>
            <select value={minValue} onChange={e => setMinValue(Number(e.target.value))} className="px-3 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-xs text-white focus:outline-none">
              <option value={100000}>$100K</option>
              <option value={1000000}>$1M</option>
              <option value={5000000}>$5M</option>
              <option value={10000000}>$10M</option>
            </select>
          </div>
        </div>

        {/* Transaction Feed */}
        <div className="space-y-3">
          {filtered.map((tx, i) => {
            const txStyle = TX_TYPE_STYLES[tx.type]
            return (
              <div key={i} className={`p-5 bg-white/[0.03] backdrop-blur-xl border rounded-2xl transition-all duration-300 ${tx.suspicious ? 'border-[#ff3b3b]/15 hover:border-[#ff3b3b]/30' : 'border-white/[0.06] hover:border-white/[0.12]'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${tx.suspicious ? 'bg-[#ff3b3b]/10 border border-[#ff3b3b]/20' : 'bg-white/[0.05] border border-white/[0.06]'}`}>
                      <span className={txStyle.color}>{txStyle.icon}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-sm">{tx.amountFormatted}</h4>
                        <span className={`text-sm font-bold ${txStyle.color}`}>{tx.type.toUpperCase()}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-white/[0.05] text-white/30">{tx.chainName}</span>
                        {tx.suspicious && <span className="px-2 py-0.5 rounded text-[10px] bg-[#ff3b3b]/10 text-[#ff3b3b] border border-[#ff3b3b]/20">🚨 SUSPICIOUS</span>}
                      </div>
                      <p className="text-white/40 text-xs">
                        <span className="text-white/60">{tx.fromLabel}</span> → <span className="text-white/60">{tx.toLabel}</span>
                      </p>
                      <p className="text-white/20 text-[10px] font-mono mt-0.5">{tx.hash}</p>
                      {tx.suspiciousReasons.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {tx.suspiciousReasons.map((r, j) => (
                            <span key={j} className="px-2 py-0.5 rounded text-[10px] bg-[#ff3b3b]/5 text-[#ff3b3b]/60 border border-[#ff3b3b]/10">{r}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold" style={{ color: txStyle.color }}>{formatUSD(tx.usdValue)}</p>
                    <p className="text-white/20 text-[10px]">{new Date(tx.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div className="p-12 bg-white/[0.02] border border-white/[0.06] rounded-2xl text-center">
            <span className="text-4xl block mb-3">🐋</span>
            <p className="text-white/30 text-sm">No whale transactions match your filters</p>
          </div>
        )}
      </div>
    </main>
  )
}
