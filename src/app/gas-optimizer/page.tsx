'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  predictBestTime,
  calculateGasSavings,
  getAllPredictions,
  createGasAlert,
  getGasAlerts,
  toggleGasAlert,
  deleteGasAlert,
  createAutoExecute,
  getAutoExecuteConfigs,
  getHistoricalGas,
  getSupportedChains,
  type GasPrediction,
  type GasAlert,
  type GasSavingsEstimate,
  type AutoExecuteConfig,
  type GasDataPoint,
} from '@/lib/gasOptimizer'

type Tab = 'overview' | 'history' | 'alerts' | 'auto'

export default function GasOptimizerPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [predictions, setPredictions] = useState<GasPrediction[]>([])
  const [alerts, setAlerts] = useState<GasAlert[]>([])
  const [autoConfigs, setAutoConfigs] = useState<AutoExecuteConfig[]>([])
  const [selectedChain, setSelectedChain] = useState(1)
  const [selectedPeriod, setSelectedPeriod] = useState<'24h' | '7d' | '30d'>('7d')
  const [historyData, setHistoryData] = useState<GasDataPoint[]>([])
  const [savings, setSavings] = useState<GasSavingsEstimate | null>(null)
  const [gasLimit, setGasLimit] = useState(210000)
  const [showGuide, setShowGuide] = useState(true)

  // Alert form
  const [alertChain, setAlertChain] = useState(1)
  const [alertThreshold, setAlertThreshold] = useState('')
  const [alertCondition, setAlertCondition] = useState<'below' | 'above'>('below')

  // Auto-execute form
  const [autoChain, setAutoChain] = useState(1)
  const [autoMaxGas, setAutoMaxGas] = useState('')
  const [autoToAddr, setAutoToAddr] = useState('')
  const [autoTxData, setAutoTxData] = useState('')
  const [autoValue, setAutoValue] = useState('0')

  const chains = getSupportedChains()

  const refresh = useCallback(() => {
    setPredictions(getAllPredictions())
    setAlerts(getGasAlerts())
    setAutoConfigs(getAutoExecuteConfigs())
    setHistoryData(getHistoricalGas(selectedChain, selectedPeriod))
    setSavings(calculateGasSavings(selectedChain, gasLimit))
  }, [selectedChain, selectedPeriod, gasLimit])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 15000)
    return () => clearInterval(interval)
  }, [refresh])

  const handleCreateAlert = () => {
    if (!alertThreshold) return
    createGasAlert(alertChain, parseFloat(alertThreshold), alertCondition)
    setAlertThreshold('')
    refresh()
  }

  const handleCreateAutoExecute = () => {
    if (!autoMaxGas || !autoToAddr) return
    createAutoExecute(autoChain, parseFloat(autoMaxGas), autoToAddr, autoTxData, autoValue)
    setAutoMaxGas('')
    setAutoToAddr('')
    setAutoTxData('')
    setAutoValue('0')
    refresh()
  }

  const getRecommendationColor = (rec: GasPrediction['recommendation']) => {
    switch (rec) {
      case 'transact_now': return 'text-green-400 bg-green-500/10 border-green-500/20'
      case 'optimal_window': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
      case 'wait': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
    }
  }

  const getRecommendationLabel = (rec: GasPrediction['recommendation']) => {
    switch (rec) {
      case 'transact_now': return '🟢 Transact Now'
      case 'optimal_window': return '🟢 Optimal Window'
      case 'wait': return '🟡 Wait for Lower Gas'
    }
  }

  // Render mini gas chart with CSS bars
  const renderChart = (data: GasDataPoint[]) => {
    if (data.length === 0) return null
    const maxGas = Math.max(...data.map(d => d.gasPrice))
    const minGas = Math.min(...data.map(d => d.gasPrice))
    const range = maxGas - minGas || 1
    const barCount = Math.min(data.length, 60)
    const step = Math.floor(data.length / barCount)

    return (
      <div className="flex items-end gap-[2px] h-32">
        {Array.from({ length: barCount }, (_, i) => {
          const point = data[i * step]
          if (!point) return null
          const height = ((point.gasPrice - minGas) / range) * 100
          const isLow = point.gasPrice < minGas + range * 0.25
          return (
            <div
              key={i}
              className={`flex-1 rounded-t transition-all ${
                isLow ? 'bg-green-400/60' : point.gasPrice > minGas + range * 0.75 ? 'bg-red-400/40' : 'bg-blue-400/40'
              }`}
              style={{ height: `${Math.max(4, height)}%` }}
              title={`${new Date(point.timestamp).toLocaleString()}: ${point.gasPrice.toFixed(4)} Gwei`}
            />
          )
        })}
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#030305] text-white">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/3 w-[500px] h-[500px] bg-orange-500/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-yellow-500/[0.03] rounded-full blur-[100px]" />
      </div>

      <nav className="relative z-10 flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">SweepGuard</span>
        </Link>
        <div className="flex gap-4">
          <Link href="/gas" className="text-sm text-white/50 hover:text-orange-400">Gas Tracker</Link>
          <Link href="/gas-optimizer" className="text-sm text-orange-400 font-medium">Gas Optimizer</Link>
          <Link href="/dashboard" className="text-sm text-white/50 hover:text-orange-400">Dashboard</Link>
        </div>
      </nav>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        <h1 className="text-4xl md:text-5xl font-black mb-2">
          ⛽ Gas Fee <span className="bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">Optimizer</span>
        </h1>
        <p className="text-gray-500 text-lg mb-8">Predict the best time to transact, set gas alerts, and auto-execute when gas is low</p>

        {/* Guide */}
        {showGuide && (
          <div className="mb-8 p-5 bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-sm border border-blue-500/20 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-blue-400">📖 How Gas Optimization Works</h2>
              <button onClick={() => setShowGuide(false)} className="text-white/30 hover:text-white/60 text-xs">Hide ✕</button>
            </div>
            <div className="grid md:grid-cols-3 gap-4 text-xs text-white/50">
              <div>
                <p className="text-white/70 font-medium mb-1">🔮 Predict Best Time</p>
                <p>We analyze 7-day gas patterns to find the cheapest hours to transact. Gas is usually lowest 2-6 AM UTC.</p>
              </div>
              <div>
                <p className="text-white/70 font-medium mb-1">🔔 Gas Alerts</p>
                <p>Set a target gas price and get notified when it drops below (or rises above) your threshold.</p>
              </div>
              <div>
                <p className="text-white/70 font-medium mb-1">⚡ Auto-Execute</p>
                <p>Set a max gas price and we&apos;ll execute your transaction automatically when gas drops below your limit.</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
          {[
            { id: 'overview' as Tab, label: '🔮 Overview', icon: '' },
            { id: 'history' as Tab, label: '📊 History', icon: '' },
            { id: 'alerts' as Tab, label: '🔔 Alerts', icon: '' },
            { id: 'auto' as Tab, label: '⚡ Auto-Execute', icon: '' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'text-white/40 hover:text-white/60 border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Savings Calculator */}
            {savings && (
              <div className="p-5 bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-sm border border-green-500/20 rounded-2xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div>
                    <h3 className="font-semibold text-green-400">💰 Gas Savings Calculator</h3>
                    <p className="text-xs text-white/40">Estimate savings by timing your transactions</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-white/40">Gas Limit:</label>
                    <select
                      value={gasLimit}
                      onChange={e => setGasLimit(Number(e.target.value))}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
                    >
                      <option value={21000}>ETH Transfer (21k)</option>
                      <option value={65000}>ERC-20 Transfer (65k)</option>
                      <option value={210000}>Swap (210k)</option>
                      <option value={500000}>Complex DeFi (500k)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-white/[0.03] rounded-xl">
                    <div className="text-xs text-white/30 mb-1">Current Cost</div>
                    <div className="font-mono text-sm text-white">{savings.currentCost}</div>
                  </div>
                  <div className="p-3 bg-white/[0.03] rounded-xl">
                    <div className="text-xs text-white/30 mb-1">Optimized Cost</div>
                    <div className="font-mono text-sm text-green-400">{savings.optimizedCost}</div>
                  </div>
                  <div className="p-3 bg-white/[0.03] rounded-xl">
                    <div className="text-xs text-white/30 mb-1">You Save</div>
                    <div className="font-mono text-sm text-emerald-400">{savings.savedAmount}</div>
                  </div>
                  <div className="p-3 bg-white/[0.03] rounded-xl">
                    <div className="text-xs text-white/30 mb-1">Savings %</div>
                    <div className="font-mono text-lg font-bold text-green-400">{savings.savedPercent}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Predictions Grid */}
            <div>
              <h3 className="text-lg font-semibold mb-4">🔮 Best Time to Transact</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {predictions.map(pred => (
                  <div key={pred.chainId} className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl hover:border-green-500/20 transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium">{pred.chainName}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${getRecommendationColor(pred.recommendation)}`}>
                        {getRecommendationLabel(pred.recommendation)}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/40">Current Gas</span>
                        <span className="font-mono">{pred.currentGas} Gwei</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/40">Best Time Gas</span>
                        <span className="font-mono text-green-400">{pred.predictedBestGas} Gwei</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/40">Est. Savings</span>
                        <span className="text-emerald-400">{pred.savingsEstimate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/40">Best Window</span>
                        <span className="text-xs text-white/60">{new Date(pred.predictedBestTime).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/40">Confidence</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-green-400 rounded-full" style={{ width: `${pred.confidence}%` }} />
                          </div>
                          <span className="text-xs">{pred.confidence}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div>
                <label className="text-xs text-white/40 mb-1 block">Chain</label>
                <select
                  value={selectedChain}
                  onChange={e => setSelectedChain(Number(e.target.value))}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white"
                >
                  {chains.map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Period</label>
                <div className="flex gap-1">
                  {(['24h', '7d', '30d'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setSelectedPeriod(p)}
                      className={`px-3 py-2 rounded-lg text-sm transition-all ${
                        selectedPeriod === p
                          ? 'bg-green-500/20 text-green-400'
                          : 'text-white/40 hover:text-white/60'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
              <h3 className="text-sm font-medium mb-4 text-white/60">
                📊 Gas Price History — {chains.find(c => c.id === selectedChain)?.name} ({selectedPeriod})
              </h3>
              {renderChart(historyData)}
              <div className="flex justify-between mt-2 text-xs text-white/30">
                <span>{historyData.length > 0 ? new Date(historyData[0].timestamp).toLocaleDateString() : ''}</span>
                <span>{historyData.length > 0 ? new Date(historyData[historyData.length - 1].timestamp).toLocaleDateString() : ''}</span>
              </div>
              <div className="flex gap-4 mt-3 text-xs text-white/40">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-400/60 rounded-full" /> Low (good time)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-400/40 rounded-full" /> Average</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-400/40 rounded-full" /> High (avoid)</span>
              </div>
            </div>

            {/* Stats */}
            {historyData.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(() => {
                  const prices = historyData.map(d => d.gasPrice)
                  const min = Math.min(...prices)
                  const max = Math.max(...prices)
                  const avg = prices.reduce((a, b) => a + b, 0) / prices.length
                  const sorted = [...prices].sort((a, b) => a - b)
                  const median = sorted[Math.floor(sorted.length / 2)]
                  return [
                    { label: 'Min', value: `${min.toFixed(4)} Gwei`, color: 'text-green-400' },
                    { label: 'Max', value: `${max.toFixed(4)} Gwei`, color: 'text-red-400' },
                    { label: 'Average', value: `${avg.toFixed(4)} Gwei`, color: 'text-blue-400' },
                    { label: 'Median', value: `${median.toFixed(4)} Gwei`, color: 'text-purple-400' },
                  ].map(s => (
                    <div key={s.label} className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                      <div className="text-xs text-white/30 mb-1">{s.label}</div>
                      <div className={`font-mono text-sm ${s.color}`}>{s.value}</div>
                    </div>
                  ))
                })()}
              </div>
            )}
          </div>
        )}

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className="space-y-6">
            {/* Create Alert */}
            <div className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
              <h3 className="font-semibold mb-4">🔔 Create Gas Alert</h3>
              <div className="grid md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Chain</label>
                  <select
                    value={alertChain}
                    onChange={e => setAlertChain(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                  >
                    {chains.map(c => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Condition</label>
                  <select
                    value={alertCondition}
                    onChange={e => setAlertCondition(e.target.value as 'below' | 'above')}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                  >
                    <option value="below">Below (notify when cheap)</option>
                    <option value="above">Above (notify when expensive)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Threshold (Gwei)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={alertThreshold}
                    onChange={e => setAlertThreshold(e.target.value)}
                    placeholder="e.g. 15"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/20"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleCreateAlert}
                    disabled={!alertThreshold}
                    className="w-full px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl text-sm font-semibold hover:from-green-500 hover:to-emerald-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Create Alert
                  </button>
                </div>
              </div>
            </div>

            {/* Active Alerts */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Active Alerts ({alerts.length})</h3>
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-white/30">
                  <span className="text-4xl block mb-3">🔕</span>
                  No gas alerts set. Create one above to get notified when gas hits your target price.
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map(alert => (
                    <div key={alert.id} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                      <div className="flex items-center gap-4">
                        <span className={`w-2 h-2 rounded-full ${alert.enabled ? 'bg-green-400' : 'bg-white/20'}`} />
                        <div>
                          <span className="font-medium text-sm">{alert.chainName}</span>
                          <span className="text-white/40 text-sm ml-2">
                            {alert.condition === 'below' ? '⬇️ Below' : '⬆️ Above'} {alert.thresholdGwei} Gwei
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { toggleGasAlert(alert.id); refresh() }}
                          className={`px-3 py-1 rounded-lg text-xs ${
                            alert.enabled ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-white/30'
                          }`}
                        >
                          {alert.enabled ? 'ON' : 'OFF'}
                        </button>
                        <button
                          onClick={() => { deleteGasAlert(alert.id); refresh() }}
                          className="px-3 py-1 bg-red-500/10 text-red-400 rounded-lg text-xs hover:bg-red-500/20"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Auto-Execute Tab */}
        {activeTab === 'auto' && (
          <div className="space-y-6">
            <div className="p-5 bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-sm border border-purple-500/20 rounded-2xl">
              <h3 className="font-semibold mb-2">⚡ Auto-Execute When Gas Is Low</h3>
              <p className="text-xs text-white/40 mb-4">Set a transaction and max gas price. We&apos;ll execute it automatically when gas drops below your limit.</p>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Chain</label>
                  <select
                    value={autoChain}
                    onChange={e => setAutoChain(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                  >
                    {chains.map(c => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Max Gas (Gwei)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={autoMaxGas}
                    onChange={e => setAutoMaxGas(e.target.value)}
                    placeholder="e.g. 10"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/20"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">To Address</label>
                  <input
                    type="text"
                    value={autoToAddr}
                    onChange={e => setAutoToAddr(e.target.value)}
                    placeholder="0x..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/20 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Value (ETH)</label>
                  <input
                    type="text"
                    value={autoValue}
                    onChange={e => setAutoValue(e.target.value)}
                    placeholder="0"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/20 font-mono"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="text-xs text-white/40 mb-1 block">Transaction Data (hex, optional)</label>
                <input
                  type="text"
                  value={autoTxData}
                  onChange={e => setAutoTxData(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/20 font-mono"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCreateAutoExecute}
                  disabled={!autoMaxGas || !autoToAddr}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-sm font-semibold hover:from-purple-500 hover:to-blue-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ⚡ Create Auto-Execute
                </button>
              </div>
              <p className="text-xs text-yellow-400/60 mt-3">⚠️ Auto-execute requires wallet connection and transaction signing. This creates a pending order only.</p>
            </div>

            {/* Pending Configs */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Pending Auto-Executes ({autoConfigs.length})</h3>
              {autoConfigs.length === 0 ? (
                <div className="text-center py-8 text-white/30">
                  <span className="text-4xl block mb-3">⚡</span>
                  No auto-execute orders. Create one above to automatically transact when gas is low.
                </div>
              ) : (
                <div className="space-y-3">
                  {autoConfigs.map((config, i) => (
                    <div key={i} className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-sm">{chains.find(c => c.id === config.chainId)?.name || `Chain ${config.chainId}`}</span>
                          <span className="text-white/40 text-sm ml-2">→ {config.toAddress.slice(0, 8)}...{config.toAddress.slice(-6)}</span>
                        </div>
                        <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
                          Max {config.maxGasGwei} Gwei
                        </span>
                      </div>
                      <div className="flex gap-4 mt-2 text-xs text-white/30">
                        <span>Value: {config.value} ETH</span>
                        <span>Created: {new Date(config.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
