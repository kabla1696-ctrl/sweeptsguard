'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Faucet {
  chainId: number
  chainName: string
  token: string
  sources: { name: string; url: string; type: string; notes?: string }[]
  amount: string
  cooldown: string
}

interface ClaimResult {
  success: boolean
  txHash?: string
  error?: string
  chainName: string
}

export default function AirdropPage() {
  const [activeTab, setActiveTab] = useState<'claim' | 'faucets'>('claim')
  const [contractAddress, setContractAddress] = useState('')
  const [chainId, setChainId] = useState(1)
  const [claimMethod, setClaimMethod] = useState('claim')
  const [recipientAddress, setRecipientAddress] = useState('')
  const [privateKey, setPrivateKey] = useState('')
  const [claiming, setClaiming] = useState(false)
  const [results, setResults] = useState<ClaimResult[]>([])
  const [showKey, setShowKey] = useState(false)

  const mainnetFaucets: Faucet[] = [
    { chainId: 8453, chainName: 'Base', token: 'ETH', sources: [{ name: 'Base Bridge', url: 'https://bridge.base.org', type: 'bridge', notes: 'Bridge ETH from Ethereum' }], amount: 'Variable', cooldown: 'No limit' },
    { chainId: 42161, chainName: 'Arbitrum', token: 'ETH', sources: [{ name: 'Arb Bridge', url: 'https://bridge.arbitrum.io', type: 'bridge' }], amount: 'Variable', cooldown: 'No limit' },
    { chainId: 137, chainName: 'Polygon', token: 'POL', sources: [{ name: 'Polygon Portal', url: 'https://portal.polygon.technology', type: 'bridge' }], amount: 'Variable', cooldown: 'No limit' },
    { chainId: 10, chainName: 'Optimism', token: 'ETH', sources: [{ name: 'OP Bridge', url: 'https://app.optimism.io/bridge', type: 'bridge' }], amount: 'Variable', cooldown: 'No limit' },
    { chainId: 56, chainName: 'BNB Chain', token: 'BNB', sources: [{ name: 'BNB Bridge', url: 'https://www.bnbchain.org/en/bridge', type: 'bridge' }], amount: 'Variable', cooldown: 'No limit' },
  ]

  const testnetFaucets: Faucet[] = [
    { chainId: 11155111, chainName: 'Sepolia', token: 'ETH', sources: [
      { name: 'Alchemy', url: 'https://sepoliafaucet.com', type: 'faucet' },
      { name: 'Google Cloud', url: 'https://cloud.google.com/application/web3/faucet/ethereum/sepolia', type: 'faucet' },
    ], amount: '0.5 ETH', cooldown: '24h' },
    { chainId: 84532, chainName: 'Base Sepolia', token: 'ETH', sources: [
      { name: 'Alchemy', url: 'https://www.alchemy.com/faucets/base-sepolia', type: 'faucet' },
    ], amount: '0.5 ETH', cooldown: '24h' },
    { chainId: 421614, chainName: 'Arb Sepolia', token: 'ETH', sources: [
      { name: 'Alchemy', url: 'https://www.alchemy.com/faucets/arbitrum-sepolia', type: 'faucet' },
    ], amount: '0.5 ETH', cooldown: '24h' },
    { chainId: 80002, chainName: 'Polygon Amoy', token: 'POL', sources: [
      { name: 'Alchemy', url: 'https://www.alchemy.com/faucets/polygon-amoy', type: 'faucet' },
    ], amount: '1 POL', cooldown: '24h' },
  ]

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contractAddress || !recipientAddress || !privateKey) return

    setClaiming(true)
    setResults([])

    try {
      const res = await fetch('/api/airdrop/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractAddress,
          chainId,
          claimMethod,
          recipientAddress,
          privateKey
        })
      })
      const data = await res.json()
      if (data.results) {
        setResults(data.results)
      } else if (data.error) {
        setResults([{ success: false, error: data.error, chainName: 'Unknown' }])
      }
    } catch {
      setResults([{ success: false, error: 'Request failed', chainName: 'Unknown' }])
    } finally {
      setClaiming(false)
    }
  }

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
          <Link href="/tracker" className="text-sm text-white/50 hover:text-white transition-colors">Tracker</Link>
          <Link href="/dashboard" className="text-sm text-white/50 hover:text-white transition-colors">Dashboard</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">🎯 Airdrop Claimer</h1>
        <p className="text-white/40 mb-8">Claim airdrops from compromised wallet → tokens go to safe wallet</p>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          {(['claim', 'faucets'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-green-600 text-white'
                  : 'bg-white/[0.05] text-white/50 hover:text-white'
              }`}
            >
              {tab === 'claim' ? '🎯 Claim Airdrop' : '🚰 Faucets & Gas'}
            </button>
          ))}
        </div>

        {/* Claim Tab */}
        {activeTab === 'claim' && (
          <div>
            <div className="p-5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl mb-6">
              <h3 className="text-yellow-400 font-semibold mb-2">⚡ How It Works</h3>
              <ol className="text-white/50 text-sm space-y-1 list-decimal list-inside">
                <li>Enter the airdrop claim contract address</li>
                <li>Set <span className="text-green-400">recipient = your safe wallet</span></li>
                <li>Sign with compromised wallet&apos;s private key</li>
                <li>Tokens are claimed and sent directly to safe wallet</li>
              </ol>
            </div>

            <form onSubmit={handleClaim} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">
                    Airdrop Contract Address
                  </label>
                  <input
                    type="text"
                    value={contractAddress}
                    onChange={(e) => setContractAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">
                    Chain
                  </label>
                  <select
                    value={chainId}
                    onChange={(e) => setChainId(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white focus:outline-none focus:border-green-500/40 text-sm"
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
                <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">
                  Claim Method
                </label>
                <select
                  value={claimMethod}
                  onChange={(e) => setClaimMethod(e.target.value)}
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white focus:outline-none focus:border-green-500/40 text-sm"
                >
                  <option value="claim">claim(recipient, amount, proof)</option>
                  <option value="claimSimple">claim() — no params</option>
                  <option value="claimWithDeadline">claim with deadline</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">
                  🟢 Recipient (Safe Wallet)
                </label>
                <input
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  placeholder="Your safe wallet 0x..."
                  className="w-full px-4 py-3 bg-green-500/5 border border-green-500/20 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm font-mono"
                />
                <p className="text-green-400/50 text-xs mt-1">Tokens will be sent here</p>
              </div>

              <div>
                <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">
                  🔴 Private Key (Compromised Wallet)
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    placeholder="Private key of compromised wallet..."
                    className="w-full px-4 py-3 pr-20 bg-red-500/5 border border-red-500/20 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/40 text-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-xs"
                  >
                    {showKey ? 'Hide' : 'Show'}
                  </button>
                </div>
                <p className="text-red-400/50 text-xs mt-1">Used only for signing — never stored</p>
              </div>

              <button
                type="submit"
                disabled={claiming || !contractAddress || !recipientAddress || !privateKey}
                className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold text-lg disabled:opacity-50 hover:from-green-500 hover:to-emerald-500 transition-all"
              >
                {claiming ? '⏳ Claiming...' : '🎯 Claim Airdrop → Safe Wallet'}
              </button>
            </form>

            {/* Results */}
            {results.length > 0 && (
              <div className="mt-6 space-y-3">
                <h3 className="font-semibold">Results</h3>
                {results.map((r, i) => (
                  <div key={i} className={`p-4 rounded-xl border ${
                    r.success ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'
                  }`}>
                    <div className="flex justify-between items-center">
                      <span className={r.success ? 'text-green-400' : 'text-red-400'}>
                        {r.success ? '✅' : '❌'} {r.chainName}
                      </span>
                      {r.txHash && (
                        <a href={`https://etherscan.io/tx/${r.txHash}`} target="_blank" rel="noopener noreferrer"
                          className="text-green-400/50 text-xs hover:text-green-400 font-mono">
                          {r.txHash.slice(0, 12)}...
                        </a>
                      )}
                      {r.error && <span className="text-red-400/50 text-xs">{r.error}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Faucets Tab */}
        {activeTab === 'faucets' && (
          <div>
            <div className="p-5 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-6">
              <h3 className="text-blue-400 font-semibold mb-2">💡 Gas Strategy</h3>
              <p className="text-white/50 text-sm">
                For claiming airdrops, you need gas tokens on each chain. Bridge ETH from Ethereum to L2s,
                or use testnet faucets for testing. Each chain needs its native token for gas.
              </p>
            </div>

            <h2 className="text-lg font-semibold mb-4">🌉 Mainnet Bridges</h2>
            <div className="grid gap-3 mb-8">
              {mainnetFaucets.map((f) => (
                <div key={f.chainId} className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-semibold">{f.chainName}</span>
                      <span className="text-white/30 text-sm ml-2">({f.token})</span>
                    </div>
                    <span className="text-green-400 text-sm">{f.amount}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {f.sources.map((s) => (
                      <a
                        key={s.name}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-green-600/20 rounded-lg text-green-400 text-xs hover:bg-green-600/30 transition-colors"
                      >
                        🔗 {s.name}
                      </a>
                    ))}
                  </div>
                  {f.sources[0]?.notes && (
                    <p className="text-white/20 text-xs mt-2">{f.sources[0].notes}</p>
                  )}
                </div>
              ))}
            </div>

            <h2 className="text-lg font-semibold mb-4">🧪 Testnet Faucets</h2>
            <div className="grid gap-3">
              {testnetFaucets.map((f) => (
                <div key={f.chainId} className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-semibold">{f.chainName}</span>
                      <span className="text-white/30 text-sm ml-2">({f.token})</span>
                    </div>
                    <div className="text-right">
                      <span className="text-blue-400 text-sm">{f.amount}</span>
                      <span className="text-white/20 text-xs ml-2">every {f.cooldown}</span>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {f.sources.map((s) => (
                      <a
                        key={s.name}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-blue-600/20 rounded-lg text-blue-400 text-xs hover:bg-blue-600/30 transition-colors"
                      >
                        🚰 {s.name}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
