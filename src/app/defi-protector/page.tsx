'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  getDeFiPositions,
  getHealthFactorColor,
  getHealthFactorStatus,
  getHealthFactorBg,
  calculateLiquidationPrice,
  calculateRepayAmount,
  createLiquidationAlert,
  getLiquidationAlerts,
  createAutoRepayConfig,
  getAutoRepayConfigs,
  toggleAutoRepay,
  getYieldSuggestions,
  getProtocolIcon,
  type DeFiPosition,
  type LiquidationAlert,
  type AutoRepayConfig,
  type YieldSuggestion,
} from '@/lib/defiProtector'

type Tab = 'dashboard' | 'alerts' | 'auto-repay' | 'yield'

export default function DeFiProtectorPage() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [address, setAddress] = useState('')
  const [positions, setPositions] = useState<DeFiPosition[]>([])
  const [alerts, setAlerts] = useState<LiquidationAlert[]>([])
  const [autoRepayConfigs, setAutoRepayConfigs] = useState<AutoRepayConfig[]>([])
  const [yieldSuggestions, setYieldSuggestions] = useState<YieldSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showGuide, setShowGuide] = useState(true)

  // Alert form
  const [alertHF, setAlertHF] = useState('1.2')

  // Auto-repay form
  const [repayHF, setRepayHF] = useState('1.15')
  const [repayAsset, setRepayAsset] = useState('USDC')
  const [repayMax, setRepayMax] = useState('')
  const [repaySource, setRepaySource] = useState<'wallet' | 'yield' | 'reserve'>('wallet')

  const refreshState = useCallback(() => {
    setAlerts(getLiquidationAlerts())
    setAutoRepayConfigs(getAutoRepayConfigs())
    setYieldSuggestions(getYieldSuggestions(positions))
  }, [positions])

  useEffect(() => {
    refreshState()
  }, [refreshState])

  const fetchPositions = useCallback(async (addr: string) => {
    if (!addr.trim()) return
    setLoading(true)
    setError('')
    try {
      const data = await getDeFiPositions(addr.trim())
      setPositions(data)
      setYieldSuggestions(getYieldSuggestions(data))
    } catch {
      setError('Failed to fetch DeFi positions')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchPositions(address)
  }

  const handleCreateAlert = (pos: DeFiPosition) => {
    createLiquidationAlert(pos.id, pos.protocolDisplayName, pos.chainName, pos.healthFactor, parseFloat(alertHF))
    refreshState()
  }

  const handleCreateAutoRepay = (posId: string) => {
    if (!repayMax) return
    createAutoRepayConfig(posId, parseFloat(repayHF), repayAsset, parseFloat(repayMax), repaySource)
    setRepayMax('')
    refreshState()
  }

  const totalCollateral = positions.reduce((s, p) => s + p.collateralValue, 0)
  const totalBorrow = positions.reduce((s, p) => s + p.borrowValue, 0)
  const overallHF = totalBorrow > 0 ? (totalCollateral * 0.825) / totalBorrow : Infinity

  return (
    <main className="min-h-screen bg-[#030305] text-white">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-yellow-500/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-orange-500/[0.03] rounded-full blur-[100px]" />
      </div>

      <nav className="relative z-10 flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">SweepGuard</span>
        </Link>
        <div className="flex gap-4">
          <Link href="/defi" className="text-sm text-white/50 hover:text-yellow-400">DeFi</Link>
          <Link href="/defi-protector" className="text-sm text-yellow-400 font-medium">DeFi Protector</Link>
          <Link href="/dashboard" className="text-sm text-white/50 hover:text-yellow-400">Dashboard</Link>
        </div>
      </nav>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        <h1 className="text-4xl md:text-5xl font-black mb-2">
          🏦 DeFi Position <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">Protector</span>
        </h1>
        <p className="text-gray-500 text-lg mb-8">Monitor health factors, get liquidation alerts, and auto-repay to protect your positions</p>

        {/* Guide */}
        {showGuide && (
          <div className="mb-8 p-5 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-yellow-400">📖 Understanding Health Factor</h2>
              <button onClick={() => setShowGuide(false)} className="text-white/30 hover:text-white/60 text-xs">Hide ✕</button>
            </div>
            <div className="grid md:grid-cols-3 gap-4 text-xs text-white/50">
              <div>
                <p className="text-white/70 font-medium mb-1">💚 Health Factor &gt; 1.5</p>
                <p>Your position is safe. The collateral comfortably covers your borrowings.</p>
              </div>
              <div>
                <p className="text-white/70 font-medium mb-1">🟡 Health Factor 1.0-1.5</p>
                <p>Caution zone. A price drop could put you at risk. Consider repaying or adding collateral.</p>
              </div>
              <div>
                <p className="text-white/70 font-medium mb-1">🔴 Health Factor &lt; 1.0</p>
                <p>Danger! Your position can be liquidated. Act immediately to avoid losing funds.</p>
              </div>
            </div>
          </div>
        )}

        {/* Address Input */}
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex gap-3">
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Enter wallet address (0x...)"
              className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 font-mono focus:border-green-500/30 focus:outline-none transition-all"
            />
            <button
              type="submit"
              disabled={loading || !address.trim()}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl text-sm font-semibold hover:from-green-500 hover:to-emerald-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {loading ? 'Scanning...' : '🔍 Scan Positions'}
            </button>
          </div>
        </form>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">{error}</div>
        )}

        {/* Summary Cards */}
        {positions.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
              <div className="text-xs text-white/30 mb-1">Total Collateral</div>
              <div className="text-lg font-bold text-green-400">${totalCollateral.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            </div>
            <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
              <div className="text-xs text-white/30 mb-1">Total Borrowed</div>
              <div className="text-lg font-bold text-orange-400">${totalBorrow.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            </div>
            <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
              <div className="text-xs text-white/30 mb-1">Overall Health</div>
              <div className={`text-lg font-bold ${getHealthFactorColor(overallHF)}`}>{overallHF === Infinity ? '∞' : overallHF.toFixed(2)}</div>
            </div>
            <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
              <div className="text-xs text-white/30 mb-1">Positions</div>
              <div className="text-lg font-bold">{positions.length}</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        {positions.length > 0 && (
          <>
            <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
              {[
                { id: 'dashboard' as Tab, label: '📊 Dashboard' },
                { id: 'alerts' as Tab, label: '🔔 Liquidation Alerts' },
                { id: 'auto-repay' as Tab, label: '🔄 Auto-Repay' },
                { id: 'yield' as Tab, label: '🌾 Yield Tips' },
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

            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div className="space-y-4">
                {positions.map(pos => {
                  const liqPrice = calculateLiquidationPrice(
                    pos.suppliedAssets[0]?.amount || 0,
                    pos.borrowedAssets[0]?.valueUSD || 0,
                    pos.liquidationThreshold,
                    pos.suppliedAssets[0]?.symbol === 'ETH' ? 3000 : 1
                  )
                  return (
                    <div key={pos.id} className={`p-5 rounded-2xl border transition-all ${getHealthFactorBg(pos.healthFactor)}`}>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getProtocolIcon(pos.protocol)}</span>
                          <div>
                            <h3 className="font-semibold">{pos.protocolDisplayName}</h3>
                            <span className="text-xs text-white/40">{pos.chainName}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-xs text-white/40">Health Factor</div>
                            <div className={`text-2xl font-bold ${getHealthFactorColor(pos.healthFactor)}`}>
                              {pos.healthFactor.toFixed(3)}
                            </div>
                            <span className={`text-xs ${getHealthFactorColor(pos.healthFactor)}`}>
                              {getHealthFactorStatus(pos.healthFactor)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <div className="text-xs text-white/30 mb-2">Supplied</div>
                          {pos.suppliedAssets.map(asset => (
                            <div key={asset.symbol} className="flex justify-between text-sm mb-1">
                              <span>{asset.icon} {asset.symbol}</span>
                              <span className="text-green-400">{asset.amount.toFixed(2)} (${asset.valueUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })})</span>
                            </div>
                          ))}
                        </div>
                        <div>
                          <div className="text-xs text-white/30 mb-2">Borrowed</div>
                          {pos.borrowedAssets.map(asset => (
                            <div key={asset.symbol} className="flex justify-between text-sm mb-1">
                              <span>{asset.icon} {asset.symbol}</span>
                              <span className="text-orange-400">{asset.amount.toFixed(2)} (${asset.valueUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })})</span>
                            </div>
                          ))}
                        </div>
                        <div>
                          <div className="text-xs text-white/30 mb-2">Details</div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-white/40">Liquidation Price</span>
                              <span className="text-red-400">${liqPrice.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white/40">Net APY</span>
                              <span className="text-green-400">{pos.netAPY}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white/40">Liq. Threshold</span>
                              <span>{(pos.liquidationThreshold * 100).toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Health Factor Bar */}
                      <div className="mt-4">
                        <div className="flex justify-between text-xs text-white/30 mb-1">
                          <span>1.0 (Liquidation)</span>
                          <span>3.0+ (Safe)</span>
                        </div>
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              pos.healthFactor >= 2 ? 'bg-green-400' : pos.healthFactor >= 1.5 ? 'bg-emerald-400' : pos.healthFactor >= 1.2 ? 'bg-yellow-400' : 'bg-red-400'
                            }`}
                            style={{ width: `${Math.min(100, (pos.healthFactor / 3) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Alerts Tab */}
            {activeTab === 'alerts' && (
              <div className="space-y-6">
                <div className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                  <h3 className="font-semibold mb-4">🔔 Create Liquidation Alert</h3>
                  <p className="text-xs text-white/40 mb-4">Get notified when any position&apos;s health factor drops below your threshold.</p>
                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <label className="text-xs text-white/40 mb-1 block">Alert when HF below</label>
                      <input
                        type="number"
                        step="0.01"
                        value={alertHF}
                        onChange={e => setAlertHF(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div className="flex gap-2">
                      {positions.map(pos => (
                        <button
                          key={pos.id}
                          onClick={() => handleCreateAlert(pos)}
                          className="px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-xs text-yellow-400 hover:bg-yellow-500/20 transition-all"
                        >
                          {getProtocolIcon(pos.protocol)} {pos.protocolDisplayName}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Active Alerts ({alerts.length})</h3>
                  {alerts.length === 0 ? (
                    <div className="text-center py-8 text-white/30">
                      <span className="text-4xl block mb-3">🔕</span>
                      No liquidation alerts set. Create one above to protect your positions.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {alerts.map(alert => (
                        <div key={alert.id} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                          <div className="flex items-center gap-3">
                            <span className={`w-2 h-2 rounded-full ${alert.status === 'active' ? 'bg-green-400' : 'bg-yellow-400'}`} />
                            <div>
                              <span className="font-medium text-sm">{alert.protocol} — {alert.chainName}</span>
                              <div className="text-xs text-white/40">Alert when HF &lt; {alert.threshold} (current: {alert.healthFactor.toFixed(3)})</div>
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            alert.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
                          }`}>
                            {alert.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Auto-Repay Tab */}
            {activeTab === 'auto-repay' && (
              <div className="space-y-6">
                <div className="p-5 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-2xl">
                  <h3 className="font-semibold mb-2">🔄 Auto-Repay Configuration</h3>
                  <p className="text-xs text-white/40 mb-4">Automatically repay debt when health factor drops to protect against liquidation.</p>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-xs text-white/40 mb-1 block">Target Health Factor</label>
                      <input
                        type="number"
                        step="0.01"
                        value={repayHF}
                        onChange={e => setRepayHF(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                      />
                      <span className="text-xs text-white/30 mt-1">Auto-repay triggers when HF drops below this</span>
                    </div>
                    <div>
                      <label className="text-xs text-white/40 mb-1 block">Repay Asset</label>
                      <select
                        value={repayAsset}
                        onChange={e => setRepayAsset(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                      >
                        <option value="USDC">USDC</option>
                        <option value="USDT">USDT</option>
                        <option value="DAI">DAI</option>
                        <option value="ETH">ETH</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-white/40 mb-1 block">Max Repay Amount</label>
                      <input
                        type="number"
                        value={repayMax}
                        onChange={e => setRepayMax(e.target.value)}
                        placeholder="e.g. 5000"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/20"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-white/40 mb-1 block">Source</label>
                      <select
                        value={repaySource}
                        onChange={e => setRepaySource(e.target.value as 'wallet' | 'yield' | 'reserve')}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                      >
                        <option value="wallet">Wallet Balance</option>
                        <option value="yield">Yield Reserves</option>
                        <option value="reserve">Stablecoin Reserve</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {positions.map(pos => (
                      <button
                        key={pos.id}
                        onClick={() => handleCreateAutoRepay(pos.id)}
                        disabled={!repayMax}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-sm font-semibold hover:from-purple-500 hover:to-blue-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Enable for {pos.protocolDisplayName}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-yellow-400/60 mt-3">⚠️ Auto-repay requires wallet connection and token approval. This creates a pending config only.</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Auto-Repay Configs ({autoRepayConfigs.length})</h3>
                  {autoRepayConfigs.length === 0 ? (
                    <div className="text-center py-8 text-white/30">
                      <span className="text-4xl block mb-3">🔄</span>
                      No auto-repay configs. Set one up above to protect against liquidation.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {autoRepayConfigs.map(config => (
                        <div key={config.id} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                          <div>
                            <span className="font-medium text-sm">Position: {config.positionId.slice(0, 16)}...</span>
                            <div className="text-xs text-white/40">
                              Trigger HF &lt; {config.targetHealthFactor} · Max {config.maxRepayAmount} {config.repayAsset} · Source: {config.source}
                            </div>
                          </div>
                          <button
                            onClick={() => { toggleAutoRepay(config.id); refreshState() }}
                            className={`px-3 py-1 rounded-lg text-xs ${
                              config.enabled ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-white/30'
                            }`}
                          >
                            {config.enabled ? 'ACTIVE' : 'PAUSED'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Yield Tab */}
            {activeTab === 'yield' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">🌾 Yield Optimization Suggestions</h3>
                {yieldSuggestions.length === 0 ? (
                  <div className="text-center py-8 text-white/30">
                    <span className="text-4xl block mb-3">✨</span>
                    Your positions are already well-optimized! Check back later for new opportunities.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {yieldSuggestions.map((sug, i) => (
                      <div key={i} className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl hover:border-green-500/20 transition-all">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">📈</span>
                            <div>
                              <h4 className="font-medium">{sug.protocol} — {sug.asset}</h4>
                              <span className="text-xs text-white/40">{sug.chain}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-green-400 font-bold">{sug.improvement}</div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              sug.risk === 'low' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                              sug.risk === 'medium' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                              'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                              {sug.risk} risk
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-white/50">{sug.description}</p>
                        <div className="flex gap-4 mt-3 text-xs text-white/30">
                          <span>Current: {sug.currentAPY}% APY</span>
                          <span>→</span>
                          <span className="text-green-400">Suggested: {sug.suggestedAPY}% APY</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!loading && positions.length === 0 && !error && (
          <div className="text-center py-16 text-white/30">
            <span className="text-6xl block mb-4">🏦</span>
            <p className="text-lg mb-2">Enter a wallet address to scan DeFi positions</p>
            <p className="text-sm">We&apos;ll check Aave, Compound, and other protocols for health factor risks.</p>
          </div>
        )}
      </div>
    </main>
  )
}
