'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface BotStatus {
  ok: boolean
  botConfigured: boolean
  applicationId: string | null
  inviteUrl: string | null
  note: string
}

const SLASH_COMMANDS = [
  { cmd: '/monitor <address>', desc: 'Start monitoring a wallet address' },
  { cmd: '/stop <address>', desc: 'Stop monitoring a wallet address' },
  { cmd: '/alerts', desc: 'Show recent alerts for this channel' },
  { cmd: '/status', desc: 'Check bot and monitoring status' },
]

const PERMISSIONS = [
  { name: 'Send Messages', desc: 'Required to send alert messages' },
  { name: 'Embed Links', desc: 'Required for rich alert embeds' },
  { name: 'Use Slash Commands', desc: 'Required for bot commands' },
]

const ALERT_TYPES = [
  { key: 'balance_change', emoji: '💰', label: 'Balance Changes' },
  { key: 'drainer_movement', emoji: '🚨', label: 'Drainer Movement' },
  { key: 'airdrop', emoji: '🎁', label: 'Airdrops' },
  { key: 'gas_spike', emoji: '⛽', label: 'Gas Alerts' },
  { key: 'recovery_status', emoji: '🔄', label: 'Recovery Status' },
]

export default function DiscordPage() {
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null)
  const [channelId, setChannelId] = useState('')
  const [testAddress, setTestAddress] = useState('')
  const [testResult, setTestResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'setup' | 'test' | 'commands'>('setup')

  useEffect(() => {
    fetch('/api/discord/webhook')
      .then(r => r.json())
      .then((data: BotStatus) => setBotStatus(data))
      .catch(() => setBotStatus(null))
  }, [])

  const sendTestAlert = async () => {
    if (!channelId || !testAddress) return
    setLoading(true)
    setTestResult('')
    try {
      const res = await fetch('/api/discord/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId,
          type: 'balance_change',
          wallet: testAddress,
          chain: '1',
          message: 'Test alert from SweepGuard Discord Bot setup page!',
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
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-purple-500/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-blue-500/[0.03] rounded-full blur-[100px]" />
      </div>
      <nav className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">SweepGuard</span>
        </Link>
        <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-white transition">← Dashboard</Link>
      </nav>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-2">💜 Discord Alert Bot</h1>
        <p className="text-zinc-400 mb-8">Get real-time wallet alerts right in your Discord server with rich embeds and slash commands.</p>

        {/* Bot Status */}
        <div className="bg-[#111118] border border-white/[0.06] rounded-xl p-5 mb-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${botStatus?.botConfigured ? 'bg-green-400' : 'bg-red-400'}`} />
            Bot Status
          </h2>
          {botStatus ? (
            <div className="text-sm space-y-2 text-zinc-300">
              <p>Token configured: <span className={botStatus.botConfigured ? 'text-green-400' : 'text-red-400'}>{botStatus.botConfigured ? 'Yes' : 'No'}</span></p>
              {botStatus.applicationId && (
                <p>Application ID: <code className="bg-black/30 px-2 py-0.5 rounded text-xs text-emerald-400">{botStatus.applicationId}</code></p>
              )}
              {botStatus.inviteUrl && (
                <p>
                  <a href={botStatus.inviteUrl} target="_blank" rel="noopener" className="text-blue-400 hover:underline">
                    🔗 Click to invite bot to your server
                  </a>
                </p>
              )}
              {!botStatus.botConfigured && (
                <p className="text-yellow-400 text-xs mt-2">⚠️ Set <code>DISCORD_BOT_TOKEN</code> and <code>DISCORD_APPLICATION_ID</code> in your environment variables.</p>
              )}
            </div>
          ) : (
            <p className="text-zinc-500 text-sm">Loading…</p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-[#111118] rounded-lg p-1 border border-white/[0.06]">
          {(['setup', 'test', 'commands'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {tab === 'setup' ? '⚙️ Setup' : tab === 'test' ? '🧪 Test' : '📋 Commands'}
            </button>
          ))}
        </div>

        {/* Setup Tab */}
        {activeTab === 'setup' && (
          <div className="space-y-6">
            <div className="bg-[#111118] border border-white/[0.06] rounded-xl p-5">
              <h3 className="font-semibold mb-4">1. Create a Discord Application</h3>
              <ol className="space-y-3 text-sm text-zinc-300 list-decimal list-inside">
                <li>Go to <a href="https://discord.com/developers/applications" target="_blank" rel="noopener" className="text-blue-400 hover:underline">Discord Developer Portal</a></li>
                <li>Click <strong>New Application</strong> and name it &quot;SweepGuard&quot;</li>
                <li>Go to <strong>Bot</strong> tab → Click <strong>Reset Token</strong> to get your bot token</li>
                <li>Copy the token and set it as <code className="bg-black/30 px-1.5 py-0.5 rounded text-xs">DISCORD_BOT_TOKEN</code></li>
                <li>Copy the Application ID from General Information → set as <code className="bg-black/30 px-1.5 py-0.5 rounded text-xs">DISCORD_APPLICATION_ID</code></li>
              </ol>
            </div>

            <div className="bg-[#111118] border border-white/[0.06] rounded-xl p-5">
              <h3 className="font-semibold mb-4">2. Invite the Bot</h3>
              <p className="text-sm text-zinc-400 mb-3">Generate an invite URL with the required permissions:</p>
              {botStatus?.inviteUrl ? (
                <a href={botStatus.inviteUrl} target="_blank" rel="noopener" className="inline-block px-5 py-2.5 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 text-white font-semibold text-sm hover:brightness-110 transition">
                  🔗 Invite SweepGuard Bot
                </a>
              ) : (
                <p className="text-zinc-500 text-sm">Configure the bot first to generate an invite link.</p>
              )}

              <div className="mt-4">
                <h4 className="text-sm font-medium text-zinc-400 mb-2">Required Permissions</h4>
                <div className="space-y-2">
                  {PERMISSIONS.map(p => (
                    <div key={p.name} className="flex items-center gap-2 text-sm text-zinc-300">
                      <span className="text-green-400">✓</span>
                      <span className="font-medium">{p.name}</span>
                      <span className="text-zinc-500 text-xs">— {p.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-[#111118] border border-white/[0.06] rounded-xl p-5">
              <h3 className="font-semibold mb-4">3. Register Slash Commands</h3>
              <p className="text-sm text-zinc-400 mb-3">After inviting the bot, register its slash commands with Discord:</p>
              <div className="bg-black/40 rounded-lg p-4 text-xs font-mono text-emerald-400 overflow-x-auto">
                PUT /api/discord/webhook
              </div>
              <p className="text-xs text-zinc-500 mt-2">This registers /monitor, /stop, /alerts, and /status commands.</p>
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
              <p className="text-sm text-zinc-400 mb-4">Verify the bot is working by sending a test alert to a channel.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Channel ID</label>
                  <input
                    type="text"
                    value={channelId}
                    onChange={e => setChannelId(e.target.value)}
                    placeholder="e.g. 1234567890123456789"
                    className="w-full bg-black/30 border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500/50 transition"
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Right-click a channel in Discord → Copy Channel ID (enable Developer Mode in Settings → Advanced)
                  </p>
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Wallet Address to Test</label>
                  <input
                    type="text"
                    value={testAddress}
                    onChange={e => setTestAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full bg-black/30 border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500/50 transition"
                  />
                </div>

                <button
                  onClick={sendTestAlert}
                  disabled={loading || !channelId || !testAddress}
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition"
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
              <p className="text-sm text-zinc-400 mb-3">Send alerts programmatically:</p>
              <div className="bg-black/40 rounded-lg p-4 text-xs font-mono text-emerald-400 overflow-x-auto">
{`POST /api/discord/alert
Content-Type: application/json

{
  "channelId": "1234567890123456789",
  "type": "balance_change",
  "wallet": "0x...",
  "chain": "1",
  "message": "Custom alert message",
  "amount": "1.5",
  "txHash": "0x..."
}`}
              </div>
            </div>
          </div>
        )}

        {/* Commands Tab */}
        {activeTab === 'commands' && (
          <div className="space-y-6">
            <div className="bg-[#111118] border border-white/[0.06] rounded-xl p-5">
              <h3 className="font-semibold mb-4">📋 Available Slash Commands</h3>
              <p className="text-sm text-zinc-400 mb-4">Use these commands in any channel where the bot is present:</p>
              <div className="space-y-3">
                {SLASH_COMMANDS.map(({ cmd, desc }) => (
                  <div key={cmd} className="flex items-start gap-3 bg-black/20 rounded-lg p-3">
                    <code className="bg-black/30 px-2 py-1 rounded text-xs text-violet-400 min-w-[160px] font-mono">{cmd}</code>
                    <span className="text-sm text-zinc-300">{desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#111118] border border-white/[0.06] rounded-xl p-5">
              <h3 className="font-semibold mb-4">💡 How It Works</h3>
              <div className="space-y-3 text-sm text-zinc-300">
                <p>1. Use <code className="bg-black/30 px-1.5 py-0.5 rounded text-xs">/monitor</code> to add a wallet address to the channel&apos;s watch list.</p>
                <p>2. The bot will send rich embed alerts whenever activity is detected on monitored wallets.</p>
                <p>3. Use <code className="bg-black/30 px-1.5 py-0.5 rounded text-xs">/alerts</code> to view recent alert history.</p>
                <p>4. Use <code className="bg-black/30 px-1.5 py-0.5 rounded text-xs">/stop</code> to remove a wallet from monitoring.</p>
              </div>
            </div>

            <div className="bg-[#111118] border border-white/[0.06] rounded-xl p-5">
              <h3 className="font-semibold mb-4">🔔 Alert Types</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ALERT_TYPES.map(t => (
                  <div key={t.key} className="flex items-center gap-3 bg-black/20 rounded-lg p-3">
                    <span className="text-xl">{t.emoji}</span>
                    <span className="text-sm font-medium">{t.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
