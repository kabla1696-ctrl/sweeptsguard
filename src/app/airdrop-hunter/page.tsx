'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  getAllAirdrops,
  checkEligibility,
  getClaimGuide,
  getPastAirdrops,
  getNotifications,
  addNotification,
  markNotificationRead,
  getCategoryIcon,
  getStatusColor,
  formatValue,
  getDaysUntil,
  type Airdrop,
  type EligibilityCheck,
  type ClaimGuide,
  type PastAirdrop,
  type AirdropNotification,
} from '@/lib/airdropHunter'

type Tab = 'discover' | 'eligible' | 'calendar' | 'history' | 'notifications'

export default function AirdropHunterPage() {
  const [activeTab, setActiveTab] = useState<Tab>('discover')
  const [airdrops] = useState<Airdrop[]>(getAllAirdrops())
  const [address, setAddress] = useState('')
  const [eligibilityResults, setEligibilityResults] = useState<Map<string, EligibilityCheck>>(new Map())
  const [selectedAirdrop, setSelectedAirdrop] = useState<Airdrop | null>(null)
  const [claimGuide, setClaimGuide] = useState<ClaimGuide | null>(null)
  const [pastAirdrops, setPastAirdrops] = useState<PastAirdrop[]>([])
  const [notifications, setNotifications] = useState<AirdropNotification[]>([])
  const [scanning, setScanning] = useState(false)
  const [showGuide, setShowGuide] = useState(true)
  const [filterCategory, setFilterCategory] = useState<string>('all')

  const refreshNotifs = useCallback(() => {
    setNotifications(getNotifications())
  }, [])

  useEffect(() => {
    refreshNotifs()
  }, [refreshNotifs])

  const scanEligibility = useCallback(async () => {
    if (!address.trim()) return
    setScanning(true)
    const results = new Map<string, EligibilityCheck>()
    for (const airdrop of airdrops) {
      const check = checkEligibility(address.trim(), airdrop.id)
      results.set(airdrop.id, check)
      if (check.eligible) {
        addNotification(airdrop.id, 'new_eligible', `You're eligible for ${airdrop.project} (${airdrop.token}) airdrop! Estimated: $${check.estimatedValueUSD}`)
      }
    }
    setEligibilityResults(results)
    setScanning(false)
    refreshNotifs()
  }, [address, airdrops, refreshNotifs])

  const openClaimGuide = (airdrop: Airdrop) => {
    setSelectedAirdrop(airdrop)
    setClaimGuide(getClaimGuide(airdrop.id))
  }

  const loadPastAirdrops = useCallback(() => {
    if (address.trim()) {
      setPastAirdrops(getPastAirdrops(address.trim()))
    }
  }, [address])

  useEffect(() => {
    if (activeTab === 'history' && address.trim()) {
      loadPastAirdrops()
    }
  }, [activeTab, address, loadPastAirdrops])

  const filteredAirdrops = filterCategory === 'all'
    ? airdrops
    : airdrops.filter(a => a.category === filterCategory)

  const eligibleCount = Array.from(eligibilityResults.values()).filter(r => r.eligible).length
  const totalEligibleValue = Array.from(eligibilityResults.values())
    .filter(r => r.eligible)
    .reduce((s, r) => s + r.estimatedValueUSD, 0)

  const categories = ['all', 'defi', 'layer2', 'nft', 'gaming', 'infrastructure', 'social']

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <nav className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">SweepGuard</span>
        </Link>
        <div className="flex gap-4">
          <Link href="/airdrop" className="text-sm text-white/50 hover:text-white">Airdrops</Link>
          <Link href="/airdrop-hunter" className="text-sm text-green-400 font-medium">Airdrop Hunter Pro</Link>
          <Link href="/dashboard" className="text-sm text-white/50 hover:text-white">Dashboard</Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">🎁 Airdrop Hunter Pro</h1>
        <p className="text-white/40 mb-8">Auto-detect eligible airdrops, claim guides, value estimates, and notifications</p>

        {/* Guide */}
        {showGuide && (
          <div className="mb-8 p-5 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-purple-400">📖 How Airdrop Hunting Works</h2>
              <button onClick={() => setShowGuide(false)} className="text-white/30 hover:text-white/60 text-xs">Hide ✕</button>
            </div>
            <div className="grid md:grid-cols-3 gap-4 text-xs text-white/50">
              <div>
                <p className="text-white/70 font-medium mb-1">🔍 Auto-Detection</p>
                <p>Enter your wallet to scan all known airdrops. We check your on-chain activity against eligibility criteria.</p>
              </div>
              <div>
                <p className="text-white/70 font-medium mb-1">📋 Claim Guides</p>
                <p>Step-by-step guides for each airdrop with gas estimates and deadlines so you never miss a claim.</p>
              </div>
              <div>
                <p className="text-white/70 font-medium mb-1">🔔 Notifications</p>
                <p>Get notified when new airdrops match your activity or when deadlines are approaching.</p>
              </div>
            </div>
          </div>
        )}

        {/* Address Input */}
        <div className="mb-8">
          <div className="flex gap-3">
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Enter wallet address to scan for airdrops (0x...)"
              className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 font-mono focus:border-purple-500/30 focus:outline-none transition-all"
            />
            <button
              onClick={scanEligibility}
              disabled={scanning || !address.trim()}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-sm font-semibold hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {scanning ? 'Scanning...' : '🔍 Scan All'}
            </button>
          </div>
        </div>

        {/* Eligibility Summary */}
        {eligibilityResults.size > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
              <div className="text-xs text-white/40 mb-1">Eligible Airdrops</div>
              <div className="text-2xl font-bold text-purple-400">{eligibleCount}</div>
            </div>
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
              <div className="text-xs text-white/40 mb-1">Total Est. Value</div>
              <div className="text-2xl font-bold text-green-400">${totalEligibleValue.toLocaleString()}</div>
            </div>
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <div className="text-xs text-white/40 mb-1">Airdrops Scanned</div>
              <div className="text-2xl font-bold">{airdrops.length}</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
          {[
            { id: 'discover' as Tab, label: '🌐 Discover' },
            { id: 'eligible' as Tab, label: '✅ Eligible', count: eligibleCount },
            { id: 'calendar' as Tab, label: '📅 Calendar' },
            { id: 'history' as Tab, label: '📜 History' },
            { id: 'notifications' as Tab, label: '🔔 Alerts', count: notifications.filter(n => !n.read).length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'text-white/40 hover:text-white/60 border border-transparent'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="bg-purple-500/30 text-purple-300 text-xs px-1.5 py-0.5 rounded-full">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Discover Tab */}
        {activeTab === 'discover' && (
          <div className="space-y-6">
            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all ${
                    filterCategory === cat
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'text-white/30 hover:text-white/50'
                  }`}
                >
                  {cat === 'all' ? '🌐 All' : `${getCategoryIcon(cat as Airdrop['category'])} ${cat}`}
                </button>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {filteredAirdrops.map(airdrop => {
                const eligibility = eligibilityResults.get(airdrop.id)
                return (
                  <div key={airdrop.id} className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl hover:border-purple-500/20 transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{airdrop.icon}</span>
                        <div>
                          <h3 className="font-semibold">{airdrop.project}</h3>
                          <span className="text-xs text-white/40">{airdrop.chain} · {getCategoryIcon(airdrop.category)} {airdrop.category}</span>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(airdrop.status)}`}>
                        {airdrop.status}
                      </span>
                    </div>

                    <p className="text-sm text-white/50 mb-3">{airdrop.description}</p>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="p-2 bg-white/[0.03] rounded-lg">
                        <div className="text-xs text-white/30">Token</div>
                        <div className="font-medium text-sm">{airdrop.token}</div>
                      </div>
                      <div className="p-2 bg-white/[0.03] rounded-lg">
                        <div className="text-xs text-white/30">Est. Value</div>
                        <div className="font-medium text-sm text-green-400">${airdrop.estimatedValue.toLocaleString()}</div>
                      </div>
                      <div className="p-2 bg-white/[0.03] rounded-lg">
                        <div className="text-xs text-white/30">Total Pool</div>
                        <div className="font-medium text-sm">{formatValue(airdrop.totalValue)}</div>
                      </div>
                      <div className="p-2 bg-white/[0.03] rounded-lg">
                        <div className="text-xs text-white/30">
                          {airdrop.claimDeadline ? 'Deadline' : 'Snapshot'}
                        </div>
                        <div className="font-medium text-sm">
                          {airdrop.claimDeadline
                            ? `${getDaysUntil(airdrop.claimDeadline)} days`
                            : airdrop.snapshotDate
                              ? new Date(airdrop.snapshotDate).toLocaleDateString()
                              : 'TBD'
                          }
                        </div>
                      </div>
                    </div>

                    {/* Eligibility Result */}
                    {eligibility && (
                      <div className={`p-3 rounded-xl mb-3 ${
                        eligibility.eligible
                          ? 'bg-green-500/10 border border-green-500/20'
                          : 'bg-red-500/10 border border-red-500/20'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium ${eligibility.eligible ? 'text-green-400' : 'text-red-400'}`}>
                            {eligibility.eligible ? '✅ Eligible' : '❌ Not Eligible'}
                          </span>
                          {eligibility.eligible && (
                            <span className="text-green-400 text-sm font-bold">~${eligibility.estimatedValueUSD.toLocaleString()}</span>
                          )}
                        </div>
                        {eligibility.eligible && eligibility.rank && (
                          <div className="text-xs text-white/40 mt-1">Rank #{eligibility.rank.toLocaleString()} of {eligibility.totalEligible?.toLocaleString()}</div>
                        )}
                      </div>
                    )}

                    {/* Eligibility Criteria */}
                    {eligibility && (
                      <div className="space-y-1 mb-3">
                        {eligibility.criteria.map((c, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className={c.met ? 'text-green-400' : 'text-red-400'}>{c.met ? '✓' : '✗'}</span>
                            <span className="text-white/50">{c.name}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => openClaimGuide(airdrop)}
                        className="flex-1 px-3 py-2 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs text-purple-400 hover:bg-purple-500/20 transition-all"
                      >
                        📋 Claim Guide
                      </button>
                      <a
                        href={airdrop.claimUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-xl text-xs text-green-400 hover:bg-green-500/20 transition-all text-center"
                      >
                        🔗 Claim Now
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Eligible Tab */}
        {activeTab === 'eligible' && (
          <div className="space-y-4">
            {eligibleCount === 0 ? (
              <div className="text-center py-16 text-white/30">
                <span className="text-6xl block mb-4">🔍</span>
                <p className="text-lg mb-2">No eligible airdrops found yet</p>
                <p className="text-sm">Enter your wallet address and click &quot;Scan All&quot; to check eligibility.</p>
              </div>
            ) : (
              Array.from(eligibilityResults.entries())
                .filter(([_, check]) => check.eligible)
                .map(([id, check]) => {
                  const airdrop = airdrops.find(a => a.id === id)
                  if (!airdrop) return null
                  return (
                    <div key={id} className="p-5 bg-green-500/5 border border-green-500/10 rounded-2xl">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{airdrop.icon}</span>
                          <div>
                            <h3 className="font-semibold">{airdrop.project} ({airdrop.token})</h3>
                            <span className="text-xs text-white/40">{airdrop.chain}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-green-400 font-bold text-lg">~${check.estimatedValueUSD.toLocaleString()}</div>
                          <div className="text-xs text-white/40">{check.estimatedTokens.toLocaleString()} tokens</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openClaimGuide(airdrop)}
                          className="px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs text-purple-400 hover:bg-purple-500/20 transition-all"
                        >
                          📋 Claim Guide
                        </button>
                        <a
                          href={airdrop.claimUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-xl text-xs text-green-400 hover:bg-green-500/20 transition-all"
                        >
                          🔗 Claim Now
                        </a>
                      </div>
                    </div>
                  )
                })
            )}
          </div>
        )}

        {/* Calendar Tab */}
        {activeTab === 'calendar' && (
          <div className="space-y-4">
            {[...airdrops]
              .sort((a, b) => {
                const dateA = a.claimDeadline || a.snapshotDate || '9999'
                const dateB = b.claimDeadline || b.snapshotDate || '9999'
                return new Date(dateA).getTime() - new Date(dateB).getTime()
              })
              .map(airdrop => {
                const date = airdrop.claimDeadline || airdrop.snapshotDate
                const daysLeft = date ? getDaysUntil(date) : null
                const isUrgent = daysLeft !== null && daysLeft <= 14 && daysLeft >= 0
                return (
                  <div key={airdrop.id} className={`p-4 rounded-xl border ${
                    isUrgent ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-white/[0.02] border-white/[0.05]'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{airdrop.icon}</span>
                        <div>
                          <h3 className="font-medium text-sm">{airdrop.project}</h3>
                          <span className="text-xs text-white/40">{airdrop.token} · {airdrop.chain}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        {date && (
                          <>
                            <div className={`text-sm font-medium ${isUrgent ? 'text-yellow-400' : 'text-white/60'}`}>
                              {airdrop.claimDeadline ? `Claim by: ${new Date(date).toLocaleDateString()}` : `Snapshot: ${new Date(date).toLocaleDateString()}`}
                            </div>
                            {daysLeft !== null && daysLeft >= 0 && (
                              <div className={`text-xs ${isUrgent ? 'text-yellow-400' : 'text-white/30'}`}>
                                {daysLeft === 0 ? '⏰ Today!' : `${daysLeft} days left`}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    {isUrgent && (
                      <div className="mt-2 text-xs text-yellow-400/80">⚠️ Deadline approaching! Don&apos;t miss this claim.</div>
                    )}
                  </div>
                )
              })}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {!address.trim() ? (
              <div className="text-center py-16 text-white/30">
                <span className="text-6xl block mb-4">📜</span>
                <p className="text-lg mb-2">Enter your wallet to see past airdrops</p>
                <p className="text-sm">We&apos;ll show you a history of airdrops you&apos;ve claimed.</p>
              </div>
            ) : pastAirdrops.length === 0 ? (
              <div className="text-center py-16 text-white/30">
                <span className="text-6xl block mb-4">📭</span>
                <p className="text-lg mb-2">No past airdrops found</p>
                <p className="text-sm">This wallet hasn&apos;t claimed any tracked airdrops yet.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl text-center">
                    <div className="text-xs text-white/40 mb-1">Total Claimed</div>
                    <div className="text-xl font-bold text-purple-400">{pastAirdrops.length}</div>
                  </div>
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-center">
                    <div className="text-xs text-white/40 mb-1">Value at Claim</div>
                    <div className="text-xl font-bold text-green-400">${pastAirdrops.reduce((s, a) => s + a.valueAtClaim, 0).toLocaleString()}</div>
                  </div>
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-center">
                    <div className="text-xs text-white/40 mb-1">Current Value</div>
                    <div className="text-xl font-bold text-blue-400">${pastAirdrops.reduce((s, a) => s + a.valueNow, 0).toLocaleString()}</div>
                  </div>
                </div>

                {pastAirdrops.map((past, i) => (
                  <div key={i} className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="font-medium">{past.project} ({past.token})</h3>
                        <span className="text-xs text-white/40">{past.chain} · {past.claimDate}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm">{past.tokensReceived.toLocaleString()} tokens</div>
                        <div className={`text-xs ${past.valueNow > past.valueAtClaim ? 'text-green-400' : 'text-red-400'}`}>
                          {past.valueNow > past.valueAtClaim ? '📈' : '📉'} ${past.valueNow.toLocaleString()} (was ${past.valueAtClaim.toLocaleString()})
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-white/20 font-mono truncate">TX: {past.txHash}</div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-3">
            {notifications.length === 0 ? (
              <div className="text-center py-16 text-white/30">
                <span className="text-6xl block mb-4">🔔</span>
                <p className="text-lg mb-2">No notifications yet</p>
                <p className="text-sm">Scan your wallet to get notified about eligible airdrops.</p>
              </div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  onClick={() => { markNotificationRead(notif.id); refreshNotifs() }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    notif.read
                      ? 'bg-white/[0.01] border-white/[0.03]'
                      : 'bg-purple-500/5 border-purple-500/15'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">
                      {notif.type === 'new_eligible' ? '🎉' : notif.type === 'deadline_approaching' ? '⏰' : notif.type === 'claim_open' ? '📢' : '📊'}
                    </span>
                    <div className="flex-1">
                      <p className={`text-sm ${notif.read ? 'text-white/50' : 'text-white'}`}>{notif.message}</p>
                      <span className="text-xs text-white/20">{new Date(notif.createdAt).toLocaleString()}</span>
                    </div>
                    {!notif.read && <span className="w-2 h-2 bg-purple-400 rounded-full mt-2" />}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Claim Guide Modal */}
        {selectedAirdrop && claimGuide && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setSelectedAirdrop(null); setClaimGuide(null) }}>
            <div className="bg-[#12121a] border border-white/10 rounded-2xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">{selectedAirdrop.icon} {selectedAirdrop.project} Claim Guide</h2>
                <button onClick={() => { setSelectedAirdrop(null); setClaimGuide(null) }} className="text-white/30 hover:text-white text-xl">✕</button>
              </div>

              <div className="flex gap-3 mb-4 text-xs">
                <span className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400">{claimGuide.difficulty}</span>
                <span className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-white/50">⏱ {claimGuide.timeEstimate}</span>
                <span className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-white/50">⛽ {claimGuide.totalEstimatedGas}</span>
              </div>

              <div className="space-y-4">
                {claimGuide.steps.map(step => (
                  <div key={step.step} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 font-bold text-sm">
                      {step.step}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm mb-1">{step.title}</h4>
                      <p className="text-xs text-white/50 mb-2">{step.description}</p>
                      {step.estimatedGas && (
                        <span className="text-xs text-white/30">⛽ Est. gas: {step.estimatedGas}</span>
                      )}
                      {step.warning && (
                        <div className="mt-1 text-xs text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded-lg">{step.warning}</div>
                      )}
                      {step.url && (
                        <a href={step.url} target="_blank" rel="noopener noreferrer" className="inline-block mt-1 text-xs text-purple-400 hover:underline">
                          Open {step.action} page →
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <a
                href={selectedAirdrop.claimUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block mt-6 w-full text-center px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-sm font-semibold hover:from-purple-500 hover:to-pink-500 transition-all"
              >
                🚀 Go to Claim Page
              </a>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
