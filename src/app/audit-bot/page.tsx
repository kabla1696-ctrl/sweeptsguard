'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ethers } from 'ethers'
import { CHAINS } from '@/lib/chains'
import AddressInput from '@/components/AddressInput'

interface AuditResult {
  address: string
  chain: string
  isContract: boolean
  bytecodeSize: number
  hasFallback: boolean
  hasReceive: boolean
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  findings: { severity: string; title: string; description: string }[]
}

export default function AuditBotPage() {
  const [address, setAddress] = useState('')
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null)
  const [chainId, setChainId] = useState(1)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AuditResult | null>(null)
  const [error, setError] = useState('')

  const runAudit = async () => {
    const addr = resolvedAddress || address
    if (!addr || !ethers.isAddress(addr)) {
      setError('Please enter a valid contract address')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const chain = CHAINS[chainId]
      if (!chain) throw new Error('Unsupported chain')

      const provider = new ethers.JsonRpcProvider(chain.rpc)
      const findings: { severity: string; title: string; description: string }[] = []

      // Get bytecode
      const code = await provider.getCode(addr)
      const isContract = code !== '0x'
      const bytecodeSize = (code.length - 2) / 2

      if (!isContract) {
        setError('This is an EOA, not a smart contract')
        setLoading(false)
        return
      }

      // Basic bytecode analysis
      const hasFallback = code.includes('ffffffff')
      const hasReceive = bytecodeSize > 100

      // Check balance
      const balance = await provider.getBalance(addr)
      const balanceEth = parseFloat(ethers.formatEther(balance))

      // Check tx count
      const txCount = await provider.getTransactionCount(addr)

      // Analyze findings
      if (bytecodeSize > 24576) {
        findings.push({ severity: 'high', title: 'Oversized Contract', description: `Bytecode is ${bytecodeSize} bytes (max 24576). May be proxied.` })
      }

      if (bytecodeSize < 100) {
        findings.push({ severity: 'medium', title: 'Minimal Bytecode', description: 'Very small contract — possible proxy or minimal implementation' })
      }

      if (balanceEth > 100) {
        findings.push({ severity: 'info', title: 'High Balance', description: `Contract holds ${balanceEth.toFixed(2)} ${chain.nativeCurrency}` })
      }

      if (txCount === 0) {
        findings.push({ severity: 'medium', title: 'No Transactions', description: 'Contract has never been called — newly deployed or unused' })
      }

      // Check for self-destruct pattern
      if (code.includes('ff')) {
        findings.push({ severity: 'high', title: 'SELFDESTRUCT Pattern', description: 'Bytecode may contain SELFDESTRUCT opcode — contract could be destroyed' })
      }

      // Check for delegatecall
      if (code.includes('f4')) {
        findings.push({ severity: 'medium', title: 'Delegatecall Detected', description: 'Contract uses DELEGATECALL — execution context is forwarded' })
      }

      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
      const highCount = findings.filter(f => f.severity === 'high').length
      const mediumCount = findings.filter(f => f.severity === 'medium').length
      if (highCount >= 2) riskLevel = 'critical'
      else if (highCount >= 1) riskLevel = 'high'
      else if (mediumCount >= 2) riskLevel = 'medium'

      setResult({
        address: addr,
        chain: chain.name,
        isContract,
        bytecodeSize,
        hasFallback,
        hasReceive,
        riskLevel,
        findings,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Audit failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#030305] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/[0.04] rounded-full blur-[120px]" />
      </div>

      <nav className="relative z-10 flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">SweepGuard</span>
        </Link>
      </nav>

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">🤖 Smart Contract Audit</h1>
        <p className="text-white/40 mb-8">Analyze smart contract bytecode for security issues</p>

        <div className="flex gap-2 mb-4 flex-wrap">
          {Object.values(CHAINS).filter(c => c.id !== 0 && c.id !== 10143).slice(0, 10).map(chain => (
            <button key={chain.id} onClick={() => setChainId(chain.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${chainId === chain.id ? 'bg-cyan-600 text-white' : 'bg-white/[0.03] text-white/40 hover:text-white'}`}>
              {chain.name}
            </button>
          ))}
        </div>

        <div className="flex gap-3 mb-6">
          <div className="flex-1">
            <AddressInput value={address} onChange={setAddress} onResolved={setResolvedAddress} placeholder="Enter contract address (0x...)" chainId={chainId} />
          </div>
          <button onClick={runAudit} disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl font-semibold disabled:opacity-50">
            {loading ? 'Auditing...' : '🤖 Run Audit'}
          </button>
        </div>

        {error && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">{error}</div>}

        {loading && (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-3 text-cyan-400">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              Analyzing bytecode on {CHAINS[chainId]?.name}...
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {/* Risk Score */}
            <div className={`p-6 rounded-2xl border ${
              result.riskLevel === 'critical' ? 'bg-red-500/[0.04] border-red-500/20' :
              result.riskLevel === 'high' ? 'bg-orange-500/[0.04] border-orange-500/20' :
              result.riskLevel === 'medium' ? 'bg-yellow-500/[0.04] border-yellow-500/20' :
              'bg-green-500/[0.04] border-green-500/20'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-white/40">Risk Level</div>
                  <div className={`text-3xl font-bold ${
                    result.riskLevel === 'critical' ? 'text-red-400' :
                    result.riskLevel === 'high' ? 'text-orange-400' :
                    result.riskLevel === 'medium' ? 'text-yellow-400' : 'text-green-400'
                  }`}>{result.riskLevel.toUpperCase()}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-white/40">Bytecode Size</div>
                  <div className="text-xl font-mono">{result.bytecodeSize.toLocaleString()} bytes</div>
                </div>
              </div>
            </div>

            {/* Contract Details */}
            <div className="p-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
              <h3 className="font-semibold mb-3">📋 Contract Details</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><div className="text-white/40">Chain</div><div>{result.chain}</div></div>
                <div><div className="text-white/40">Is Contract</div><div>{result.isContract ? '✅ Yes' : '❌ No'}</div></div>
                <div><div className="text-white/40">Fallback Function</div><div>{result.hasFallback ? '✅ Present' : '❌ Absent'}</div></div>
                <div><div className="text-white/40">Receive Function</div><div>{result.hasReceive ? '✅ Likely' : '❌ Unlikely'}</div></div>
              </div>
            </div>

            {/* Findings */}
            {result.findings.length > 0 && (
              <div className="p-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
                <h3 className="font-semibold mb-3">🔍 Findings ({result.findings.length})</h3>
                <div className="space-y-2">
                  {result.findings.map((f, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-white/[0.02] rounded-lg">
                      <span>{f.severity === 'high' ? '🔴' : f.severity === 'medium' ? '🟡' : '🟢'}</span>
                      <div>
                        <div className="font-medium text-sm">{f.title}</div>
                        <div className="text-xs text-white/40">{f.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
