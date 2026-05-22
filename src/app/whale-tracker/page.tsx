'use client'

import { useState, useEffect, useCallback } from 'react'

interface Whale {
  address: string
  label: string
  category: string
  netWorth: number
  chains: string[]
  winRate: number
  profitLoss30d: number
  lastActivity: string
  avatar: string
}

interface WhaleTrade {
  id: string
  whale: string
  action: string
  token: string
  amount: number
  value: number
  chain: string
  timestamp: string
}

const DEMO_WHALES: Whale[] = [
  { address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', label: 'Vitalik.eth', category: 'fund', netWorth: 850000000, chains: ['Ethereum', 'Arbitrum'], winRate: 78, profitLoss30d: 12500000, lastActivity: '2h ago', avatar: '🐋' },
  { address: '0x28C6c06298d514Db089934071355E5743bf21d60', label: 'Binance Hot Wallet', category: 'exchange', netWorth: 2500000000, chains: ['Ethereum', 'BSC'], winRate: 0, profitLoss30d: 0, lastActivity: '5m ago', avatar: '🏦' },
  { address: '0x503828976D22510aad0201ac7EC88293211D23Da', label: 'a]16z', category: 'fund', netWorth: 1200000000, chains: ['Ethereum'], winRate: 82, profitLoss30d: 45000000, lastActivity: '1h ago', avatar: '🦈' },
  { address: '0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF', label: 'Whale Trader #47', category: 'trader', netWorth: 45000000, chains: ['Ethereum', 'Solana', 'Arbitrum'], winRate: 91, profitLoss30d: 8700000, lastActivity: '30m ago', avatar: '🐳' },
  { address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18', label: 'DeFi Whale', category: 'defi', netWorth: 180000000, chains: ['Ethereum', 'Polygon'], winRate: 65, profitLoss30d: 3200000, lastActivity: '4h ago', avatar: '🐙' },
]

const DEMO_TRADES: WhaleTrade[] = [
  { id: '1', whale: 'Vitalik.eth', action: 'buy', token: 'PEPE', amount: 50000000000, value: 125000, chain: 'Ethereum', timestamp: '10m ago' },
  { id: '2', whale: 'Whale Trader #47', action: 'sell', token: 'ARB', amount: 500000, value: 625000, chain: 'Arbitrum', timestamp: '25m ago' },
  { id: '3', whale: 'a16z', action: 'swap', token: 'ETH → USDC', amount: 1000, value: 3200000, chain: 'Ethereum', timestamp: '1h ago' },
  { id: '4', whale: 'DeFi Whale', action: 'stake', token: 'stETH', amount: 2500, value: 8000000, chain: 'Ethereum', timestamp: '2h ago' },
  { id: '5', whale: 'Binance Hot Wallet', action: 'transfer', token: 'USDT', amount: 50000000, value: 50000000, chain: 'Ethereum', timestamp: '5m ago' },
]

export default function WhaleTrackerPage() {
  const [whales, setWhales] = useState<Whale[]>(DEMO_WHALES)
  const [trades, setTrades] = useState<WhaleTrade[]>(DEMO_TRADES)
  const [selectedWhale, setSelectedWhale] = useState<Whale | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('netWorth')
  const [loading, setLoading] = useState(false)
  const [newAddress, setNewAddress] = useState('')
  const [alertThreshold, setAlertThreshold] = useState(100000)

  const filteredWhales = whales.filter(w => filter === 'all' || w.category === filter)
    .sort((a, b) => {
      if (sortBy === 'netWorth') return b.netWorth - a.netWorth
      if (sortBy === 'winRate') return (b.winRate || 0) - (a.winRate || 0)
      if (sortBy === 'profit') return (b.profitLoss30d || 0) - (a.profitLoss30d || 0)
      return 0
    })

  const addWhale = () => {
    if (!newAddress.startsWith('0x') || newAddress.length !== 42) return
    const newW: Whale = {
      address: newAddress,
      label: `Whale ${whales.length + 1}`,
      category: 'unknown',
      netWorth: 0,
      chains: ['Ethereum'],
      winRate: 0,
      profitLoss30d: 0,
      lastActivity: 'just now',
      avatar: '🐋'
    }
    setWhales([...whales, newW])
    setNewAddress('')
  }

  const formatUSD = (n: number) => {
    if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
    if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`
    return `$${n.toFixed(0)}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">🐋 Whale Wallet Tracker</h1>
          <p className="text-gray-400">Follow smart money. Get alerts when whales move.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Tracked Whales', value: whales.length, icon: '🐋' },
            { label: 'Total Net Worth', value: formatUSD(whales.reduce((s, w) => s + w.netWorth, 0)), icon: '💰' },
            { label: 'Avg Win Rate', value: `${Math.round(whales.filter(w => w.winRate > 0).reduce((s, w) => s + w.winRate, 0) / whales.filter(w => w.winRate > 0).length)}%`, icon: '📈' },
            { label: 'Alerts Today', value: trades.length, icon: '🔔' },
          ].map((s, i) => (
            <div key={i} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-xl font-bold text-white">{s.value}</div>
              <div className="text-xs text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Add Whale */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 mb-8">
          <h3 className="text-white font-semibold mb-3">Track New Whale</h3>
          <div className="flex gap-3">
            <input
              value={newAddress}
              onChange={e => setNewAddress(e.target.value)}
              placeholder="0x... wallet address"
              className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400"
            />
            <button onClick={addWhale} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium">
              + Track
            </button>
          </div>
          <div className="mt-3 flex gap-2 items-center">
            <span className="text-gray-400 text-sm">Alert when trade {'>'}</span>
            <input
              type="number"
              value={alertThreshold}
              onChange={e => setAlertThreshold(Number(e.target.value))}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-white w-32 text-sm"
            />
            <span className="text-gray-400 text-sm">USD</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          {['all', 'fund', 'exchange', 'trader', 'defi', 'unknown'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            >
              {f === 'all' ? '🌍 All' : f === 'fund' ? '🏦 Funds' : f === 'exchange' ? '💱 Exchanges' : f === 'trader' ? '📊 Traders' : f === 'defi' ? '🔗 DeFi' : '❓ Unknown'}
            </button>
          ))}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-gray-300 px-3 py-2 rounded-lg text-sm"
          >
            <option value="netWorth">Sort: Net Worth</option>
            <option value="winRate">Sort: Win Rate</option>
            <option value="profit">Sort: 30d Profit</option>
          </select>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Whale List */}
          <div className="lg:col-span-2 space-y-3">
            {filteredWhales.map((w, i) => (
              <div
                key={i}
                onClick={() => setSelectedWhale(w)}
                className={`bg-gray-800/50 backdrop-blur-sm border rounded-xl p-4 cursor-pointer transition hover:border-blue-500 ${selectedWhale?.address === w.address ? 'border-blue-500' : 'border-gray-700'}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{w.avatar}</span>
                    <div>
                      <div className="text-white font-semibold">{w.label}</div>
                      <div className="text-gray-400 text-xs font-mono">{w.address.slice(0, 8)}...{w.address.slice(-6)}</div>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${w.category === 'fund' ? 'bg-purple-500/20 text-purple-400' : w.category === 'exchange' ? 'bg-yellow-500/20 text-yellow-400' : w.category === 'trader' ? 'bg-green-500/20 text-green-400' : w.category === 'defi' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'}`}>
                    {w.category}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div>
                    <div className="text-white font-bold">{formatUSD(w.netWorth)}</div>
                    <div className="text-gray-500 text-xs">Net Worth</div>
                  </div>
                  <div>
                    <div className="text-green-400 font-bold">{w.winRate}%</div>
                    <div className="text-gray-500 text-xs">Win Rate</div>
                  </div>
                  <div>
                    <div className={`font-bold ${w.profitLoss30d >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatUSD(w.profitLoss30d)}</div>
                    <div className="text-gray-500 text-xs">30d P/L</div>
                  </div>
                  <div>
                    <div className="text-gray-300 text-sm">{w.lastActivity}</div>
                    <div className="text-gray-500 text-xs">Last Active</div>
                  </div>
                </div>
                <div className="flex gap-1 mt-2">
                  {w.chains.map(c => (
                    <span key={c} className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded text-xs">{c}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Recent Whale Trades */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-4">🔔 Recent Whale Moves</h3>
            <div className="space-y-3">
              {trades.map(t => (
                <div key={t.id} className="border-b border-gray-700 pb-3 last:border-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-sm font-medium">{t.whale}</span>
                    <span className="text-gray-500 text-xs">{t.timestamp}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${t.action === 'buy' ? 'bg-green-500/20 text-green-400' : t.action === 'sell' ? 'bg-red-500/20 text-red-400' : t.action === 'swap' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'}`}>
                      {t.action.toUpperCase()}
                    </span>
                    <span className="text-gray-300 text-sm">{t.token}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-yellow-400 text-sm font-bold">{formatUSD(t.value)}</span>
                    <span className="text-gray-500 text-xs">{t.chain}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Selected Whale Detail */}
        {selectedWhale && (
          <div className="mt-8 bg-gray-800/50 backdrop-blur-sm border border-blue-500 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{selectedWhale.avatar}</span>
                <div>
                  <h2 className="text-white text-xl font-bold">{selectedWhale.label}</h2>
                  <p className="text-gray-400 font-mono text-sm">{selectedWhale.address}</p>
                </div>
              </div>
              <button onClick={() => setSelectedWhale(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-white">{formatUSD(selectedWhale.netWorth)}</div>
                <div className="text-gray-400 text-sm">Total Net Worth</div>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-400">{selectedWhale.winRate}%</div>
                <div className="text-gray-400 text-sm">Win Rate</div>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-yellow-400">{formatUSD(selectedWhale.profitLoss30d)}</div>
                <div className="text-gray-400 text-sm">30d Profit/Loss</div>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-400">{selectedWhale.chains.length}</div>
                <div className="text-gray-400 text-sm">Chains Active</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
