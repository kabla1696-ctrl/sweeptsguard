'use client'

import { useState } from 'react'
import Link from 'next/link'

const PLATFORM_FEE_WALLET = '0x7A3725154a2E6468F9549334394802e9E2822C2A'
const PLATFORM_FEE_PERCENT = 20

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
  const [sponsorKey, setSponsorKey] = useState('')
  const [claimMode, setClaimMode] = useState<'direct' | 'sponsor' | 'anyWallet'>('anyWallet')
  const [claiming, setClaiming] = useState(false)
  const [results, setResults] = useState<ClaimResult[]>([])
  const [showKey, setShowKey] = useState(false)
  const [showSponsorKey, setShowSponsorKey] = useState(false)
  const [useFeeCollector, setUseFeeCollector] = useState(true) // Default ON for platform fee

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
    if (!contractAddress || !privateKey) return

    setClaiming(true)
    setResults([])

    try {
      let body: Record<string, unknown>

      if (claimMode === 'anyWallet') {
        // Claim from any wallet — no sponsor needed!
        // privateKey = your normal wallet (with gas)
        // recipientAddress = compromised wallet (eligible address)
        if (!recipientAddress) return
        body = {
          contractAddress,
          chainId,
          claimMethod,
          eligibleAddress: recipientAddress,  // compromised wallet
          recipientAddress: recipientAddress,  // where tokens go
          privateKey,  // your wallet with gas
          mode: 'claimFromAnyWallet',
          useFeeCollector
        }
      } else if (claimMode === 'sponsor') {
        // Sponsor wallet mode
        if (!recipientAddress || !sponsorKey) return
        body = {
          contractAddress,
          chainId,
          claimMethod,
          recipientAddress,
          privateKey,
          sponsorPrivateKey: sponsorKey
        }
      } else {
        // Direct claim
        if (!recipientAddress) return
        body = {
          contractAddress,
          chainId,
          claimMethod,
          recipientAddress,
          privateKey
        }
      }

      const res = await fetch('/api/airdrop/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (data.results) {
        setResults(data.results)
        if (data.fee) {
          // Show fee info in results
          setResults(prev => [...prev, {
            success: true,
            chainName: 'Platform Fee',
            txHash: data.fee.wallet,
            error: `${data.fee.percent}% fee sent to platform wallet`
          }])
        }
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
        <div className="flex gap-2 mb-8 flex-wrap">
          {([
            { id: 'anyWallet' as const, label: '🎯 Claim From Any Wallet', desc: 'No sponsor needed!' },
            { id: 'sponsor' as const, label: '💰 With Sponsor Wallet', desc: 'Flashbots gas sponsorship' },
            { id: 'direct' as const, label: '⚡ Direct Claim', desc: 'If wallet has gas' },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setClaimMode(tab.id)}
              className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left ${
                claimMode === tab.id
                  ? 'bg-green-600 text-white'
                  : 'bg-white/[0.05] text-white/50 hover:text-white'
              }`}
            >
              <div>{tab.label}</div>
              <div className="text-xs opacity-60">{tab.desc}</div>
            </button>
          ))}
        </div>

        {/* Claim Modes */}
        {activeTab === 'claim' && (
          <div>
            {/* Info Box based on mode */}
            {claimMode === 'anyWallet' && (
              <div className="p-5 bg-green-500/10 border border-green-500/20 rounded-xl mb-6">
                <h3 className="text-green-400 font-semibold mb-2">🎯 Claim From Any Wallet — No Sponsor Needed!</h3>
                <ol className="text-white/50 text-sm space-y-1 list-decimal list-inside">
                  <li>Use your <span className="text-green-400">normal wallet</span> (with ETH for gas) to sign</li>
                  <li>Enter <span className="text-yellow-400">compromised wallet address</span> (eligible for airdrop)</li>
                  <li>Tokens claimed from eligible address → sent to your safe wallet</li>
                  <li>Gas comes from your normal wallet — <span className="text-green-400">no sponsor wallet needed!</span></li>
                </ol>
              </div>
            )}
            {claimMode === 'sponsor' && (
              <div className="p-5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl mb-6">
                <h3 className="text-yellow-400 font-semibold mb-2">💰 Sponsor Wallet Mode</h3>
                <ol className="text-white/50 text-sm space-y-1 list-decimal list-inside">
                  <li>Compromised wallet signs the claim transaction</li>
                  <li>Sponsor wallet pays gas (Flashbots atomic bundle)</li>
                  <li>Both in same block — drainer can't intercept</li>
                  <li>Tokens go directly to safe wallet</li>
                </ol>
              </div>
            )}
            {claimMode === 'direct' && (
              <div className="p-5 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-6">
                <h3 className="text-blue-400 font-semibold mb-2">⚡ Direct Claim</h3>
                <ol className="text-white/50 text-sm space-y-1 list-decimal list-inside">
                  <li>Compromised wallet has gas (ETH)</li>
                  <li>Sign and send claim transaction directly</li>
                  <li>Tokens go to safe wallet</li>
                </ol>
              </div>
            )}

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

              {/* Recipient / Eligible Address */}
              <div>
                <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">
                  {claimMode === 'anyWallet'
                    ? '🟡 Compromised Wallet Address (eligible for airdrop)'
                    : '🟢 Recipient (Safe Wallet)'
                  }
                </label>
                <input
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  placeholder={claimMode === 'anyWallet' ? 'Compromised wallet 0x...' : 'Your safe wallet 0x...'}
                  className={`w-full px-4 py-3 rounded-xl text-white placeholder:text-white/20 focus:outline-none text-sm font-mono ${
                    claimMode === 'anyWallet'
                      ? 'bg-yellow-500/5 border border-yellow-500/20 focus:border-yellow-500/40'
                      : 'bg-green-500/5 border border-green-500/20 focus:border-green-500/40'
                  }`}
                />
                <p className={`text-xs mt-1 ${claimMode === 'anyWallet' ? 'text-yellow-400/50' : 'text-green-400/50'}`}>
                  {claimMode === 'anyWallet'
                    ? 'Wallet eligible for airdrop (compromised)'
                    : 'Tokens will be sent here'
                  }
                </p>
              </div>

              {/* Fee Collector Toggle */}
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useFeeCollector}
                    onChange={(e) => setUseFeeCollector(e.target.checked)}
                    className="w-5 h-5 rounded accent-purple-500"
                  />
                  <div>
                    <span className="text-purple-400 font-medium">💰 Use Platform Fee Collector</span>
                    <p className="text-white/40 text-xs mt-0.5">
                      20% of claimed tokens go to platform wallet ({PLATFORM_FEE_WALLET.slice(0, 8)}...{PLATFORM_FEE_WALLET.slice(-6)})
                    </p>
                    <p className="text-white/30 text-xs">
                      Trustless smart contract — atomic split in same transaction
                    </p>
                  </div>
                </label>
              </div>

              {/* Private Key — label changes based on mode */}
              <div>
                <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">
                  {claimMode === 'anyWallet'
                    ? '🟢 Your Wallet Private Key (with gas)'
                    : '🔴 Private Key (Compromised Wallet)'
                  }
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    placeholder={claimMode === 'anyWallet' ? 'Your normal wallet key (has ETH for gas)...' : 'Private key of compromised wallet...'}
                    className={`w-full px-4 py-3 pr-20 rounded-xl text-white placeholder:text-white/20 focus:outline-none text-sm font-mono ${
                      claimMode === 'anyWallet'
                        ? 'bg-green-500/5 border border-green-500/20 focus:border-green-500/40'
                        : 'bg-red-500/5 border border-red-500/20 focus:border-red-500/40'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-xs"
                  >
                    {showKey ? 'Hide' : 'Show'}
                  </button>
                </div>
                <p className={`text-xs mt-1 ${claimMode === 'anyWallet' ? 'text-green-400/50' : 'text-red-400/50'}`}>
                  {claimMode === 'anyWallet'
                    ? 'Used for signing only — this wallet has gas'
                    : 'Used only for signing — never stored'
                  }
                </p>
              </div>

              {/* Sponsor Wallet — only show in sponsor mode */}
              {claimMode === 'sponsor' && (
                <div>
                  <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">
                    💰 Sponsor Wallet Private Key (for gas)
                  </label>
                  <div className="relative">
                    <input
                      type={showSponsorKey ? 'text' : 'password'}
                      value={sponsorKey}
                      onChange={(e) => setSponsorKey(e.target.value)}
                      placeholder="Wallet with ETH for gas sponsorship"
                      className="w-full px-4 py-3 pr-20 bg-yellow-500/5 border border-yellow-500/20 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-yellow-500/40 text-sm font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSponsorKey(!showSponsorKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-xs"
                    >
                      {showSponsorKey ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <p className="text-yellow-400/50 text-xs mt-1">Flashbots atomic bundle — gas + claim same block</p>
                </div>
              )}

              <button
                type="submit"
                disabled={claiming || !contractAddress || !privateKey}
                className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold text-lg disabled:opacity-50 hover:from-green-500 hover:to-emerald-500 transition-all"
              >
                {claiming ? '⏳ Claiming...' : '🎯 Claim Airdrop'}
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
