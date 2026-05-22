'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import {
  verifyContract,
  batchVerify,
  getVerificationHistory,
  formatStatus,
  formatRisk,
  type VerificationResult,
  type BatchVerificationJob,
  type RiskFlag,
} from '@/lib/contractVerifier'

type Tab = 'verify' | 'batch' | 'history'

export default function ContractVerifyPage() {
  const [activeTab, setActiveTab] = useState<Tab>('verify')
  const [address, setAddress] = useState('')
  const [chainId, setChainId] = useState(1)
  const [verifying, setVerifying] = useState(false)
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Batch state
  const [batchAddresses, setBatchAddresses] = useState('')
  const [batchJob, setBatchJob] = useState<BatchVerificationJob | null>(null)
  const [batchRunning, setBatchRunning] = useState(false)

  // History
  const [history, setHistory] = useState<VerificationResult[]>([])

  const handleVerify = useCallback(async () => {
    if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address.trim())) {
      setError('Please enter a valid contract address (0x...)')
      return
    }

    setVerifying(true)
    setError('')
    setResult(null)

    try {
      const res = await verifyContract(address.trim(), chainId)
      setResult(res)
      setSuccess('Verification complete')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Verification failed. Please try again.')
    } finally {
      setVerifying(false)
    }
  }, [address, chainId])

  const handleBatch = useCallback(async () => {
    const addresses = batchAddresses
      .split(/[\n,]+/)
      .map(a => a.trim())
      .filter(a => /^0x[0-9a-fA-F]{40}$/.test(a))

    if (addresses.length === 0) {
      setError('Enter at least one valid address (comma or newline separated)')
      return
    }

    setBatchRunning(true)
    setError('')

    try {
      const job = await batchVerify(addresses, chainId)
      setBatchJob(job)
      setSuccess(`Batch complete: ${job.results.length} contracts verified`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Batch verification failed')
    } finally {
      setBatchRunning(false)
    }
  }, [batchAddresses, chainId])

  const loadHistory = () => {
    setHistory(getVerificationHistory(50))
  }

  const severityColors: Record<string, { bg: string; text: string; border: string }> = {
    critical: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
    warning: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
    info: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Nav */}
      <nav className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">SweepGuard</span>
        </Link>
        <div className="flex gap-4">
          <Link href="/scan" className="text-sm text-white/50 hover:text-white transition-colors">Scan</Link>
          <Link href="/dashboard" className="text-sm text-white/50 hover:text-white transition-colors">Dashboard</Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-start gap-3 mb-10">
          <span className="text-4xl">🔍</span>
          <div>
            <h1 className="text-3xl font-bold">Contract Verification Scanner</h1>
            <p className="text-white/40">Verify source code, detect drainer contracts, analyze bytecode risk</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 p-1 bg-white/[0.02] border border-white/[0.05] rounded-xl w-fit">
          {(['verify', 'batch', 'history'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); if (tab === 'history') loadHistory() }}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {tab === 'verify' ? '🔍 Verify' : tab === 'batch' ? '📦 Batch' : '📜 History'}
            </button>
          ))}
        </div>

        {/* Toasts */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6 flex items-center gap-2">
            <span>❌</span> {error}
            <button onClick={() => setError('')} className="ml-auto text-red-400/50 hover:text-red-400">✕</button>
          </div>
        )}
        {success && (
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm mb-6 flex items-center gap-2">
            <span>✅</span> {success}
          </div>
        )}

        {/* ── Verify Tab ── */}
        {activeTab === 'verify' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
              <h3 className="text-lg font-semibold mb-4">Verify Contract</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Contract address (0x...)"
                  className="md:col-span-2 px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/40 text-sm font-mono"
                />
                <select
                  value={chainId}
                  onChange={e => setChainId(Number(e.target.value))}
                  className="px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white/70 focus:outline-none focus:border-purple-500/40 text-sm appearance-none cursor-pointer"
                >
                  <option value={1} className="bg-[#0a0a0f]">Ethereum</option>
                  <option value={8453} className="bg-[#0a0a0f]">Base</option>
                  <option value={42161} className="bg-[#0a0a0f]">Arbitrum</option>
                  <option value={137} className="bg-[#0a0a0f]">Polygon</option>
                  <option value={10} className="bg-[#0a0a0f]">Optimism</option>
                  <option value={56} className="bg-[#0a0a0f]">BSC</option>
                </select>
                <button
                  onClick={handleVerify}
                  disabled={verifying}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl font-semibold text-sm disabled:opacity-50 hover:from-purple-500 hover:to-indigo-500 transition-all flex items-center justify-center gap-2"
                >
                  {verifying ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" /><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
                      Scanning...
                    </>
                  ) : '🔍 Verify'}
                </button>
              </div>
            </div>

            {/* Results */}
            {result && (
              <div className="space-y-4">
                {/* Status & Risk Overview */}
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{formatStatus(result.status).icon}</span>
                      <div>
                        <h3 className="text-xl font-bold">{formatStatus(result.status).label}</h3>
                        <p className="text-white/40 text-xs font-mono">{result.contract.address}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${formatRisk(result.riskLevel).color}`}>
                        {result.riskScore}/100
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${formatRisk(result.riskLevel).bgColor} ${formatRisk(result.riskLevel).color}`}>
                        {formatRisk(result.riskLevel).icon} {formatRisk(result.riskLevel).label}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                      <p className="text-white/40 text-xs">Compiler</p>
                      <p className="text-sm font-medium text-white/70">{result.contract.compiler || 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                      <p className="text-white/40 text-xs">Bytecode Size</p>
                      <p className="text-sm font-medium text-white/70">{(result.contract.bytecodeSize / 1024).toFixed(1)} KB</p>
                    </div>
                    <div className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                      <p className="text-white/40 text-xs">Similarity Score</p>
                      <p className={`text-sm font-medium ${result.similarity.score >= 70 ? 'text-red-400' : result.similarity.score >= 40 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {result.similarity.score}%
                      </p>
                    </div>
                    <div className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                      <p className="text-white/40 text-xs">Entropy</p>
                      <p className={`text-sm font-medium ${result.bytecodeAnalysis.entropy > 6.5 ? 'text-red-400' : 'text-green-400'}`}>
                        {result.bytecodeAnalysis.entropy.toFixed(2)}/8
                      </p>
                    </div>
                  </div>
                </div>

                {/* Drainer Match */}
                {result.similarity.matchedDrainer && (
                  <div className="p-5 rounded-xl bg-red-500/10 border border-red-500/30">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">🚨</span>
                      <h3 className="text-lg font-bold text-red-400">Known Drainer Detected</h3>
                    </div>
                    <p className="text-red-300 text-sm">
                      Bytecode matches: <strong>{result.similarity.matchedDrainer}</strong>
                    </p>
                    <div className="mt-2 space-y-1">
                      {result.similarity.matchedPatterns.map((p, i) => (
                        <p key={i} className="text-red-400/60 text-xs">• {p}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Risk Flags */}
                {result.flags.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-white/60">⚠️ Risk Flags ({result.flags.length})</h3>
                    {result.flags.map((flag, i) => {
                      const colors = severityColors[flag.severity]
                      return (
                        <div key={i} className={`p-4 rounded-xl ${colors.bg} border ${colors.border}`}>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>
                              {flag.severity.toUpperCase()}
                            </span>
                            <span className="text-white/30 text-xs">{flag.category}</span>
                          </div>
                          <p className={`${colors.text} text-sm mt-1`}>{flag.message}</p>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Bytecode Analysis */}
                <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  <h3 className="text-sm font-semibold text-white/60 mb-3">🔬 Bytecode Analysis</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { label: 'SELFDESTRUCT', value: result.bytecodeAnalysis.hasSelfDestruct, danger: true },
                      { label: 'DELEGATECALL', value: result.bytecodeAnalysis.hasDelegateCall, danger: true },
                      { label: 'External Calls', value: result.bytecodeAnalysis.hasExternalCalls, danger: false },
                      { label: 'Is Proxy', value: result.contract.isProxy, danger: false },
                      { label: 'Complexity', value: result.bytecodeAnalysis.complexity, danger: result.bytecodeAnalysis.complexity === 'high' },
                      { label: 'Functions', value: result.bytecodeAnalysis.functionCount, danger: false },
                    ].map((item, i) => (
                      <div key={i} className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-lg">
                        <p className="text-white/40 text-xs">{item.label}</p>
                        <p className={`text-sm font-medium ${item.danger ? 'text-red-400' : 'text-white/70'}`}>
                          {typeof item.value === 'boolean' ? (item.value ? '⚠️ YES' : '✅ NO') : String(item.value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Batch Tab ── */}
        {activeTab === 'batch' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
              <h3 className="text-lg font-semibold mb-4">Batch Verification</h3>
              <p className="text-white/40 text-sm mb-4">Enter multiple contract addresses (comma or newline separated)</p>
              <textarea
                value={batchAddresses}
                onChange={e => setBatchAddresses(e.target.value)}
                placeholder={"0xabc123...\n0xdef456...\n0xghi789..."}
                rows={6}
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/40 text-sm font-mono resize-none mb-3"
              />
              <div className="flex items-center gap-3">
                <select
                  value={chainId}
                  onChange={e => setChainId(Number(e.target.value))}
                  className="px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white/70 focus:outline-none text-sm appearance-none cursor-pointer"
                >
                  <option value={1} className="bg-[#0a0a0f]">Ethereum</option>
                  <option value={8453} className="bg-[#0a0a0f]">Base</option>
                  <option value={42161} className="bg-[#0a0a0f]">Arbitrum</option>
                  <option value={137} className="bg-[#0a0a0f]">Polygon</option>
                </select>
                <button
                  onClick={handleBatch}
                  disabled={batchRunning}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl font-semibold text-sm disabled:opacity-50 hover:from-purple-500 hover:to-indigo-500 transition-all"
                >
                  {batchRunning ? '⏳ Processing...' : '📦 Verify All'}
                </button>
              </div>
            </div>

            {/* Batch Progress */}
            {batchJob && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-white/60">
                    Results: {batchJob.results.length} / {batchJob.contracts.length}
                  </h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    batchJob.status === 'completed' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
                  }`}>
                    {batchJob.status}
                  </span>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-green-500/5 border border-green-500/10 text-center">
                    <p className="text-2xl font-bold text-green-400">{batchJob.results.filter(r => r.status === 'verified').length}</p>
                    <p className="text-white/40 text-xs">Verified</p>
                  </div>
                  <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10 text-center">
                    <p className="text-2xl font-bold text-red-400">{batchJob.results.filter(r => r.status === 'unverified').length}</p>
                    <p className="text-white/40 text-xs">Unverified</p>
                  </div>
                  <div className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/10 text-center">
                    <p className="text-2xl font-bold text-orange-400">{batchJob.results.filter(r => r.similarity.matchedDrainer).length}</p>
                    <p className="text-white/40 text-xs">Drainer Match</p>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/10 text-center">
                    <p className="text-2xl font-bold text-purple-400">{batchJob.results.filter(r => r.riskLevel === 'critical' || r.riskLevel === 'high').length}</p>
                    <p className="text-white/40 text-xs">High/Critical</p>
                  </div>
                </div>

                {/* Individual Results */}
                {batchJob.results.map((res, i) => {
                  const statusInfo = formatStatus(res.status)
                  const riskInfo = formatRisk(res.riskLevel)
                  return (
                    <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span>{statusInfo.icon}</span>
                          <div>
                            <p className="text-sm font-medium font-mono">{res.contract.address.slice(0, 10)}...{res.contract.address.slice(-8)}</p>
                            <p className="text-white/30 text-xs">{res.contract.name || 'Unverified Contract'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {res.similarity.matchedDrainer && (
                            <span className="text-xs px-2 py-1 rounded-full bg-red-500/15 text-red-400">🚨 DRAINER</span>
                          )}
                          <span className={`text-xs px-2 py-1 rounded-full ${riskInfo.bgColor} ${riskInfo.color}`}>
                            {res.riskScore}/100
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── History Tab ── */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            {history.length > 0 ? history.map((res, i) => {
              const statusInfo = formatStatus(res.status)
              const riskInfo = formatRisk(res.riskLevel)
              return (
                <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{statusInfo.icon}</span>
                      <div>
                        <p className="text-sm font-medium font-mono">{res.contract.address}</p>
                        <p className="text-white/30 text-xs">{res.contract.chainName} • {res.contract.name || 'Unverified'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${riskInfo.bgColor} ${riskInfo.color}`}>
                        {riskInfo.icon} {riskInfo.label}
                      </span>
                      <span className="text-white/20 text-xs">{new Date(res.checkedAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )
            }) : (
              <div className="p-12 rounded-2xl bg-white/[0.02] border border-white/[0.05] text-center">
                <span className="text-4xl block mb-3">📜</span>
                <p className="text-white/40 text-sm">No verification history yet</p>
                <p className="text-white/20 text-xs mt-1">Verified contracts will appear here</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
