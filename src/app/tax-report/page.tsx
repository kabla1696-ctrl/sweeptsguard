'use client'

import { useState, useEffect, useCallback } from 'react'

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

interface TaxSummary {
  taxYear: number
  country: string
  costBasisMethod: string
  totalGains: number
  totalLosses: number
  netGainLoss: number
  shortTermGains: number
  shortTermLosses: number
  longTermGains: number
  longTermLosses: number
  totalIncome: number
  totalFees: number
  totalTransactions: number
  assetBreakdown: Array<{
    asset: string
    totalBought: number
    totalSold: number
    realizedGain: number
    avgCostBasis: number
  }>
  monthlyBreakdown: Array<{
    month: string
    gains: number
    losses: number
    income: number
    transactions: number
  }>
}

export default function TaxReportPage() {
  const [events, setEvents] = useState<TaxEvent[]>([])
  const [summary, setSummary] = useState<TaxSummary | null>(null)
  const [year, setYear] = useState('2026')
  const [country, setCountry] = useState('US')
  const [costMethod, setCostMethod] = useState<'FIFO' | 'LIFO' | 'HIFO'>('FIFO')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState<string | null>(null)

  const generateReport = useCallback(async () => {
    setGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/tax-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          year: parseInt(year),
          country,
          costMethod,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Report generation failed')
      }

      setSummary(data.summary)
      setEvents(data.transactions || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }, [year, country, costMethod])

  // Generate report on initial load
  useEffect(() => {
    generateReport()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleExport = async (format: 'csv' | 'text') => {
    setExporting(format)

    try {
      const response = await fetch('/api/tax-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: format === 'csv' ? 'export-csv' : 'export-text',
          year: parseInt(year),
          country,
          costMethod,
        }),
      })

      if (format === 'csv') {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `sweeptsguard-tax-report-${year}.csv`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        const data = await response.json()
        if (data.success && data.report) {
          const blob = new Blob([data.report], { type: 'text/plain' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = data.filename || `tax-report-${year}.txt`
          a.click()
          URL.revokeObjectURL(url)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExporting(null)
    }
  }

  const totalGains = summary?.totalGains ?? 0
  const totalLosses = summary?.totalLosses ?? 0
  const netGain = summary?.netGainLoss ?? 0
  const totalVolume = events.reduce((s, e) => s + e.value, 0)

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

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

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
              <option value="US">🇺🇸 United States</option>
              <option value="UK">🇬🇧 United Kingdom</option>
              <option value="DE">🇩🇪 Germany</option>
              <option value="JP">🇯🇵 Japan</option>
              <option value="SG">🇸🇬 Singapore</option>
              <option value="AU">🇦🇺 Australia</option>
              <option value="CA">🇨🇦 Canada</option>
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Gains', value: `$${totalGains.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: 'text-green-400', icon: '📈' },
            { label: 'Total Losses', value: `$${totalLosses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: 'text-red-400', icon: '📉' },
            { label: 'Net P/L', value: `$${netGain.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: netGain >= 0 ? 'text-green-400' : 'text-red-400', icon: '💰' },
            { label: 'Total Volume', value: `$${totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: 'text-blue-400', icon: '📊' },
          ].map((s, i) => (
            <div key={i} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>

        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 text-center">
              <div className="text-lg font-bold text-green-400">${summary.shortTermGains.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="text-xs text-gray-400">Short-Term Gains</div>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 text-center">
              <div className="text-lg font-bold text-red-400">${summary.shortTermLosses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="text-xs text-gray-400">Short-Term Losses</div>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 text-center">
              <div className="text-lg font-bold text-green-400">${summary.longTermGains.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="text-xs text-gray-400">Long-Term Gains</div>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 text-center">
              <div className="text-lg font-bold text-purple-400">${summary.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="text-xs text-gray-400">Total Income</div>
            </div>
          </div>
        )}

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
                    <td className="px-4 py-3 text-right text-gray-300 text-sm">{e.amount.toFixed(6)}</td>
                    <td className="px-4 py-3 text-right text-white text-sm">${e.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-right text-gray-400 text-sm">${e.costBasis.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className={`px-4 py-3 text-right font-medium text-sm ${e.gain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {e.gain >= 0 ? '+' : ''}${e.gain.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{e.chain}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-4">📥 Export Options</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleExport('csv')}
              disabled={exporting === 'csv'}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium"
            >
              {exporting === 'csv' ? '⏳ Exporting...' : '📊 Download CSV'}
            </button>
            <button
              onClick={() => handleExport('text')}
              disabled={exporting === 'text'}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium"
            >
              {exporting === 'text' ? '⏳ Exporting...' : '📄 Download Report'}
            </button>
            <button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium">📑 TurboTax Format</button>
            <button className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-lg font-medium">📋 IRS Form 8949</button>
          </div>
        </div>
      </div>
    </div>
  )
}
