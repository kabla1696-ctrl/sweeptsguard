'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getExplorerUrl } from '@/lib/validation'
import {
  requestNotificationPermission,
  getNotificationPermission,
  getPreferences,
  savePreferences,
  startNotificationPolling,
  sendNotification,
  NotificationTemplates,
  type NotificationPreferences,
} from '@/lib/notifications'

interface MonitorStatus {
  running: boolean
  address: string
  chains: number[]
  alerts: { type: string; message: string; timestamp: number; chainName: string; amount?: string; asset?: string }[]
  sweeps: { success: boolean; chainId?: number; chainName: string; asset: string; amount: string; txHash?: string; error?: string }[]
}

function DashboardContent() {
  const searchParams = useSearchParams()
  const addressParam = searchParams.get('address')

  const [address, setAddress] = useState(addressParam || '')
  const [safeAddress, setSafeAddress] = useState('')
  const [privateKey, setPrivateKey] = useState('')
  const [telegramBotToken, setTelegramBotToken] = useState('')
  const [telegramChatId, setTelegramChatId] = useState('')
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState('')
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('')
  const [monitoring, setMonitoring] = useState(false)
  const [status, setStatus] = useState<MonitorStatus | null>(null)
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [activeTab, setActiveTab] = useState<'setup' | 'alerts' | 'sweeps' | 'notifications'>('setup')
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>('default')
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(getPreferences())
  const [setupError, setSetupError] = useState('')
  const [starting, setStarting] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  // Cleanup: abort in-flight fetches and clear keys on unmount
  useEffect(() => {
    setNotifPermission(getNotificationPermission())
    return () => {
      abortRef.current?.abort()
      setPrivateKey('')
    }
  }, [])

  const pollStatus = useCallback(async (signal?: AbortSignal) => {
    if (!address) return
    try {
      const res = await fetch(`/api/monitor?address=${address}`, { signal })
      const data = await res.json()
      setStatus(data)
      if (data.running) setMonitoring(true)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      // Status fetch failed - will retry on next interval
    }
  }, [address])

  const startMonitoring = useCallback(async () => {
    if (!address || !safeAddress || !privateKey) return

    // Validate addresses
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
      setSetupError('Invalid compromised wallet address')
      return
    }
    if (!/^0x[0-9a-fA-F]{40}$/.test(safeAddress)) {
      setSetupError('Invalid safe wallet address')
      return
    }
    if (safeAddress.toLowerCase() === address.toLowerCase()) {
      setSetupError('Safe wallet must be different from compromised wallet!')
      return
    }
    setSetupError('')

    setStarting(true)
    try {
      const res = await fetch('/api/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          address,
          safeAddress,
          privateKey,
          chainIds: [1, 8453, 56, 42161, 137, 10],
          telegramBotToken: telegramBotToken || undefined,
          telegramChatId: telegramChatId || undefined,
          discordWebhookUrl: discordWebhookUrl || undefined,
          slackWebhookUrl: slackWebhookUrl || undefined
        })
      })
      const data = await res.json()
      if (data.success) {
        setMonitoring(true)
        pollStatus()

        // Start notification polling if permission granted
        if (notifPermission === 'granted') {
          startNotificationPolling(address, safeAddress)
          sendNotification(NotificationTemplates.newFunds('monitoring', 'active', 'Protection'))
        }
      }
    } catch (err) {
      setSetupError('Failed to start monitoring. Please try again.')
    } finally {
      setStarting(false)
    }
  }, [address, safeAddress, privateKey, telegramBotToken, telegramChatId, discordWebhookUrl, slackWebhookUrl, pollStatus, notifPermission])

  const stopMonitoring = useCallback(async () => {
    try {
      await fetch('/api/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop', address })
      })
      setMonitoring(false)
      // BUG FIX: Clear private key from state when stopping
      setPrivateKey('')
    } catch (err) {
      // Stop monitoring failed - UI state already updated
    }
  }, [address])

  const enableNotifications = async () => {
    const result = await requestNotificationPermission()
    setNotifPermission(result)
    if (result === 'granted' && monitoring) {
      startNotificationPolling(address, safeAddress)
    }
  }

  const updateNotifPrefs = (prefs: NotificationPreferences) => {
    setNotifPrefs(prefs)
    savePreferences(prefs)
  }

  useEffect(() => {
    const controller = new AbortController()
    abortRef.current = controller
    if (address) pollStatus(controller.signal)
    const interval = setInterval(() => pollStatus(controller.signal), 15000)
    return () => {
      clearInterval(interval)
      controller.abort()
    }
  }, [address, pollStatus])

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Nav */}
      <nav className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
            SweepGuard
          </span>
        </Link>
        <div className="flex gap-4">
          <Link href="/scan" className="text-sm text-white/50 hover:text-white transition-colors">Scan</Link>
          <Link href="/wallets" className="text-sm text-white/50 hover:text-white transition-colors">Wallets</Link>
          <Link href="/tracker" className="text-sm text-white/50 hover:text-white transition-colors">Tracker</Link>
          <Link href="/history" className="text-sm text-white/50 hover:text-white transition-colors">History</Link>
          <Link href="/batch" className="text-sm text-white/50 hover:text-white transition-colors">⚡ Batch</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Protection Dashboard</h1>
        <p className="text-white/40 mb-8">Set up auto-sweep monitoring for your compromised wallet</p>

        {/* Quick Start Guide */}
        {!monitoring && (
          <div className="p-5 bg-blue-500/10 border border-blue-500/20 rounded-2xl mb-8">
            <h3 className="text-blue-400 font-semibold mb-3">📖 How It Works</h3>
            <ol className="space-y-2 text-white/60 text-sm">
              <li><span className="text-blue-400 font-bold mr-2">1.</span> Enter your <span className="text-white font-medium">compromised wallet</span> address — the wallet whose keys may have been exposed</li>
              <li><span className="text-blue-400 font-bold mr-2">2.</span> Set a <span className="text-white font-medium">safe wallet</span> — a different wallet you control where funds will be swept to</li>
              <li><span className="text-blue-400 font-bold mr-2">3.</span> Provide the <span className="text-white font-medium">private key</span> of the compromised wallet (needed to sign sweep transactions)</li>
              <li><span className="text-blue-400 font-bold mr-2">4.</span> Hit <span className="text-white font-medium">Start Protection</span> — we'll monitor all chains and auto-sweep any incoming funds to safety</li>
            </ol>
          </div>
        )}

        {/* Status Bar */}
        {monitoring && (
          <div className="p-5 bg-green-500/10 border border-green-500/20 rounded-2xl mb-8">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 font-semibold">Active Protection</span>
            </div>
            <p className="text-white/40 text-sm mt-2">
              Monitoring {address.slice(0, 6)}...{address.slice(-4)} across all chains
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          {(['setup', 'alerts', 'sweeps', 'notifications'] as const).map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              aria-label={`${tab.charAt(0).toUpperCase() + tab.slice(1)} tab`}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-green-600 text-white'
                  : 'bg-white/[0.05] text-white/50 hover:text-white'
              }`}
            >
              {tab === 'setup' ? '⚙️ Setup' : tab === 'alerts' ? '🚨 Alerts' : tab === 'sweeps' ? '⚡ Sweeps' : '🔔 Notifications'}
              {tab === 'alerts' && status?.alerts && status.alerts.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-red-500 rounded-full text-xs">
                  {status.alerts.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Setup Tab */}
        {activeTab === 'setup' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="compromised-wallet" className="text-xs text-white/30 uppercase tracking-wider mb-2 block">
                  Compromised Wallet
                </label>
                <input
                  id="compromised-wallet"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm font-mono"
                />
                <p className="text-white/20 text-xs mt-1">The wallet whose private key was compromised or leaked</p>
              </div>
              <div>
                <label htmlFor="safe-wallet" className="text-xs text-white/30 uppercase tracking-wider mb-2 block">
                  Safe Wallet (Sweep To)
                </label>
                <input
                  id="safe-wallet"
                  type="text"
                  value={safeAddress}
                  onChange={(e) => setSafeAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm font-mono"
                />
                <p className="text-white/20 text-xs mt-1">A secure wallet you own — rescued funds will be sent here</p>
              </div>
            </div>

            <div>
              <label htmlFor="private-key" className="text-xs text-white/30 uppercase tracking-wider mb-2 block">
                Private Key (for compromised wallet)
              </label>
              <p className="text-white/20 text-xs mb-2">⚠️ Required to sign sweep transactions. Only the compromised wallet's key — never share your safe wallet's key.</p>
              <div className="relative">
                <input
                  id="private-key"
                  type={showPrivateKey ? 'text' : 'password'}
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  placeholder="Private key of compromised wallet..."
                  className="w-full px-4 py-3 pr-20 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm font-mono"
                />
                <button
                  aria-label={showPrivateKey ? 'Hide private key' : 'Show private key'}
                  onClick={() => setShowPrivateKey(!showPrivateKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-xs"
                >
                  {showPrivateKey ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
              <h3 className="text-sm font-semibold mb-3 text-white/70">📢 Alert Channels (Optional)</h3>
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="tg-bot-token" className="text-xs text-white/30 mb-1 block">Telegram Bot Token</label>
                    <input
                      id="tg-bot-token"
                      type="text"
                      value={telegramBotToken}
                      onChange={(e) => setTelegramBotToken(e.target.value)}
                      placeholder="123456:ABC-DEF..."
                      className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label htmlFor="tg-chat-id" className="text-xs text-white/30 mb-1 block">Telegram Chat ID</label>
                    <input
                      id="tg-chat-id"
                      type="text"
                      value={telegramChatId}
                      onChange={(e) => setTelegramChatId(e.target.value)}
                      placeholder="-1001234567890"
                      className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="discord-webhook" className="text-xs text-white/30 mb-1 block">Discord Webhook URL</label>
                  <input
                    id="discord-webhook"
                    type="text"
                    value={discordWebhookUrl}
                    onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                    placeholder="https://discord.com/api/webhooks/..."
                    className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="slack-webhook" className="text-xs text-white/30 mb-1 block">Slack Webhook URL</label>
                  <input
                    id="slack-webhook"
                    type="text"
                    value={slackWebhookUrl}
                    onChange={(e) => setSlackWebhookUrl(e.target.value)}
                    placeholder="https://hooks.slack.com/services/..."
                    className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm font-mono"
                  />
                </div>
              </div>
              <p className="text-white/20 text-xs mt-2">
                Get instant alerts via Telegram, Discord, or Slack when funds are detected or swept.
              </p>
            </div>

            {setupError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                {setupError}
              </div>
            )}

            <div className="flex gap-4">
              {!monitoring ? (
                <button
                  onClick={startMonitoring}
                  disabled={!address || !safeAddress || !privateKey || starting}
                  aria-label="Start wallet protection"
                  className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold disabled:opacity-50 hover:from-green-500 hover:to-emerald-500 transition-all flex items-center gap-2"
                >
                  {starting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Starting...
                    </>
                  ) : (
                    '🛡️ Start Protection'
                  )}
                </button>
              ) : (
                <button
                  onClick={stopMonitoring}
                  aria-label="Stop monitoring"
                  className="px-8 py-3 bg-red-600/20 border border-red-500/30 rounded-xl font-semibold text-red-400 hover:bg-red-600/30 transition-all"
                >
                  Stop Monitoring
                </button>
              )}
              <button
                onClick={() => pollStatus()}
                aria-label="Refresh status"
                className="px-6 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl hover:bg-white/[0.08] transition-all"
              >
                🔄 Refresh
              </button>
            </div>
          </div>
        )}

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div>
            {status?.alerts && status.alerts.length > 0 ? (
              <div className="space-y-3">
                {status.alerts.map((alert, i) => (
                  <div key={i} className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-yellow-400 text-sm font-medium">
                          {alert.type === 'drainer_detected' ? '🚨' : '💰'} {alert.type}
                        </span>
                        <p className="text-white/60 text-sm mt-1">{alert.message}</p>
                        {alert.amount && (
                          <p className="text-green-400 text-sm mt-1">
                            {alert.amount} {alert.asset}
                          </p>
                        )}
                      </div>
                      <span className="text-white/20 text-xs">{alert.chainName}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-white/30">
                <p className="text-lg mb-2">No alerts yet</p>
                <p className="text-sm">Alerts will appear when balance changes are detected</p>
              </div>
            )}
          </div>
        )}

        {/* Sweeps Tab */}
        {activeTab === 'sweeps' && (
          <div>
            {status?.sweeps && status.sweeps.length > 0 ? (
              <div className="space-y-3">
                {status.sweeps.map((sweep, i) => (
                  <div key={i} className={`p-4 rounded-xl border ${
                    sweep.success
                      ? 'bg-green-500/5 border-green-500/20'
                      : 'bg-red-500/5 border-red-500/20'
                  }`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <span className={sweep.success ? 'text-green-400' : 'text-red-400'}>
                          {sweep.success ? '✅' : '❌'} {sweep.asset}
                        </span>
                        <span className="text-white/30 text-sm ml-2">{sweep.chainName}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm">{sweep.amount}</div>
                        {sweep.txHash && (
                          <a
                            href={getExplorerUrl(sweep.chainId || 1, sweep.txHash, 'tx')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-400/50 text-xs hover:text-green-400"
                          >
                            {sweep.txHash.slice(0, 10)}...
                          </a>
                        )}
                        {sweep.error && (
                          <div className="text-red-400/50 text-xs">{sweep.error}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-white/30">
                <p className="text-lg mb-2">No sweeps yet</p>
                <p className="text-sm">Sweeps will happen automatically when funds are detected</p>
              </div>
            )}
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            {/* Permission Status */}
            <div className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-xl">
              <h3 className="text-lg font-semibold mb-4">🔔 Browser Notifications</h3>
              {notifPermission === 'granted' ? (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                  <p className="text-green-400 font-medium">✅ Notifications enabled</p>
                  <p className="text-white/40 text-sm mt-1">You'll receive browser alerts for fund deposits, drainer activity, and recovery events.</p>
                </div>
              ) : notifPermission === 'denied' ? (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <p className="text-red-400 font-medium">❌ Notifications blocked</p>
                  <p className="text-white/40 text-sm mt-1">Please enable notifications in your browser settings to receive alerts.</p>
                </div>
              ) : (
                <div>
                  <p className="text-white/40 text-sm mb-4">Enable browser notifications to get instant alerts even when the tab is in the background.</p>
                  <button
                    onClick={enableNotifications}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl font-semibold hover:from-blue-500 hover:to-cyan-500 transition-all"
                  >
                    🔔 Enable Notifications
                  </button>
                </div>
              )}
            </div>

            {/* Notification Preferences */}
            {notifPermission === 'granted' && (
              <div className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                <h3 className="text-sm font-semibold mb-4 text-white/70">⚙️ Notification Preferences</h3>
                <div className="space-y-3">
                  {([
                    { key: 'drainerAlerts' as const, icon: '🚨', label: 'Drainer Activity', desc: 'Alert when known drainer interacts with your wallet' },
                    { key: 'fundAlerts' as const, icon: '💰', label: 'Fund Deposits', desc: 'Alert when new funds arrive on compromised wallet' },
                    { key: 'recoveryAlerts' as const, icon: '✅', label: 'Recovery Events', desc: 'Alert when funds are successfully recovered' },
                    { key: 'sweepAlerts' as const, icon: '⚡', label: 'Sweep Events', desc: 'Alert on auto-sweep success or failure' },
                    { key: 'nftAlerts' as const, icon: '🖼️', label: 'NFT Receipts', desc: 'Alert when NFTs arrive on compromised wallet' },
                    { key: 'sound' as const, icon: '🔊', label: 'Sound', desc: 'Play sound with notifications' },
                  ]).map(({ key, icon, label, desc }) => (
                    <label key={key} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg cursor-pointer hover:bg-white/[0.04]">
                      <div>
                        <span className="text-sm">{icon} {label}</span>
                        <p className="text-white/30 text-xs mt-0.5">{desc}</p>
                      </div>
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={notifPrefs[key]}
                          onChange={(e) => updateNotifPrefs({ ...notifPrefs, [key]: e.target.checked })}
                          className="sr-only"
                        />
                        <div className={`w-10 h-6 rounded-full transition-colors ${notifPrefs[key] ? 'bg-green-500' : 'bg-white/10'}`}>
                          <div className={`w-4 h-4 rounded-full bg-white mt-1 transition-transform ${notifPrefs[key] ? 'translate-x-5' : 'translate-x-1'}`} />
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Links */}
            <div className="flex gap-3">
              <Link
                href="/batch"
                className="px-4 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg text-sm hover:bg-white/[0.08] transition-all"
              >
                ⚡ Batch Operations
              </Link>
              <Link
                href="/recover"
                className="px-4 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg text-sm hover:bg-white/[0.08] transition-all"
              >
                💰 Fund Recovery
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white/30">Loading...</div>}>
      <DashboardContent />
    </Suspense>
  )
}
