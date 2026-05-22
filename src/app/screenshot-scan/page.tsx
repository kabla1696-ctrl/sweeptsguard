'use client'

import { useState, useCallback, useRef } from 'react'
import Link from 'next/link'

interface ScanFinding {
  type: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  description: string
  evidence: string
  confidence: number
}

interface ExtractedEntity {
  type: string
  value: string
  riskLevel: 'danger' | 'warning' | 'safe' | 'unknown'
}

interface ScanResult {
  id: string
  riskScore: number
  riskLevel: 'critical' | 'high' | 'medium' | 'low' | 'safe'
  summary: string
  findings: ScanFinding[]
  extractedEntities: ExtractedEntity[]
  ocrText: string
  knownPhishingMatch: boolean
}

export default function ScreenshotScanPage() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState('')
  const [reported, setReported] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, etc.)')
      return
    }
    setFile(f)
    setError('')
    setResult(null)
    setReported(false)
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(f)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  const handleScan = useCallback(async () => {
    if (!file) return
    setScanning(true)
    setError('')
    setResult(null)

    // Simulate AI analysis
    await new Promise(r => setTimeout(r, 2000))

    // Generate a realistic demo result
    const demoResult: ScanResult = {
      id: `scan_${Date.now()}`,
      riskScore: 78,
      riskLevel: 'high',
      summary: 'High risk detected. This screenshot contains multiple indicators of a phishing or scam attempt. Do NOT interact with any links or addresses shown.',
      findings: [
        { type: 'phishing_url', severity: 'critical', description: 'Detected known phishing URL pattern', evidence: 'https://metamask-wallet-verify.com/connect', confidence: 92 },
        { type: 'urgency_tactic', severity: 'high', description: 'Social engineering urgency tactics detected', evidence: 'within 24 hours, act now, limited time', confidence: 85 },
        { type: 'suspicious_pattern', severity: 'high', description: 'Scam indicator keywords found', evidence: 'verify your wallet, connect wallet to claim, urgent action required', confidence: 80 },
        { type: 'impersonation', severity: 'medium', description: 'Possible brand impersonation: MetaMask', evidence: 'Found brand name combined with verify language', confidence: 75 },
      ],
      extractedEntities: [
        { type: 'url', value: 'https://metamask-wallet-verify.com/connect', riskLevel: 'danger' },
        { type: 'address', value: '0x1234567890abcdef1234567890abcdef12345678', riskLevel: 'unknown' },
        { type: 'domain', value: 'metamask-wallet-verify.com', riskLevel: 'danger' },
      ],
      ocrText: 'Connect your MetaMask wallet to verify your account. You have been selected for a special airdrop. Act now - this offer expires within 24 hours. Connect wallet to claim 5 ETH reward.',
      knownPhishingMatch: true,
    }

    setResult(demoResult)
    setScanning(false)
  }, [file])

  const handleReport = useCallback(async () => {
    if (!result) return
    await new Promise(r => setTimeout(r, 800))
    setReported(true)
  }, [result])

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-400 bg-red-500/10 border-red-500/20'
      case 'high': return 'text-orange-400 bg-orange-500/10 border-orange-500/20'
      case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
      case 'safe': return 'text-green-400 bg-green-500/10 border-green-500/20'
      default: return 'text-white/40 bg-white/[0.03] border-white/[0.06]'
    }
  }

  const getEntityColor = (risk: string) => {
    switch (risk) {
      case 'danger': return 'text-red-400 bg-red-500/10'
      case 'warning': return 'text-yellow-400 bg-yellow-500/10'
      case 'safe': return 'text-green-400 bg-green-500/10'
      default: return 'text-white/40 bg-white/[0.03]'
    }
  }

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'url': return '🔗'
      case 'address': return '📍'
      case 'domain': return '🌐'
      case 'email': return '📧'
      case 'seed_phrase': return '🔑'
      default: return '📄'
    }
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
          <Link href="/scan" className="text-sm text-white/50 hover:text-white">Scan</Link>
          <Link href="/dashboard" className="text-sm text-white/50 hover:text-white">Dashboard</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">Screenshot-to-Scan</span>
          </h1>
          <p className="text-white/40">Upload a screenshot of a suspicious message, website, or conversation. AI will analyze it for scam indicators.</p>
        </div>

        {/* Upload Area */}
        {!result && (
          <div className="space-y-6">
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
                preview ? 'border-green-500/30 bg-green-500/5' : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15]'
              }`}
            >
              {preview ? (
                <div className="space-y-4">
                  <img src={preview} alt="Screenshot preview" className="max-h-64 mx-auto rounded-xl border border-white/[0.06]" />
                  <p className="text-white/40 text-sm">{file?.name}</p>
                  <button
                    onClick={() => { setFile(null); setPreview(null); setResult(null) }}
                    className="text-xs text-white/30 hover:text-white/50 underline"
                  >
                    Remove & upload different
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-5xl">📸</div>
                  <div>
                    <p className="text-white/60 text-sm mb-1">Drag & drop your screenshot here</p>
                    <p className="text-white/30 text-xs">or click to browse files</p>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm hover:bg-white/[0.08] transition-all"
                  >
                    Browse Files
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>
            )}

            {file && !scanning && (
              <button
                onClick={handleScan}
                className="w-full py-4 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl font-semibold text-sm hover:from-orange-500 hover:to-red-500 transition-all"
              >
                🔍 Analyze Screenshot
              </button>
            )}

            {scanning && (
              <div className="p-8 bg-white/[0.02] border border-white/[0.06] rounded-2xl text-center space-y-4">
                <div className="w-12 h-12 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto" />
                <p className="text-white/60 text-sm">Analyzing screenshot for threats...</p>
                <div className="flex justify-center gap-6 text-xs text-white/30">
                  <span>🔍 OCR extraction</span>
                  <span>🧠 Pattern analysis</span>
                  <span>🛡️ Threat detection</span>
                </div>
              </div>
            )}

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              {[
                { icon: '🔍', title: 'OCR Extraction', desc: 'Extracts addresses, URLs, and text from screenshots' },
                { icon: '🧠', title: 'AI Analysis', desc: 'Detects phishing patterns, urgency tactics, and impersonation' },
                { icon: '🛡️', title: 'Threat Database', desc: 'Cross-references against known scam addresses and URLs' },
              ].map(f => (
                <div key={f.title} className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl text-center">
                  <span className="text-2xl">{f.icon}</span>
                  <h3 className="text-sm font-medium mt-2">{f.title}</h3>
                  <p className="text-xs text-white/30 mt-1">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Risk Score */}
            <div className={`p-6 rounded-2xl border ${getRiskColor(result.riskLevel)}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Risk Assessment</h2>
                <span className="text-4xl font-bold">{result.riskScore}</span>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(result.riskLevel)}`}>
                  {result.riskLevel.toUpperCase()} RISK
                </span>
                {result.knownPhishingMatch && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/20">
                    ⚠️ Known Phishing Match
                  </span>
                )}
              </div>
              <p className="text-white/60 text-sm">{result.summary}</p>
            </div>

            {/* Findings */}
            {result.findings.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Findings ({result.findings.length})</h3>
                <div className="space-y-2">
                  {result.findings.map((f, i) => (
                    <div key={i} className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                      <div className="flex items-start gap-3">
                        <span className={f.severity === 'critical' ? 'text-red-400' : f.severity === 'high' ? 'text-orange-400' : f.severity === 'medium' ? 'text-yellow-400' : 'text-blue-400'}>
                          {f.severity === 'critical' ? '🚨' : f.severity === 'high' ? '⚠️' : f.severity === 'medium' ? '🟡' : 'ℹ️'}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{f.description}</span>
                            <span className="text-xs text-white/30">{f.confidence}% confidence</span>
                          </div>
                          <p className="text-white/30 text-xs mt-1 font-mono">{f.evidence}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Extracted Entities */}
            {result.extractedEntities.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Extracted Entities ({result.extractedEntities.length})</h3>
                <div className="space-y-2">
                  {result.extractedEntities.map((e, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                      <span>{getEntityIcon(e.type)}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getEntityColor(e.riskLevel)}`}>
                        {e.type}
                      </span>
                      <span className="text-sm font-mono text-white/60 flex-1 truncate">{e.value}</span>
                      <span className={`text-xs ${e.riskLevel === 'danger' ? 'text-red-400' : e.riskLevel === 'warning' ? 'text-yellow-400' : 'text-white/30'}`}>
                        {e.riskLevel}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* OCR Text */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Extracted Text</h3>
              <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                <p className="text-white/50 text-sm font-mono whitespace-pre-wrap">{result.ocrText}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleReport}
                disabled={reported}
                className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${
                  reported
                    ? 'bg-green-600/20 border border-green-500/20 text-green-400'
                    : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500'
                }`}
              >
                {reported ? '✅ Reported to Community' : '📢 Report Scam to Community'}
              </button>
              <button
                onClick={() => { setFile(null); setPreview(null); setResult(null) }}
                className="px-6 py-3 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm hover:bg-white/[0.08] transition-all"
              >
                New Scan
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
