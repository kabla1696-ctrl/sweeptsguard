'use client'

import { useState } from 'react'

interface TaxEvent {
  id: string
  date: string
  type: 'buy' | 'sell' | 'swap' | 'airdrop' | 'mining' | 'staking' | 'gift'
  asset: string
  amount: number
  price: number
  value: number
  costBasis: number
  gain: number
  chain: string
}

const DEMO_EVENTS: TaxEvent[] = [
  { id: '1', date: '2026-01-15', type: 'buy', asset: 'ETH', amount: 5, price: 3200, value: 16000, costBasis: 16000, gain: 0, chain: 'Ethereum' },
  { id: '2', date: '2026-02-20', type: 'sell', asset: 'ETH', amount: 2, price: 3800, value: 7600, costBasis: 6400, gain: 1200, chain: 'Ethereum' },
  { id: '3', date: '2026-03-10', type: 'swap', asset: 'ETH→ARB', amount: 1, price: 3500, value: 3500, costBasis: 3200, gain: 300, chain: 'Arbitrum' },
  { id: '4', date: '2026-03-25', type: 'airdrop', asset: 'TOKEN', amount: 1000, price: 2.5, value: 2500, costBasis: 0, gain: 2500, chain: 'Ethereum' },
  { id: '5', date: '2026-04-05', type: 'staking', asset: 'ETH', amount: 0.5, price: 3600, value: 1800, costBasis: 1600, gain: 200, chain: 'Ethereum' },
  { id: '6', date: '2026-04-20', type: 'sell', asset: 'BTC', amount: 0.1, price: 95000, value: 9500, costBasis: 6200, gain: 3300, chain: 'Bitcoin' },
]

export default function TaxReportPage() {
  const [events] = useState<TaxEvent[]>(DEMO_EVENTS)
  const [year, setYear] = useState('2026')
  const [country, setCountry] = useState('us')
  const [costMethod, setCostMethod] = useState<'FIFO' | 'LIFO' | 'HIFO'>('FIFO')
  const [generating, setGenerating] = useState(false)

  const totalGains = events.filter(e => e.gain > 0).reduce((s, e) => s + e.gain, 0)
  const totalLosses = Math.abs(events.filter(e => e.gain < 0).reduce((s, e) => s + e.gain, 0))
  const netGain = totalGains - totalLosses
  const totalVolume = events.reduce((s, e) => s + e.value, 0)

  const generateReport = () => {
    setGenerating(true)
    setTimeout(() => setGenerating(false), 3000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-950 to-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">📋 Tax Report Generator</h1>
            <p className="text-gray-400">Auto-generate tax reports from your transaction history</p>
          </div>
          <button onClick={generateReport} disabled={generating} className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium">
            {generating ? '⏳ Generating...' : '📄 Generate Report'}
          </button>
        </div>

        {/* Config */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
            <label className="text-gray-400 text-sm mb-2 block">Tax Year</label>
            <select value={year} onChange={e => setYear(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white">
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
            <label className="text-gray-400 text-sm mb-2 block">Country</label>
            <select value={country} onChange={e => setCountry(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white">
              <option value="us">🇺🇸 United States</option>
              <option value="uk">🇬🇧 United Kingdom</option>
              <option value="de">🇩🇪 Germany</option>
              <option value="jp">🇯🇵 Japan</option>
              <option value="in">🇮🇳 India</option>
              <option value="bd">🇧🇩 Bangladesh</option>
            </select>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
            <label className="text-gray-400 text-sm mb-2 block">Cost Basis Method</label>
            <select value={costMethod} onChange={e => setCostMethod(e.target.value as 'FIFO' | 'LIFO' | 'HIFO')} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white">
              <option value="FIFO">FIFO (First In, First Out)</option>
              <option value="LIFO">LIFO (Last In, First Out)</option>
              <option value="HIFO">HIFO (Highest In, First Out)</option>
            </select>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Gains', value: `$${totalGains.toLocaleString()}`, color: 'text-green-400', icon: '📈' },
            { label: 'Total Losses', value: `$${totalLosses.toLocaleString()}`, color: 'text-red-400', icon: '📉' },
            { label: 'Net P/L', value: `$${netGain.toLocaleString()}`, color: netGain >= 0 ? 'text-green-400' : 'text-red-400', icon: '💰' },
            { label: 'Total Volume', value: `$${totalVolume.toLocaleString()}`, color: 'text-blue-400', icon: '📊' },
          ].map((s, i) => (
            <div key={i} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Events Table */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden mb-8">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-white font-semibold">📝 Taxable Events ({events.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left text-gray-400 text-sm font-medium px-4 py-3">Date</th>
                  <th className="text-left text-gray-400 text-sm font-medium px-4 py-3">Type</th>
                  <th className="text-left text-gray-400 text-sm font-medium px-4 py-3">Asset</th>
                  <th className="text-right text-gray-400 text-sm font-medium px-4 py-3">Amount</th>
                  <th className="text-right text-gray-400 text-sm font-medium px-4 py-3">Value</th>
                  <th className="text-right text-gray-400 text-sm font-medium px-4 py-3">Cost Basis</th>
                  <th className="text-right text-gray-400 text-sm font-medium px-4 py-3">Gain/Loss</th>
                  <th className="text-left text-gray-400 text-sm font-medium px-4 py-3">Chain</th>
                </tr>
              </thead>
              <tbody>
                {events.map(e => (
                  <tr key={e.id} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                    <td className="px-4 py-3 text-gray-300 text-sm">{e.date}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${e.type === 'buy' ? 'bg-green-500/20 text-green-400' : e.type === 'sell' ? 'bg-red-500/20 text-red-400' : e.type === 'swap' ? 'bg-blue-500/20 text-blue-400' : e.type === 'airdrop' ? 'bg-purple-500/20 text-purple-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                        {e.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white font-medium text-sm">{e.asset}</td>
                    <td className="px-4 py-3 text-right text-gray-300 text-sm">{e.amount}</td>
                    <td className="px-4 py-3 text-right text-white text-sm">${e.value.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-400 text-sm">${e.costBasis.toLocaleString()}</td>
                    <td className={`px-4 py-3 text-right font-medium text-sm ${e.gain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {e.gain >= 0 ? '+' : ''}${e.gain.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{e.chain}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Export */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-4">📥 Export Options</h2>
          <div className="flex flex-wrap gap-3">
            <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium">📄 Download PDF</button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium">📊 Download CSV</button>
            <button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium">📑 TurboTax Format</button>
            <button className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-lg font-medium">📋 IRS Form 8949</button>
          </div>
        </div>
      </div>
    </div>
  )
}
