'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

// Map chainId to explorer hostname
function getExplorerForChain(chainId: number): string {
  const explorers: Record<number, string> = {
    1: 'etherscan.io',
    8453: 'basescan.org',
    56: 'bscscan.com',
    42161: 'arbiscan.io',
    137: 'polygonscan.com',
    10: 'optimistic.etherscan.io',
    43114: 'snowtrace.io',
    250: 'ftmscan.com',
    25: 'cronoscan.com',
    81457: 'blastscan.io',
    7777777: 'zorascan.xyz',
    1101: 'zkevm.polygonscan.com',
    169: 'pacific-explorer.manta.network',
    324: 'explorer.zksync.io',
    59144: 'lineascan.build',
    5000: 'mantlescan.xyz',
    34443: 'explorer.mode.network',
    534352: 'scrollscan.com',
    100: 'gnosisscan.io',
    7000: 'zetascan.com',
    1625: 'explorer.gravity.xyz',
    1116: 'scan.coredao.org',
    1329: 'seiscan.io',
    80094: 'berascan.com',
    57073: 'explorer.inkonchain.com',
    196: 'www.oklink.com/xlayer',
    43111: 'explorer.hemi.xyz',
    8217: 'kaiascan.io',
    1868: 'soneium.blockscout.com',
    2818: 'explorer.morphl2.io',
    1923: 'swellchainscan.io',
    10143: 'testnet.monadexplorer.com',
  }
  return explorers[chainId] || 'etherscan.io'
}

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
  const [activeTab, setActiveTab] = useState<'setup' | 'alerts' | 'sweeps'>('setup')

  const startMonitoring = useCallback(async () => {
    if (!address || !safeAddress || !privateKey) return

    // Validate addresses
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
      alert('Invalid compromised wallet address')
      return
    }
    if (!/^0x[0-9a-fA-F]{40}$/.test(safeAddress)) {
      alert('Invalid safe wallet address')
      return
    }
    if (safeAddress.toLowerCase() === address.toLowerCase()) {
      alert('Safe wallet must be different from compromised wallet!')
      return
    }

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
      }
    } catch (err) {
      console.error('Failed to start monitoring:', err)
    }
  }, [address, safeAddress, privateKey, telegramBotToken, telegramChatId, discordWebhookUrl, slackWebhookUrl])

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
      console.error('Failed to stop monitoring:', err)
    }
  }, [address])

  const pollStatus = useCallback(async () => {
    if (!address) return
    try {
      const res = await fetch(`/api/monitor?address=${address}`)
      const data = await res.json()
      setStatus(data)
      if (data.running) setMonitoring(true)
    } catch (err) {
      console.error('Failed to fetch status:', err)
    }
  }, [address])

  useEffect(() => {
    if (address) pollStatus()
    const interval = setInterval(pollStatus, 15000) // BUG FIX: 5s → 15s
    return () => clearInterval(interval)
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
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Protection Dashboard</h1>
        <p className="text-white/40 mb-8">Set up auto-sweep monitoring for your compromised wallet</p>

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
          {(['setup', 'alerts', 'sweeps'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-green-600 text-white'
                  : 'bg-white/[0.05] text-white/50 hover:text-white'
              }`}
            >
              {tab === 'setup' ? '⚙️ Setup' : tab === 'alerts' ? '🚨 Alerts' : '⚡ Sweeps'}
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
                <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">
                  Compromised Wallet
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">
                  Safe Wallet (Sweep To)
                </label>
                <input
                  type="text"
                  value={safeAddress}
                  onChange={(e) => setSafeAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">
                Private Key (for compromised wallet)
              </label>
              <div className="relative">
                <input
                  type={showPrivateKey ? 'text' : 'password'}
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  placeholder="Private key of compromised wallet..."
                  className="w-full px-4 py-3 pr-20 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm font-mono"
                />
                <button
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
                    <label className="text-xs text-white/30 mb-1 block">Telegram Bot Token</label>
                    <input
                      type="text"
                      value={telegramBotToken}
                      onChange={(e) => setTelegramBotToken(e.target.value)}
                      placeholder="123456:ABC-DEF..."
                      className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/30 mb-1 block">Telegram Chat ID</label>
                    <input
                      type="text"
                      value={telegramChatId}
                      onChange={(e) => setTelegramChatId(e.target.value)}
                      placeholder="-1001234567890"
                      className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-white/30 mb-1 block">Discord Webhook URL</label>
                  <input
                    type="text"
                    value={discordWebhookUrl}
                    onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                    placeholder="https://discord.com/api/webhooks/..."
                    className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/30 mb-1 block">Slack Webhook URL</label>
                  <input
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

            <div className="flex gap-4">
              {!monitoring ? (
                <button
                  onClick={startMonitoring}
                  disabled={!address || !safeAddress || !privateKey}
                  className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold disabled:opacity-50 hover:from-green-500 hover:to-emerald-500 transition-all"
                >
                  🛡️ Start Protection
                </button>
              ) : (
                <button
                  onClick={stopMonitoring}
                  className="px-8 py-3 bg-red-600/20 border border-red-500/30 rounded-xl font-semibold text-red-400 hover:bg-red-600/30 transition-all"
                >
                  Stop Monitoring
                </button>
              )}
              <button
                onClick={pollStatus}
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
                            href={`https://${getExplorerForChain(sweep.chainId || 1)}/tx/${sweep.txHash}`}
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
