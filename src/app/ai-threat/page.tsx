'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ethers } from 'ethers'
import { CHAINS } from '@/lib/chains'
import AddressInput from '@/components/AddressInput'

type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

interface ThreatResult {
  address: string
  chain: string
  riskLevel: RiskLevel
  score: number
  threats: string[]
  details: {
    balance: string
    txCount: number
    isContract: boolean
    lastActive: string
  }
}

export default function AIThreatPage() {
  const [address, setAddress] = useState('')
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null)
  const [chainId, setChainId] = useState(1)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ThreatResult | null>(null)
  const [error, setError] = useState('')

  const analyzeThreat = async () => {
    const addr = resolvedAddress || address
    if (!addr || !ethers.isAddress(addr)) {
      setError('Please enter a valid EVM address')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const chain = CHAINS[chainId]
      if (!chain) throw new Error('Unsupported chain')

      const provider = new ethers.JsonRpcProvider(chain.rpc)
      const threats: string[] = []
      let score = 0

      const balance = await provider.getBalance(addr)
      const balanceEth = parseFloat(ethers.formatEther(balance))
      const txCount = await provider.getTransactionCount(addr)
      const code = await provider.getCode(addr)
      const isContract = code !== '0x'

      let lastActive = 'Unknown'
      try {
        const block = await provider.getBlock(await provider.getBlockNumber())
        if (block) lastActive = new Date(block.timestamp * 1000).toLocaleDateString()
      } catch { /* ok */ }

      if (isContract) { threats.push('Smart contract address — not an EOA'); score += 20 }
      if (balanceEth === 0) { threats.push('Zero balance — possibly abandoned or drained'); score += 10 }
      if (txCount === 0) { threats.push('No transactions — new or unused address'); score += 15 }
      if (txCount > 10000) { threats.push('Very high transaction count — possible bot or mixer'); score += 25 }

      let riskLevel: RiskLevel = 'low'
      if (score >= 70) riskLevel = 'critical'
      else if (score >= 50) riskLevel = 'high'
      else if (score >= 30) riskLevel = 'medium'

      setResult({
        address: addr,
        chain: chain.name,
        riskLevel,
        score: Math.min(100, score),
        threats,
        details: {
          balance: `${balanceEth.toFixed(4)} ${chain.nativeCurrency}`,
          txCount,
          isContract,
          lastActive,
        }
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  const riskColors: Record<RiskLevel, { bg: string; text: string; border: string }> = {
    low: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
    medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
    high: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
    critical: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  }

  return (
    <main className="min-h-screen bg-[#030305] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-red-500/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-orange-500/[0.03] rounded-full blur-[100px]" />
      </div>

      <nav className="relative z-10 flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">SweepGuard</span>
        </Link>
      </nav>

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">🧠 AI Threat Intelligence</h1>
        <p className="text-white/40 mb-8">Analyze any address for threats, risks, and suspicious activity</p>

        <div className="flex gap-2 mb-4 flex-wrap">
          {Object.values(CHAINS).filter(c => c.id !== 0 && c.id !== 10143).slice(0, 10).map(chain => (
            <button key={chain.id} onClick={() => setChainId(chain.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${chainId === chain.id ? 'bg-green-600 text-white' : 'bg-white/[0.03] text-white/40 hover:text-white'}`}>
              {chain.name}
            </button>
          ))}
        </div>

        <div className="flex gap-3 mb-6">
          <div className="flex-1">
            <AddressInput value={address} onChange={setAddress} onResolved={setResolvedAddress} placeholder="Enter address (0x...) or ENS name" chainId={chainId} />
          </div>
          <button onClick={analyzeThreat} disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl font-semibold disabled:opacity-50">
            {loading ? 'Analyzing...' : '🧠 Analyze'}
          </button>
        </div>

        {error && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">{error}</div>}

        {loading && (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-3 text-orange-400">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              Analyzing address on {CHAINS[chainId]?.name}...
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className={`p-6 rounded-2xl border ${riskColors[result.riskLevel].border} ${riskColors[result.riskLevel].bg}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm text-white/40">Risk Score</div>
                  <div className={`text-4xl font-bold ${riskColors[result.riskLevel].text}`}>{result.score}/100</div>
                </div>
                <div className={`px-4 py-2 rounded-full text-sm font-bold ${riskColors[result.riskLevel].bg} ${riskColors[result.riskLevel].text} border ${riskColors[result.riskLevel].border}`}>
                  {result.riskLevel.toUpperCase()}
                </div>
              </div>
              <div className="w-full bg-white/[0.05] rounded-full h-3">
                <div className={`h-3 rounded-full transition-all ${result.riskLevel === 'critical' ? 'bg-red-500' : result.riskLevel === 'high' ? 'bg-orange-500' : result.riskLevel === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`}
                  style={{ width: `${result.score}%` }} />
              </div>
            </div>

            <div className="p-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
              <h3 className="font-semibold mb-3">📊 Address Details</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><div className="text-white/40">Balance</div><div className="font-medium">{result.details.balance}</div></div>
                <div><div className="text-white/40">Transactions</div><div className="font-medium">{result.details.txCount.toLocaleString()}</div></div>
                <div><div className="text-white/40">Chain</div><div className="font-medium">{result.chain}</div></div>
                <div><div className="text-white/40">Type</div><div className="font-medium">{result.details.isContract ? 'Smart Contract' : 'EOA'}</div></div>
              </div>
            </div>

            {result.threats.length > 0 && (
              <div className="p-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
                <h3 className="font-semibold mb-3">⚠️ Threats Detected</h3>
                <div className="space-y-2">
                  {result.threats.map((threat, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-white/[0.02] rounded-lg">
                      <span className="text-orange-400">⚠️</span>
                      <span className="text-sm text-white/70">{threat}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="text-center py-16 text-white/20">
            <div className="text-5xl mb-4">🧠</div>
            <p>Enter an address to analyze threats</p>
          </div>
        )}
      </div>
    </main>
  )
}
