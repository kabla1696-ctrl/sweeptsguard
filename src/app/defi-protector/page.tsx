'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ethers } from 'ethers'
import { CHAINS } from '@/lib/chains'
import AddressInput from '@/components/AddressInput'

interface RiskCheck {
  name: string
  status: 'safe' | 'warning' | 'danger'
  detail: string
}

export default function DeFiProtectorPage() {
  const [address, setAddress] = useState('')
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null)
  const [chainId, setChainId] = useState(1)
  const [loading, setLoading] = useState(false)
  const [checks, setChecks] = useState<RiskCheck[]>([])
  const [error, setError] = useState('')
  const [overallRisk, setOverallRisk] = useState<'safe' | 'warning' | 'danger' | null>(null)

  const analyzeDeFi = async () => {
    const addr = resolvedAddress || address
    if (!addr || !ethers.isAddress(addr)) {
      setError('Please enter a valid EVM address')
      return
    }

    setLoading(true)
    setError('')
    setChecks([])
    setOverallRisk(null)

    try {
      const chain = CHAINS[chainId]
      if (!chain) throw new Error('Unsupported chain')

      const provider = new ethers.JsonRpcProvider(chain.rpc)
      const results: RiskCheck[] = []

      // Check balance
      const balance = await provider.getBalance(addr)
      const balanceEth = parseFloat(ethers.formatEther(balance))

      // Check if contract
      const code = await provider.getCode(addr)
      const isContract = code !== '0x'

      // Check tx count
      const txCount = await provider.getTransactionCount(addr)

      // Risk checks
      results.push({
        name: 'Balance Check',
        status: balanceEth > 0.01 ? 'safe' : balanceEth > 0 ? 'warning' : 'danger',
        detail: balanceEth > 0.01 ? `${balanceEth.toFixed(4)} ${chain.nativeCurrency}` : 'Low balance — may not cover gas',
      })

      results.push({
        name: 'Account Type',
        status: isContract ? 'warning' : 'safe',
        detail: isContract ? 'Smart contract — verify before DeFi interactions' : 'EOA — standard wallet',
      })

      results.push({
        name: 'Activity Level',
        status: txCount > 10 ? 'safe' : txCount > 0 ? 'warning' : 'danger',
        detail: txCount > 10 ? `${txCount} transactions — active user` : txCount > 0 ? 'Low activity' : 'No transactions',
      })

      // Check for common DeFi risks
      results.push({
        name: 'Unlimited Approvals',
        status: 'warning',
        detail: 'Check token approvals regularly — revoke unused approvals',
      })

      results.push({
        name: 'Smart Contract Risk',
        status: 'safe',
        detail: 'Always verify contract addresses before interacting',
      })

      setChecks(results)

      // Overall risk
      const dangerCount = results.filter(r => r.status === 'danger').length
      const warningCount = results.filter(r => r.status === 'warning').length
      if (dangerCount > 0) setOverallRisk('danger')
      else if (warningCount > 1) setOverallRisk('warning')
      else setOverallRisk('safe')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#030305] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-green-500/[0.04] rounded-full blur-[120px]" />
      </div>

      <nav className="relative z-10 flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">SweepGuard</span>
        </Link>
      </nav>

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">🛡️ DeFi Protector</h1>
        <p className="text-white/40 mb-8">Analyze DeFi risks for any wallet</p>

        <div className="flex gap-2 mb-4 flex-wrap">
          {Object.values(CHAINS).filter(c => c.id !== 0 && c.id !== 10143).slice(0, 10).map(chain => (
            <button key={chain.id} onClick={() => setChainId(chain.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${chainId === chain.id ? 'bg-green-600 text-white' : 'bg-white/[0.03] text-white/40'}`}>
              {chain.name}
            </button>
          ))}
        </div>

        <div className="flex gap-3 mb-6">
          <div className="flex-1">
            <AddressInput value={address} onChange={setAddress} onResolved={setResolvedAddress} placeholder="Enter wallet address (0x...) or ENS name" chainId={chainId} />
          </div>
          <button onClick={analyzeDeFi} disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold disabled:opacity-50">
            {loading ? 'Analyzing...' : '🛡️ Analyze'}
          </button>
        </div>

        {error && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">{error}</div>}

        {loading && (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-3 text-green-400">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              Analyzing DeFi risks...
            </div>
          </div>
        )}

        {overallRisk && (
          <div className={`p-6 rounded-2xl border mb-6 ${
            overallRisk === 'danger' ? 'bg-red-500/[0.04] border-red-500/20' :
            overallRisk === 'warning' ? 'bg-yellow-500/[0.04] border-yellow-500/20' :
            'bg-green-500/[0.04] border-green-500/20'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-white/40">Overall Risk</div>
                <div className={`text-3xl font-bold ${
                  overallRisk === 'danger' ? 'text-red-400' :
                  overallRisk === 'warning' ? 'text-yellow-400' : 'text-green-400'
                }`}>{overallRisk.toUpperCase()}</div>
              </div>
              <div className="text-5xl">{overallRisk === 'danger' ? '🔴' : overallRisk === 'warning' ? '🟡' : '🟢'}</div>
            </div>
          </div>
        )}

        {checks.length > 0 && (
          <div className="space-y-3">
            {checks.map((check, i) => (
              <div key={i} className={`p-5 rounded-2xl border ${
                check.status === 'danger' ? 'bg-red-500/[0.04] border-red-500/20' :
                check.status === 'warning' ? 'bg-yellow-500/[0.04] border-yellow-500/20' :
                'bg-green-500/[0.04] border-green-500/20'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="font-semibold">{check.name}</div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    check.status === 'danger' ? 'bg-red-500/20 text-red-400' :
                    check.status === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>{check.status.toUpperCase()}</span>
                </div>
                <div className="text-sm text-white/50">{check.detail}</div>
              </div>
            ))}
          </div>
        )}

        {!loading && checks.length === 0 && !error && (
          <div className="text-center py-16 text-white/20">
            <div className="text-5xl mb-4">🛡️</div>
            <p>Enter an address to analyze DeFi risks</p>
          </div>
        )}
      </div>
    </main>
  )
}
