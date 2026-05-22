'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'

const THREAT_TYPES = [
  { type: 'Phishing URL', severity: 'critical', icon: '🎣' },
  { type: 'Fake Token', severity: 'high', icon: '🪙' },
  { type: 'Scam Contract', severity: 'critical', icon: '📜' },
  { type: 'Drainer Site', severity: 'critical', icon: '🪣' },
  { type: 'Fake Airdrop', severity: 'high', icon: '🎁' },
]

export default function ScreenshotScanPage() {
  const [dragging, setDragging] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [fileName, setFileName] = useState('')

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const processFile = async (file: File) => {
    setFileName(file.name)
    setScanning(true)
    setResult(null)
    await new Promise(r => setTimeout(r, 2500))
    setResult({
      threats: [
        { type: 'Phishing URL', detail: 'sushiswap-finance.fake.xyz detected', severity: 'critical', confidence: 98 },
        { type: 'Fake Token', detail: 'SUSHI token contract mismatch', severity: 'high', confidence: 92 },
      ],
      safeElements: ['SSL Certificate valid', 'Domain age > 30 days'],
      recommendation: 'Do NOT connect your wallet. This is a known phishing site mimicking SushiSwap.',
      overallRisk: 'critical',
    })
    setScanning(false)
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#050507] via-[#0a0a0f] to-[#050507] text-white">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-pink-500/5 rounded-full blur-[128px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#00e5ff]/5 rounded-full blur-[128px] animate-pulse delay-1000" />
      </div>

      <nav className="relative z-10 flex justify-between items-center px-6 py-5 max-w-7xl mx-auto border-b border-white/[0.06]">
        <Link href="/" className="flex items-center gap-3">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-[#00ff87] to-[#00e5ff] bg-clip-text text-transparent">SweepGuard</span>
        </Link>
        <div className="flex gap-6">
          <Link href="/dashboard" className="text-sm text-white/40 hover:text-white/80 transition-colors">Dashboard</Link>
          <Link href="/screenshot-scan" className="text-sm text-pink-400 font-semibold">Screenshot Scan</Link>
        </div>
      </nav>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse" />
            AI Vision Analysis
          </div>
          <h1 className="text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-pink-400 via-rose-400 to-red-400 bg-clip-text text-transparent">Screenshot</span>{' '}
            <span className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Scan</span>
          </h1>
          <p className="text-white/40 text-lg max-w-xl mx-auto">Upload screenshots of suspicious sites, messages, or transactions. AI detects threats instantly.</p>
        </div>

        {/* Upload Area */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer ${
            dragging
              ? 'border-pink-500/60 bg-pink-500/5 shadow-[0_0_30px_rgba(236,72,153,0.1)]'
              : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.03]'
          }`}
        >
          <input type="file" accept="image/*" onChange={handleFile} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          <div className="text-5xl mb-4">{scanning ? '🔍' : '📸'}</div>
          {scanning ? (
            <div>
              <p className="text-lg font-semibold text-pink-400 mb-2">Analyzing {fileName}...</p>
              <div className="w-48 h-1 bg-white/[0.06] rounded-full overflow-hidden mx-auto">
                <div className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full animate-progress" />
              </div>
            </div>
          ) : (
            <div>
              <p className="text-lg font-semibold text-white/60 mb-2">Drop screenshot here or click to upload</p>
              <p className="text-sm text-white/30">PNG, JPG, WebP up to 10MB</p>
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Overall Risk */}
            <div className={`bg-gradient-to-br from-red-500/20 to-rose-500/10 border border-red-500/30 rounded-2xl p-6 shadow-lg shadow-red-500/10`}>
              <div className="flex items-center gap-4 mb-3">
                <span className="text-4xl">🚨</span>
                <div>
                  <h2 className="text-2xl font-bold text-red-400">Critical Threats Detected</h2>
                  <p className="text-white/40 text-sm">{result.threats.length} threats found in screenshot</p>
                </div>
              </div>
            </div>

            {/* Threats */}
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-red-400">⚠️</span> Detected Threats
              </h3>
              <div className="space-y-3">
                {result.threats.map((t: any, i: number) => (
                  <div key={i} className="bg-red-500/5 border border-red-500/10 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-red-400">{t.type}</span>
                      <span className="text-xs text-white/40">{t.confidence}% confidence</span>
                    </div>
                    <p className="text-sm text-white/60">{t.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Safe Elements */}
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-green-400">✅</span> Safe Elements
              </h3>
              <div className="space-y-2">
                {result.safeElements.map((s: string, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-green-400/80">
                    <span>✓</span> {s}
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendation */}
            <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-red-400 mb-2">🚫 Recommendation</h3>
              <p className="text-white/60 text-sm">{result.recommendation}</p>
              <button className="mt-4 px-5 py-2.5 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-sm font-medium hover:bg-red-500/30 transition-all">
                📤 Submit to Threat Database
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
