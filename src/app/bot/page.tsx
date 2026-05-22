'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface BotStatus {
  ok: boolean
  botConfigured: boolean
  webhookUrl: string
  note: string
}

interface AlertRecord {
  type: string
  wallet: string
  chain: string
  message: string
  txHash?: string
  amount?: string
  timestamp: number
}

interface Subscription {
  chatId: string
  address: string
  enabledAlerts: string[]
  addedAt: number
}

interface AlertHistoryResponse {
  ok: boolean
  chatId: string
  subscriptions: Subscription[]
  alerts: AlertRecord[]
  settings: { enabledAlerts: string[]; gasThreshold?: number }
}

const ALERT_TYPES = [
  { key: 'balance_change', emoji: '💰', label: 'Balance Changes' },
  { key: 'drainer_movement', emoji: '🚨', label: 'Drainer Movement' },
  { key: 'airdrop', emoji: '🎁', label: 'Airdrops' },
  { key: 'gas_spike', emoji: '⛽', label: 'Gas Alerts' },
  { key: 'recovery_status', emoji: '🔄', label: 'Recovery Status' },
]

export default function BotPage() {
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null)
  const [chatId, setChatId] = useState('')
  const [testAddress, setTestAddress] = useState('')
  const [alertHistory, setAlertHistory] = useState<AlertHistoryResponse | null>(null)
  const [testResult, setTestResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'setup' | 'test' | 'history'>('setup')

  // Fetch bot webhook status
  useEffect(() => {
    fetch('/api/telegram/webhook')
      .then(r => r.json())
      .then((data: BotStatus) => setBotStatus(data))
      .catch(() => setBotStatus(null))
  }, [])

  // Fetch alert history when chatId changes
  const fetchHistory = useCallback(async () => {
    if (!chatId) return
    try {
      const res = await fetch(`/api/telegram/alert?chatId=${encodeURIComponent(chatId)}`)
      const data = await res.json() as AlertHistoryResponse
      setAlertHistory(data)
    } catch {
      setAlertHistory(null)
    }
  }, [chatId])

  useEffect(() => {
    if (chatId) fetchHistory()
  }, [chatId, fetchHistory])

  // Send a test alert
  const sendTestAlert = async () => {
    if (!chatId || !testAddress) return
    setLoading(true)
    setTestResult('')
    try {
      const res = await fetch('/api/telegram/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          type: 'balance_change',
          wallet: testAddress,
          chain: '1',
          message: 'Test alert from SweepGuard Bot setup page!',
          amount: '0.01',
        }),
      })
      const data = await res.json() as { ok?: boolean; sent?: number; error?: string }
      if (data.ok) {
        setTestResult(`✅ Test alert sent! (${data.sent} message(s) delivered)`)
      } else {
        setTestResult(`❌ Failed: ${data.error || 'Unknown error'}`)
      }
    } catch (err) {
      setTestResult(`❌ Error: ${err instanceof Error ? err.message : 'Request failed'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#030305] text-white">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-green-500/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-cyan-500/[0.03] rounded-full blur-[100px]" />
      </div>
      {/* Nav */}
      <nav className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">SweepGuard</span>
        </Link>
        <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-white transition">← Dashboard</Link>
      </nav>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-2">🤖 Telegram Alert Bot</h1>
        <p className="text-zinc-400 mb-8">Get real-time alerts for wallet activity, drainer movements, and more — right in Telegram.</p>

        {/* Bot Status */}
        <div className="bg-[#111118] border border-white/[0.06] rounded-xl p-5 mb-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${botStatus?.botConfigured ? 'bg-green-400' : 'bg-red-400'}`} />
            Bot Status
          </h2>
          {botStatus ? (
            <div className="text-sm space-y-2 text-zinc-300">
              <p>Token configured: <span className={botStatus.botConfigured ? 'text-green-400' : 'text-red-400'}>{botStatus.botConfigured ? 'Yes' : 'No'}</span></p>
              <p>Webhook URL: <code className="bg-black/30 px-2 py-0.5 rounded text-xs text-emerald-400">{botStatus.webhookUrl}</code></p>
              {!botStatus.botConfigured && (
                <p className="text-yellow-400 text-xs mt-2">⚠️ Set <code>TELEGRAM_BOT_TOKEN</code> in your environment variables to enable the bot.</p>
              )}
            </div>
          ) : (
            <p className="text-zinc-500 text-sm">Loading…</p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-[#111118] rounded-lg p-1 border border-white/[0.06]">
          {(['setup', 'test', 'history'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-black'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {tab === 'setup' ? '⚙️ Setup' : tab === 'test' ? '🧪 Test' : '📋 History'}
            </button>
          ))}
        </div>

        {/* Setup Tab */}
        {activeTab === 'setup' && (
          <div className="space-y-6">
            <div className="bg-[#111118] border border-white/[0.06] rounded-xl p-5">
              <h3 className="font-semibold mb-4">1. Create Your Telegram Bot</h3>
              <ol className="space-y-3 text-sm text-zinc-300 list-decimal list-inside">
                <li>Open <a href="https://t.me/BotFather" target="_blank" rel="noopener" className="text-blue-400 hover:underline">@BotFather</a> in Telegram</li>
                <li>Send <code className="bg-black/30 px-1.5 py-0.5 rounded text-xs">/newbot</code> and follow the prompts</li>
                <li>Copy the bot token (format: <code className="bg-black/30 px-1.5 py-0.5 rounded text-xs">123456:ABC-DEF...</code>)</li>
                <li>Add it to your environment as <code className="bg-black/30 px-1.5 py-0.5 rounded text-xs">TELEGRAM_BOT_TOKEN</code></li>
              </ol>
            </div>

            <div className="bg-[#111118] border border-white/[0.06] rounded-xl p-5">
              <h3 className="font-semibold mb-4">2. Set Up the Webhook</h3>
              <p className="text-sm text-zinc-400 mb-3">After deploying, register the webhook with Telegram:</p>
              <div className="bg-black/40 rounded-lg p-4 text-xs font-mono text-emerald-400 overflow-x-auto">
                curl -X POST &quot;https://api.telegram.org/bot{'<TOKEN>'}/setWebhook?url=https://sweeptsguard.vercel.app/api/telegram/webhook&quot;
              </div>
            </div>

            <div className="bg-[#111118] border border-white/[0.06] rounded-xl p-5">
              <h3 className="font-semibold mb-4">3. Start Monitoring</h3>
              <p className="text-sm text-zinc-400 mb-3">In Telegram, send these commands to your bot:</p>
              <div className="space-y-2">
                {[
                  { cmd: '/start', desc: 'Welcome + list of commands' },
                  { cmd: '/monitor 0x...', desc: 'Start monitoring a wallet' },
                  { cmd: '/stop 0x...', desc: 'Stop monitoring a wallet' },
                  { cmd: '/alerts', desc: 'View recent alerts' },
                  { cmd: '/settings', desc: 'Configure alert types' },
                  { cmd: '/status', desc: 'Check bot status' },
                ].map(({ cmd, desc }) => (
                  <div key={cmd} className="flex items-center gap-3 text-sm">
                    <code className="bg-black/30 px-2 py-1 rounded text-xs text-emerald-400 min-w-[140px]">{cmd}</code>
                    <span className="text-zinc-500">{desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#111118] border border-white/[0.06] rounded-xl p-5">
              <h3 className="font-semibold mb-4">4. Configure Alert Types</h3>
              <p className="text-sm text-zinc-400 mb-3">Choose which alerts you want to receive:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ALERT_TYPES.map(t => (
                  <div key={t.key} className="flex items-center gap-3 bg-black/20 rounded-lg p-3">
                    <span className="text-xl">{t.emoji}</span>
                    <div>
                      <p className="text-sm font-medium">{t.label}</p>
                      <p className="text-xs text-zinc-500">{t.key}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Test Tab */}
        {activeTab === 'test' && (
          <div className="space-y-6">
            <div className="bg-[#111118] border border-white/[0.06] rounded-xl p-5">
              <h3 className="font-semibold mb-4">🧪 Send Test Alert</h3>
              <p className="text-sm text-zinc-400 mb-4">Verify your bot is working by sending a test alert.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Your Chat ID</label>
                  <input
                    type="text"
                    value={chatId}
                    onChange={e => setChatId(e.target.value)}
                    placeholder="e.g. 123456789"
                    className="w-full bg-black/30 border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-500/50 transition"
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Get your chat ID by messaging <a href="https://t.me/userinfobot" target="_blank" rel="noopener" className="text-blue-400 hover:underline">@userinfobot</a> in Telegram
                  </p>
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Wallet Address to Test</label>
                  <input
                    type="text"
                    value={testAddress}
                    onChange={e => setTestAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full bg-black/30 border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-500/50 transition"
                  />
                </div>

                <button
                  onClick={sendTestAlert}
                  disabled={loading || !chatId || !testAddress}
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-black font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition"
                >
                  {loading ? 'Sending…' : '📨 Send Test Alert'}
                </button>

                {testResult && (
                  <div className={`text-sm p-3 rounded-lg ${testResult.startsWith('✅') ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {testResult}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-[#111118] border border-white/[0.06] rounded-xl p-5">
              <h3 className="font-semibold mb-4">🔗 Integration Endpoint</h3>
              <p className="text-sm text-zinc-400 mb-3">Send alerts programmatically from your own systems:</p>
              <div className="bg-black/40 rounded-lg p-4 text-xs font-mono text-emerald-400 overflow-x-auto">
{`POST /api/telegram/alert
Content-Type: application/json

{
  "chatId": "123456789",  // optional — omit to broadcast
  "type": "balance_change",
  "wallet": "0x...",
  "chain": "1",
  "message": "Custom alert message",
  "amount": "1.5",
  "txHash": "0x..."       // optional
}`}
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="bg-[#111118] border border-white/[0.06] rounded-xl p-5">
              <h3 className="font-semibold mb-4">📋 Alert History</h3>

              <div className="mb-4">
                <label className="block text-sm text-zinc-400 mb-1">Chat ID</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatId}
                    onChange={e => setChatId(e.target.value)}
                    placeholder="Enter your chat ID"
                    className="flex-1 bg-black/30 border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-500/50 transition"
                  />
                  <button
                    onClick={fetchHistory}
                    disabled={!chatId}
                    className="px-5 py-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-sm font-medium disabled:opacity-40 transition"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              {!chatId ? (
                <p className="text-zinc-500 text-sm">Enter a chat ID to view alerts and subscriptions.</p>
              ) : !alertHistory ? (
                <p className="text-zinc-500 text-sm">Loading…</p>
              ) : (
                <>
                  {/* Subscriptions */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-zinc-400 mb-2">Monitored Wallets</h4>
                    {alertHistory.subscriptions.length === 0 ? (
                      <p className="text-zinc-500 text-xs">No wallets being monitored. Use /monitor in Telegram to add.</p>
                    ) : (
                      <div className="space-y-2">
                        {alertHistory.subscriptions.map((sub, i) => (
                          <div key={i} className="flex items-center justify-between bg-black/20 rounded-lg p-3 text-sm">
                            <code className="text-emerald-400 text-xs">{sub.address}</code>
                            <span className="text-xs text-zinc-500">{new Date(sub.addedAt).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Alert history */}
                  <h4 className="text-sm font-medium text-zinc-400 mb-2">Recent Alerts</h4>
                  {alertHistory.alerts.length === 0 ? (
                    <p className="text-zinc-500 text-xs">No alerts yet. Alerts appear when monitored wallets have activity.</p>
                  ) : (
                    <div className="space-y-2">
                      {alertHistory.alerts.slice().reverse().slice(0, 20).map((alert, i) => {
                        const t = ALERT_TYPES.find(a => a.key === alert.type)
                        return (
                          <div key={i} className="bg-black/20 rounded-lg p-3 text-sm">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium flex items-center gap-2">
                                <span>{t?.emoji || '📢'}</span>
                                {t?.label || alert.type}
                              </span>
                              <span className="text-xs text-zinc-500">{new Date(alert.timestamp).toLocaleString()}</span>
                            </div>
                            <p className="text-zinc-400 text-xs">{alert.message}</p>
                            <div className="flex gap-4 mt-1 text-xs text-zinc-500">
                              <span>Chain: {alert.chain}</span>
                              {alert.amount && <span>Amount: {alert.amount}</span>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Settings */}
                  <div className="mt-6 pt-4 border-t border-white/[0.05]">
                    <h4 className="text-sm font-medium text-zinc-400 mb-2">Current Settings</h4>
                    <div className="flex flex-wrap gap-2">
                      {ALERT_TYPES.map(t => {
                        const on = alertHistory.settings.enabledAlerts.includes(t.key)
                        return (
                          <span
                            key={t.key}
                            className={`text-xs px-3 py-1.5 rounded-full border ${
                              on
                                ? 'border-green-500/30 bg-green-500/10 text-green-400'
                                : 'border-white/[0.06] bg-black/20 text-zinc-500'
                            }`}
                          >
                            {t.emoji} {t.label}
                          </span>
                        )
                      })}
                    </div>
                    {alertHistory.settings.gasThreshold && (
                      <p className="text-xs text-zinc-500 mt-2">⛽ Gas threshold: {alertHistory.settings.gasThreshold} gwei</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
