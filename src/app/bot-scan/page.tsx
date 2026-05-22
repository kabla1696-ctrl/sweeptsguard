'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  scanAddress,
  handleInlineQuery,
  generateShareCard,
  getAnalytics,
  getBotConfig,
  updateBotConfig,
  BOT_COMMANDS,
  type ScanResult,
  type ScanAnalytics,
  type BotConfig,
} from '@/lib/botScan'

const RISK_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  safe: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
  low: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
  medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
  high: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  critical: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
}

export default function BotScanPage() {
  const [address, setAddress] = useState('')
  const [chainId, setChainId] = useState(1)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState('')
  const [analytics, setAnalytics] = useState<ScanAnalytics | null>(null)
  const [botConfig, setBotConfig] = useState<BotConfig | null>(null)
  const [activeTab, setActiveTab] = useState<'scan' | 'commands' | 'analytics' | 'config'>('scan')
  const [showShareCard, setShowShareCard] = useState(false)
  const [copiedCard, setCopiedCard] = useState(false)
  const [inlineQuery, setInlineQuery] = useState('')
  const [inlineResults, setInlineResults] = useState<ReturnType<typeof handleInlineQuery>>([])

  useEffect(() => {
    setAnalytics(getAnalytics())
    setBotConfig(getBotConfig())
  }, [])

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
      setError('Please enter a valid EVM address')
      return
    }

    setScanning(true)
    setError('')
    setResult(null)
    setShowShareCard(false)

    try {
      const scanResult = await scanAddress(address, chainId, 'dashboard')
      setResult(scanResult)
      setAnalytics(getAnalytics())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed')
    } finally {
      setScanning(false)
    }
  }

  const handleInlineSearch = (query: string) => {
    setInlineQuery(query)
    if (query.length > 2) {
      setInlineResults(handleInlineQuery(query))
    } else {
      setInlineResults([])
    }
  }

  const handleCopyCard = async () => {
    if (!result) return
    await navigator.clipboard.writeText(generateShareCard(result))
    setCopiedCard(true)
    setTimeout(() => setCopiedCard(false), 2000)
  }

  const handleUpdateConfig = (key: keyof BotConfig, value: string | boolean | number | string[]) => {
    if (!botConfig) return
    const updated = { ...botConfig, [key]: value }
    setBotConfig(updated)
    updateBotConfig({ [key]: value })
  }

  const riskColors = result ? (RISK_COLORS[result.riskLevel] || RISK_COLORS.safe) : RISK_COLORS.safe

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <nav className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">SweepGuard</span>
        </Link>
        <div className="flex gap-4">
          <Link href="/scan" className="text-sm text-white/50 hover:text-white transition-colors">Scan</Link>
          <Link href="/dashboard" className="text-sm text-white/50 hover:text-white transition-colors">Dashboard</Link>
          <Link href="/bot-scan" className="text-sm text-green-400 font-medium">Bot Scan</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">🤖</span>
            <div>
              <h1 className="text-3xl font-bold">Telegram Bot Scanner</h1>
              <p className="text-white/40">Wallet scanning via Telegram bot — /scan, inline queries, group scanning</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 p-1 bg-white/[0.02] border border-white/[0.06] rounded-xl">
          {(['scan', 'commands', 'analytics', 'config'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-green-600/20 text-green-400 border border-green-500/20'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {tab === 'scan' ? '🔍 Scan' : tab === 'commands' ? '📋 Commands' : tab === 'analytics' ? '📊 Analytics' : '⚙️ Config'}
            </button>
          ))}
        </div>

        {/* Scan Tab */}
        {activeTab === 'scan' && (
          <div>
            <form onSubmit={handleScan} className="mb-8">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Enter wallet address (0x...)"
                  className="flex-1 px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm font-mono"
                />
                <select
                  value={chainId}
                  onChange={e => setChainId(Number(e.target.value))}
                  className="px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white focus:outline-none focus:border-green-500/40 text-sm"
                >
                  <option value={1}>⟠ Ethereum</option>
                  <option value={8453}>🔵 Base</option>
                  <option value={56}>🟡 BNB Chain</option>
                  <option value={42161}>🔵 Arbitrum</option>
                  <option value={137}>🟣 Polygon</option>
                  <option value={10}>🔴 Optimism</option>
                </select>
                <button
                  type="submit"
                  disabled={scanning}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold text-sm disabled:opacity-50 hover:from-green-500 hover:to-emerald-500 transition-all"
                >
                  {scanning ? 'Scanning...' : '🔍 Scan'}
                </button>
              </div>
            </form>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">{error}</div>
            )}

            {/* Inline Query Demo */}
            <div className="mb-8 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
              <h3 className="text-sm font-semibold mb-2">💬 Inline Query Preview</h3>
              <p className="text-white/30 text-xs mb-3">Type an address to preview inline query results (as they&apos;d appear in Telegram)</p>
              <input
                type="text"
                value={inlineQuery}
                onChange={e => handleInlineSearch(e.target.value)}
                placeholder="@SweepGuardBot 0x..."
                className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm font-mono"
              />
              {inlineResults.length > 0 && (
                <div className="mt-3 space-y-2">
                  {inlineResults.map(result => (
                    <div key={result.id} className="p-3 bg-white/[0.03] border border-white/[0.05] rounded-lg">
                      <h4 className="text-sm font-semibold">{result.title}</h4>
                      <p className="text-white/40 text-xs">{result.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Scan Result */}
            {result && (
              <div className="space-y-6">
                <div className={`p-6 rounded-2xl border ${riskColors.bg} ${riskColors.border}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold">Scan Result</h2>
                      <p className="text-white/40 text-sm font-mono">{result.address}</p>
                    </div>
                    <div className="text-right">
                      <div className={`text-4xl font-bold ${riskColors.text}`}>{result.riskScore}</div>
                      <div className="text-white/40 text-xs">/ 100</div>
                    </div>
                  </div>

                  <div className="h-3 bg-white/[0.05] rounded-full overflow-hidden mb-4">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${
                        result.riskLevel === 'critical' ? 'bg-red-500' :
                        result.riskLevel === 'high' ? 'bg-orange-500' :
                        result.riskLevel === 'medium' ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${result.riskScore}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Balance', value: `${result.balance} ETH`, icon: '💰' },
                      { label: 'Tokens', value: String(result.tokenCount), icon: '🪙' },
                      { label: 'NFTs', value: String(result.nftCount), icon: '🖼️' },
                      { label: 'Approvals', value: `${result.approvalCount} (${result.dangerousApprovals} ⚠️)`, icon: '🔓' },
                    ].map((stat, i) => (
                      <div key={i} className="p-3 bg-white/[0.03] rounded-lg">
                        <span className="text-sm">{stat.icon}</span>
                        <p className="text-lg font-bold mt-1">{stat.value}</p>
                        <p className="text-white/30 text-xs">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center gap-3 text-xs text-white/30">
                    <span>First seen: {result.firstSeen}</span>
                    <span>•</span>
                    <span>Last activity: {result.lastActivity}</span>
                    <span>•</span>
                    <span>{result.interactingContracts} contracts</span>
                  </div>
                </div>

                {/* Flags */}
                {result.flags.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">🚩 Flags ({result.flags.length})</h3>
                    <div className="space-y-2">
                      {result.flags.map((flag, i) => (
                        <div key={i} className={`p-3 rounded-xl border ${
                          flag.severity === 'danger' ? 'border-red-500/30 bg-red-500/5' :
                          flag.severity === 'warning' ? 'border-yellow-500/30 bg-yellow-500/5' :
                          'border-white/[0.05] bg-white/[0.02]'
                        }`}>
                          <div className="flex items-center gap-2">
                            <span>{flag.severity === 'danger' ? '🔴' : flag.severity === 'warning' ? '🟡' : 'ℹ️'}</span>
                            <span className="text-sm">{flag.description}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Share Card */}
                <div>
                  <button
                    onClick={() => setShowShareCard(!showShareCard)}
                    className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm transition-colors mb-3"
                  >
                    <span>{showShareCard ? '▼' : '▶'}</span> 📤 Share Card
                  </button>
                  {showShareCard && (
                    <div className="p-4 bg-[#1a1a2e] border border-white/[0.1] rounded-xl">
                      <pre className="text-xs text-green-400 font-mono whitespace-pre overflow-x-auto">{generateShareCard(result)}</pre>
                      <button
                        onClick={handleCopyCard}
                        className="mt-3 px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-lg text-xs text-white/50 hover:text-white/80 transition-all"
                      >
                        {copiedCard ? '✅ Copied!' : '📋 Copy to Clipboard'}
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-white/50 text-sm">{result.summary}</p>
              </div>
            )}
          </div>
        )}

        {/* Commands Tab */}
        {activeTab === 'commands' && (
          <div>
            <div className="mb-6 p-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
              <h3 className="text-lg font-semibold mb-2">🤖 Bot Commands</h3>
              <p className="text-white/40 text-sm mb-4">Register these commands with @BotFather for your SweepGuard bot</p>

              <div className="space-y-3">
                {BOT_COMMANDS.map(cmd => (
                  <div key={cmd.command} className="p-4 bg-white/[0.03] border border-white/[0.05] rounded-xl">
                    <div className="flex items-center justify-between mb-1">
                      <code className="text-green-400 font-mono text-sm font-bold">{cmd.command}</code>
                      <span className="text-white/30 text-xs">{cmd.usage}</span>
                    </div>
                    <p className="text-white/50 text-xs">{cmd.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
              <h3 className="text-lg font-semibold mb-2">💡 Usage Examples</h3>
              <div className="space-y-3 mt-4">
                {[
                  { cmd: '/scan 0x1234...abcd', desc: 'Scan a wallet on default chain (Ethereum)' },
                  { cmd: '/scan 0x1234...abcd base', desc: 'Scan on Base chain' },
                  { cmd: '/scan 0x1234...abcd arb', desc: 'Scan on Arbitrum' },
                  { cmd: '@SweepGuardBot 0x1234...abcd', desc: 'Inline query from any chat' },
                  { cmd: '/history', desc: 'View your recent scans' },
                  { cmd: '/stats', desc: 'View bot statistics' },
                ].map((example, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-lg">
                    <code className="text-xs text-green-400 font-mono bg-green-500/10 px-2 py-1 rounded whitespace-nowrap">{example.cmd}</code>
                    <span className="text-white/40 text-xs">{example.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 p-5 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
              <h3 className="text-blue-400 font-bold mb-2">📘 Setup Guide</h3>
              <ol className="space-y-2 text-white/60 text-sm">
                <li>1. Create a bot via <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">@BotFather</a></li>
                <li>2. Copy the bot token and paste it in the Config tab</li>
                <li>3. Register commands using the list above</li>
                <li>4. Enable inline mode in BotFather settings</li>
                <li>5. Add the bot to your group for group scanning</li>
                <li>6. Set up a webhook URL for production use</li>
              </ol>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && analytics && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Total Scans', value: analytics.totalScans, icon: '🔍' },
                { label: 'Unique Addresses', value: analytics.uniqueAddresses, icon: '📍' },
                { label: 'Unique Users', value: analytics.uniqueUsers, icon: '👥' },
                { label: 'Scans Today', value: analytics.scansToday, icon: '📅' },
              ].map((card, i) => (
                <div key={i} className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                  <span className="text-lg">{card.icon}</span>
                  <p className="text-2xl font-bold mt-1">{card.value}</p>
                  <p className="text-white/30 text-xs">{card.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                <span className="text-sm text-white/40">Average Risk Score</span>
                <p className="text-3xl font-bold mt-1">{analytics.averageRiskScore.toFixed(1)}<span className="text-white/30 text-lg">/100</span></p>
              </div>
              <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                <span className="text-sm text-white/40">Dangerous Detected</span>
                <p className="text-3xl font-bold mt-1 text-red-400">{analytics.dangerousDetected}</p>
              </div>
            </div>

            {/* Scans by Chain */}
            {Object.keys(analytics.scansByChain).length > 0 && (
              <div className="p-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
                <h3 className="text-sm font-semibold mb-3">⛓️ Scans by Chain</h3>
                <div className="space-y-2">
                  {Object.entries(analytics.scansByChain).map(([chain, count]) => (
                    <div key={chain} className="flex items-center justify-between">
                      <span className="text-sm text-white/60">{chain}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-white/[0.05] rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${(count / analytics.totalScans) * 100}%` }} />
                        </div>
                        <span className="text-xs text-white/40 w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Scanned Addresses */}
            {analytics.topScannedAddresses.length > 0 && (
              <div className="p-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
                <h3 className="text-sm font-semibold mb-3">🏆 Top Scanned Addresses</h3>
                <div className="space-y-2">
                  {analytics.topScannedAddresses.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-white/[0.02] rounded-lg">
                      <span className="text-xs font-mono text-white/50">{item.address.slice(0, 10)}...{item.address.slice(-6)}</span>
                      <span className="text-xs text-white/30">{item.count} scans</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Scans */}
            {analytics.recentScans.length > 0 && (
              <div className="p-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
                <h3 className="text-sm font-semibold mb-3">🕐 Recent Scans</h3>
                <div className="space-y-2">
                  {analytics.recentScans.slice(0, 10).map((scan, i) => {
                    const colors = RISK_COLORS[scan.riskLevel] || RISK_COLORS.safe
                    return (
                      <div key={i} className="flex items-center justify-between p-2 bg-white/[0.02] rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${colors.text}`}>{scan.riskScore}</span>
                          <span className="text-xs font-mono text-white/50">{scan.address.slice(0, 8)}...{scan.address.slice(-4)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-white/30">
                          <span>{scan.chainName}</span>
                          <span>{new Date(scan.scannedAt).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Config Tab */}
        {activeTab === 'config' && botConfig && (
          <div className="space-y-6">
            <div className="p-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl space-y-4">
              <h3 className="text-lg font-semibold">⚙️ Bot Configuration</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-white/30 mb-1 block">Bot Token</label>
                  <input
                    type="password"
                    value={botConfig.botToken}
                    onChange={e => handleUpdateConfig('botToken', e.target.value)}
                    placeholder="123456:ABC-DEF..."
                    className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white text-sm font-mono focus:outline-none focus:border-green-500/40"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/30 mb-1 block">Bot Username</label>
                  <input
                    value={botConfig.botUsername}
                    onChange={e => handleUpdateConfig('botUsername', e.target.value)}
                    placeholder="SweepGuardBot"
                    className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white text-sm font-mono focus:outline-none focus:border-green-500/40"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/30 mb-1 block">Webhook URL</label>
                  <input
                    value={botConfig.webhookUrl}
                    onChange={e => handleUpdateConfig('webhookUrl', e.target.value)}
                    placeholder="https://your-domain.com/api/telegram/webhook"
                    className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white text-sm font-mono focus:outline-none focus:border-green-500/40"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/30 mb-1 block">Default Chain</label>
                  <select
                    value={botConfig.defaultChain}
                    onChange={e => handleUpdateConfig('defaultChain', Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white text-sm focus:outline-none focus:border-green-500/40"
                  >
                    <option value={1}>Ethereum</option>
                    <option value={8453}>Base</option>
                    <option value={56}>BNB Chain</option>
                    <option value={42161}>Arbitrum</option>
                    <option value={137}>Polygon</option>
                    <option value={10}>Optimism</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-white/30 mb-1 block">Max Scans Per Minute</label>
                <input
                  type="number"
                  value={botConfig.maxScansPerMinute}
                  onChange={e => handleUpdateConfig('maxScansPerMinute', Number(e.target.value))}
                  className="w-32 px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white text-sm font-mono focus:outline-none focus:border-green-500/40"
                />
              </div>

              <div className="flex flex-wrap gap-4">
                {[
                  { key: 'enableInlineQueries' as const, label: 'Enable Inline Queries' },
                  { key: 'enableGroupScanning' as const, label: 'Enable Group Scanning' },
                ].map(item => (
                  <label key={item.key} className="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={botConfig[item.key] as boolean}
                      onChange={e => handleUpdateConfig(item.key, e.target.checked)}
                      className="rounded border-white/20 bg-white/[0.05]"
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="p-5 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl">
              <h3 className="text-yellow-400 font-bold mb-2">⚠️ Environment Variables</h3>
              <p className="text-white/50 text-sm mb-3">For production, set these in your .env file:</p>
              <div className="space-y-1 font-mono text-xs text-white/40">
                <p>TELEGRAM_BOT_TOKEN=your_bot_token</p>
                <p>TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/telegram/webhook</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
