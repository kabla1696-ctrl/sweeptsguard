'use client'

import { useState } from 'react'
import Link from 'next/link'

const PLATFORM_FEE_WALLET = '0x7A3725154a2E6468F9549334394802e9E2822C2A'
const PLATFORM_FEE_PERCENT = 20

const SUPPORTED_CHAINS = [
  { id: 1, name: 'Ethereum', token: 'ETH', method: 'Flashbots' },
  { id: 8453, name: 'Base', token: 'ETH', method: 'Rapid-fire' },
  { id: 42161, name: 'Arbitrum', token: 'ETH', method: 'Rapid-fire' },
  { id: 137, name: 'Polygon', token: 'MATIC', method: 'Rapid-fire' },
  { id: 56, name: 'BSC', token: 'BNB', method: 'Rapid-fire' },
  { id: 10, name: 'Optimism', token: 'ETH', method: 'Rapid-fire' },
  { id: 43114, name: 'Avalanche', token: 'AVAX', method: 'Rapid-fire' },
  { id: 250, name: 'Fantom', token: 'FTM', method: 'Rapid-fire' },
  { id: 81457, name: 'Blast', token: 'ETH', method: 'Rapid-fire' },
  { id: 324, name: 'zkSync', token: 'ETH', method: 'Rapid-fire' },
  { id: 59144, name: 'Linea', token: 'ETH', method: 'Rapid-fire' },
  { id: 5000, name: 'Mantle', token: 'MNT', method: 'Rapid-fire' },
  { id: 534352, name: 'Scroll', token: 'ETH', method: 'Rapid-fire' },
  { id: 80094, name: 'Berachain', token: 'BERA', method: 'Rapid-fire' },
  { id: 1329, name: 'Sei', token: 'SEI', method: 'Rapid-fire' },
  { id: 43111, name: 'Hemi', token: 'ETH', method: 'Rapid-fire' },
  { id: 57073, name: 'Ink', token: 'ETH', method: 'Rapid-fire' },
  { id: 1868, name: 'Soneium', token: 'ETH', method: 'Rapid-fire' },
]

interface PreviewData {
  eligible: boolean | null
  alreadyClaimed: boolean
  tokenAddress: string
  tokenSymbol: string
  tokenDecimals: number
  claimableAmount: string
  claimableRaw: string
  safeWalletAmount: string
  platformFeeAmount: string
  sponsorBalance: string
  sponsorGasToken: string
  sponsorHasGas: boolean
  estimatedGasCost: string
  claimDataUsed: string
  needsMerkleProof: boolean
  needsClaimData: boolean
  executionMethod?: string
  executionDescription?: string
  executionSafe?: boolean
  riskLevel?: 'none' | 'low' | 'high'
  contractWarnings?: string[]
  contractSafe?: boolean
  eligibilityWarning?: string
  merkleProofHelp?: string
  error?: string
}

export default function AirdropPage() {
  const [contractAddress, setContractAddress] = useState('')
  const [walletAddress, setWalletAddress] = useState('')
  const [chainId, setChainId] = useState(1)
  const [safeWallet, setSafeWallet] = useState('')
  const [privateKey, setPrivateKey] = useState('')
  const [sponsorKey, setSponsorKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [showSponsorKey, setShowSponsorKey] = useState(false)

  // Optional fields
  const [claimData, setClaimData] = useState('')
  const [merkleProof, setMerkleProof] = useState('')
  const [tokenAmount, setTokenAmount] = useState('')
  const [showOptional, setShowOptional] = useState(false)

  // Flow states
  const [step, setStep] = useState<'input' | 'preview' | 'claiming' | 'done' | 'error'>('input')
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [txHash, setTxHash] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Preview: detect token, eligibility, amount
  const handlePreview = async () => {
    if (!contractAddress || !safeWallet || !privateKey || !sponsorKey || !walletAddress) return

    setPreviewLoading(true)
    setPreviewData(null)
    setErrorMsg('')

    try {
      const res = await fetch('/api/airdrop/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'preview',
          contractAddress,
          chainId,
          safeWallet,
          walletAddress,
          sponsorPrivateKey: sponsorKey,
          privateKey,
          claimData: claimData || undefined,
          merkleProof: merkleProof || undefined,
          tokenAmount: tokenAmount || undefined,
        })
      })
      const data = await res.json()

      if (data.error) {
        setErrorMsg(data.error)
        setStep('error')
      } else {
        setPreviewData(data)
        setStep('preview')
      }
    } catch {
      setErrorMsg('Failed to preview. Check contract address and try again.')
      setStep('error')
    } finally {
      setPreviewLoading(false)
    }
  }

  // Confirm: execute atomic claim via Flashbots bundle
  const handleConfirm = async () => {
    if (!previewData) return

    setStep('claiming')
    setErrorMsg('')

    try {
      const res = await fetch('/api/airdrop/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'claim',
          contractAddress,
          chainId,
          safeWallet,
          walletAddress,
          privateKey,
          sponsorPrivateKey: sponsorKey,
          claimableRaw: previewData.claimableRaw,
          tokenAddress: previewData.tokenAddress,
          claimData: claimData || undefined,
          merkleProof: merkleProof || undefined,
          tokenAmount: tokenAmount || undefined,
        })
      })
      const data = await res.json()

      if (data.success) {
        setTxHash(data.txHash || data.bundleHash || '')
        setStep('done')
      } else {
        setErrorMsg(data.error || 'Claim failed')
        setStep('error')
      }
    } catch {
      setErrorMsg('Transaction failed. Try again.')
      setStep('error')
    }
  }

  const selectedChain = SUPPORTED_CHAINS.find(c => c.id === chainId)

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

      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">🎯 Airdrop Claimer</h1>
        <p className="text-white/40 mb-8">Claim airdrops from compromised wallet → 80% safe wallet, 20% platform fee</p>

        {/* L2 Notice */}
        <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl mb-6">
          <p className="text-orange-400 text-sm">

          </p>
        </div>

        {/* How It Works */}
        <div className="p-5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl mb-8">
          <h3 className="text-yellow-400 font-semibold mb-3">💰 Sponsor Wallet Mode — How It Works</h3>
          <ol className="text-white/50 text-sm space-y-2 list-decimal list-inside">
            <li>Enter airdrop contract & wallet details → system auto-detects token, eligibility & amount</li>
            <li>Compromised wallet signs the claim transaction</li>
            <li>Sponsor wallet pays gas (Flashbots on ETH / rapid-fire on L2s — drainer can't intercept)</li>
            <li>Both TXs in same block — <span className="text-green-400">drainer can&apos;t intercept</span></li>
            <li><span className="text-blue-400">80%</span> tokens → safe wallet | <span className="text-purple-400">20%</span> → platform fee</li>
          </ol>
          <div className="mt-3 p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <p className="text-purple-400 text-xs">🔒 20% platform fee is mandatory — trustless smart contract splits tokens atomically</p>
          </div>
        </div>

        {/* Step 1: Input */}
        {step === 'input' && (
          <div className="space-y-4">
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
                <p className="text-white/20 text-xs mt-1">Token & eligibility auto-detected from contract</p>
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
                  {SUPPORTED_CHAINS.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.token})</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">
                🔴 Compromised Wallet Address
              </label>
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="0x... (address of the compromised wallet)"
                className="w-full px-4 py-3 bg-red-500/5 border border-red-500/20 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/40 text-sm font-mono"
              />
              <p className="text-red-400/50 text-xs mt-1">The wallet that owns the airdrop tokens</p>
            </div>

            <div>
              <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">
                🟢 Safe Wallet Address
              </label>
              <input
                type="text"
                value={safeWallet}
                onChange={(e) => setSafeWallet(e.target.value)}
                placeholder="0x... (where 80% tokens go)"
                className="w-full px-4 py-3 bg-green-500/5 border border-green-500/20 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm font-mono"
              />
            </div>

            <div>
              <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">
                🔴 Compromised Wallet Private Key
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  placeholder="Private key of compromised wallet (for signing)"
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
              <p className="text-red-400/50 text-xs mt-1">Used only for signing — never stored or logged</p>
            </div>

            <div>
              <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">
                💰 Sponsor Wallet Private Key
              </label>
              <div className="relative">
                <input
                  type={showSponsorKey ? 'text' : 'password'}
                  value={sponsorKey}
                  onChange={(e) => setSponsorKey(e.target.value)}
                  placeholder="Wallet with ETH for gas on Ethereum mainnet"
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
              <p className="text-yellow-400/50 text-xs mt-1">Needs {selectedChain?.token || 'ETH'} for gas on {selectedChain?.name || 'Ethereum'}</p>
            </div>

            {/* Optional Fields Toggle */}
            <button
              type="button"
              onClick={() => setShowOptional(!showOptional)}
              className="text-white/30 hover:text-white/60 text-sm flex items-center gap-2"
            >
              {showOptional ? '▼' : '▶'} Advanced Options (optional)
            </button>

            {showOptional && (
              <div className="space-y-4 p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                <div>
                  <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">
                    📄 Claim Data (raw hex, optional)
                  </label>
                  <textarea
                    value={claimData}
                    onChange={(e) => setClaimData(e.target.value)}
                    placeholder="0x... (copy from project's claim page network request or Etherscan)"
                    rows={3}
                    className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm font-mono"
                  />
                  <p className="text-white/20 text-xs mt-1">Paste raw calldata from the project&apos;s claim page if auto-detection fails</p>
                </div>

                <div>
                  <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">
                    🌳 Merkle Proof (JSON array, optional)
                  </label>
                  <textarea
                    value={merkleProof}
                    onChange={(e) => setMerkleProof(e.target.value)}
                    placeholder='["0xabc...", "0xdef...", ...]'
                    rows={3}
                    className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm font-mono"
                  />
                  <p className="text-white/20 text-xs mt-1">Get from project&apos;s claim page (inspect network request) or Etherscan read contract</p>
                </div>

                <div>
                  <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">
                    💎 Token Amount (optional)
                  </label>
                  <input
                    type="text"
                    value={tokenAmount}
                    onChange={(e) => setTokenAmount(e.target.value)}
                    placeholder="e.g. 1000 (human-readable amount, or raw wei)"
                    className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/40 text-sm font-mono"
                  />
                  <p className="text-white/20 text-xs mt-1">Override if auto-detection doesn&apos;t find the amount</p>
                </div>
              </div>
            )}

            <button
              onClick={handlePreview}
              disabled={previewLoading || !contractAddress || !safeWallet || !privateKey || !sponsorKey || !walletAddress}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl font-semibold text-lg disabled:opacity-50 hover:from-blue-500 hover:to-purple-500 transition-all"
            >
              {previewLoading ? '⏳ Scanning Contract...' : '🔍 Preview Claim'}
            </button>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === 'preview' && previewData && (
          <div className="space-y-4">
            <div className="p-5 bg-green-500/10 border border-green-500/20 rounded-xl">
              <h3 className="text-green-400 font-bold text-lg mb-3">📋 Claim Preview</h3>

              {/* Eligibility */}
              <div className="flex items-center gap-2 mb-4">
                {previewData.alreadyClaimed ? (
                  <span className="px-3 py-1 bg-red-600/30 rounded-full text-red-400 text-sm font-semibold">❌ Already Claimed</span>
                ) : previewData.eligible === true ? (
                  <span className="px-3 py-1 bg-green-600/30 rounded-full text-green-400 text-sm font-semibold">✅ Eligible</span>
                ) : previewData.eligible === false ? (
                  <span className="px-3 py-1 bg-red-600/30 rounded-full text-red-400 text-sm font-semibold">❌ Not Eligible</span>
                ) : (
                  <span className="px-3 py-1 bg-yellow-600/30 rounded-full text-yellow-400 text-sm font-semibold">⚠️ Unable to Verify</span>
                )}
                <span className="text-white/30 text-sm">on {selectedChain?.name}</span>
              </div>

              {/* Contract Validation Warnings (P0-2) */}
              {previewData.contractWarnings && previewData.contractWarnings.length > 0 && (
                <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg mb-4">
                  <p className="text-orange-400 text-sm font-semibold mb-1">🔍 Contract Safety Check</p>
                  {previewData.contractWarnings.map((w, i) => (
                    <p key={i} className="text-orange-400/80 text-xs">{w}</p>
                  ))}
                </div>
              )}

              {/* Eligibility Verification Warning (P1-1) */}
              {previewData.eligibilityWarning && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg mb-4">
                  <p className="text-yellow-400 text-sm">{previewData.eligibilityWarning}</p>
                </div>
              )}

              {/* Merkle Proof Helper (P1-2) */}
              {previewData.merkleProofHelp && !merkleProof && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg mb-4">
                  <p className="text-blue-400 text-sm">{previewData.merkleProofHelp}</p>
                </div>
              )}

              {/* Warnings */}
              {previewData.needsMerkleProof && !merkleProof && (
                <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg mb-4">
                  <p className="text-orange-400 text-sm">⚠️ This airdrop requires a Merkle proof. Go back and paste it in Advanced Options.</p>
                </div>
              )}
              {previewData.needsClaimData && !claimData && (
                <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg mb-4">
                  <p className="text-orange-400 text-sm">⚠️ Could not auto-detect claim function. Go back and paste the raw claim data from the project&apos;s page.</p>
                </div>
              )}
              {previewData.eligible === null && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg mb-4">
                  <p className="text-yellow-400 text-sm">⚠️ Unable to verify eligibility — proceed with caution. The claim may fail if already claimed.</p>
                </div>
              )}

              {/* Token Info */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-white/[0.03] rounded-lg">
                  <p className="text-white/30 text-xs">Token</p>
                  <p className="text-white font-semibold">{previewData.tokenSymbol}</p>
                  <p className="text-white/20 text-xs font-mono">{previewData.tokenAddress.slice(0, 10)}...</p>
                </div>
                <div className="p-3 bg-white/[0.03] rounded-lg">
                  <p className="text-white/30 text-xs">Claimable Amount</p>
                  <p className="text-white font-semibold text-lg">{previewData.claimableAmount}</p>
                  <p className="text-white/20 text-xs">{previewData.tokenSymbol}</p>
                </div>
              </div>

              {/* Split */}
              <div className="p-4 bg-white/[0.03] rounded-lg mb-4">
                <p className="text-white/30 text-xs mb-2">💰 Token Split (Atomic)</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 p-2 bg-green-500/10 rounded-lg text-center">
                    <p className="text-green-400 font-bold text-lg">{previewData.safeWalletAmount}</p>
                    <p className="text-green-400/50 text-xs">80% → Safe Wallet</p>
                  </div>
                  <span className="text-white/20">|</span>
                  <div className="flex-1 p-2 bg-purple-500/10 rounded-lg text-center">
                    <p className="text-purple-400 font-bold text-lg">{previewData.platformFeeAmount}</p>
                    <p className="text-purple-400/50 text-xs">20% → Platform Fee</p>
                  </div>
                </div>
              </div>

              {/* Claim Data Used */}
              {previewData.claimDataUsed && (
                <div className="p-3 bg-white/[0.02] rounded-lg mb-4">
                  <p className="text-white/30 text-xs mb-1">Claim Function Detected</p>
                  <p className="text-white/60 text-xs font-mono break-all">{previewData.claimDataUsed}</p>
                </div>
              )}

              {/* Execution Method */}
              {previewData.executionMethod && (
                <div className={`p-3 rounded-lg ${previewData.riskLevel === 'none' ? 'bg-blue-500/10' : previewData.riskLevel === 'low' ? 'bg-blue-500/10' : 'bg-red-500/10'}`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-white/30 text-xs">Execution Method</p>
                      <p className={`font-semibold ${previewData.riskLevel === 'none' || previewData.riskLevel === 'low' ? 'text-blue-400' : 'text-red-400'}`}>
                        {previewData.executionDescription}
                      </p>
                    </div>
                    <span className={`${previewData.riskLevel === 'none' || previewData.riskLevel === 'low' ? 'text-blue-400' : 'text-red-400'} text-xl`}>
                      {previewData.riskLevel === 'none' || previewData.riskLevel === 'low' ? '🛡️' : '🚨'}
                    </span>
                  </div>
                  {previewData.riskLevel === 'high' && (
                    <>
                      <p className="text-red-400 text-xs mt-2 font-semibold">
                        🚨 HIGH RISK: This chain has a public mempool. Drainer bots CAN see pending transactions and may front-run your claim.
                      </p>
                      <p className="text-red-400/70 text-xs mt-1">
                        The sponsor gas funds could be stolen by the drainer before the claim TX executes. Only proceed if the amount is worth the risk.
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Sponsor Gas */}
              <div className={`p-3 rounded-lg ${previewData.sponsorHasGas ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-white/30 text-xs">Sponsor Wallet Balance</p>
                    <p className={`font-semibold ${previewData.sponsorHasGas ? 'text-green-400' : 'text-red-400'}`}>
                      {previewData.sponsorBalance} {previewData.sponsorGasToken}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/30 text-xs">Est. Gas Cost</p>
                    <p className="text-white/60 text-sm">{previewData.estimatedGasCost} {previewData.sponsorGasToken}</p>
                  </div>
                  {previewData.sponsorHasGas ? (
                    <span className="text-green-400 text-xl">✅</span>
                  ) : (
                    <span className="text-red-400 text-xl">❌</span>
                  )}
                </div>
                {!previewData.sponsorHasGas && (
                  <p className="text-red-400/70 text-xs mt-2">
                    ⚠️ Sponsor wallet needs {previewData.sponsorGasToken} for gas. Fund it and try again.
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => { setStep('input'); setPreviewData(null) }}
                className="flex-1 py-3 bg-white/[0.05] rounded-xl text-sm hover:bg-white/[0.1] transition-all"
              >
                ← Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={
                  previewData.alreadyClaimed ||
                  (!previewData.eligible && previewData.eligible !== null) ||
                  !previewData.sponsorHasGas ||
                  (previewData.needsMerkleProof && !merkleProof) ||
                  (previewData.needsClaimData && !claimData)
                }
                className="flex-1 py-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold text-lg disabled:opacity-50 hover:from-green-500 hover:to-emerald-500 transition-all"
              >
                {previewData?.executionMethod === 'flashbots' ? '⚡ Confirm & Claim (Flashbots Atomic Bundle)' : '⚡ Confirm & Claim (Rapid-Fire Sequential)'}
              </button>
            </div>

            {previewData.alreadyClaimed && (
              <p className="text-red-400/60 text-xs text-center">This wallet has already claimed this airdrop</p>
            )}
            {!previewData.alreadyClaimed && !previewData.eligible && previewData.eligible !== null && (
              <p className="text-red-400/60 text-xs text-center">Wallet is not eligible for this airdrop</p>
            )}
            {previewData.eligible && !previewData.sponsorHasGas && (
              <p className="text-red-400/60 text-xs text-center">Fund sponsor wallet with {previewData.sponsorGasToken} first</p>
            )}
          </div>
        )}

        {/* Step 3: Claiming */}
        {step === 'claiming' && (
          <div className="p-8 bg-blue-500/10 border border-blue-500/20 rounded-xl text-center">
            <div className="inline-flex items-center gap-3 text-blue-400 mb-4">
              <svg className="animate-spin h-8 w-8" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-xl font-semibold">Executing Atomic Claim...</span>
            </div>
            <p className="text-white/40 text-sm">Flashbots bundle submitted. Both TXs execute in the same block.</p>
            <p className="text-white/20 text-xs mt-2">This usually takes 10-30 seconds</p>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 'done' && (
          <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-xl">
            <h3 className="text-green-400 font-bold text-xl mb-3">✅ Claim Successful!</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <p className="text-green-400/60 text-xs">Safe Wallet (80%)</p>
                <p className="text-green-400 font-bold">{previewData?.safeWalletAmount} {previewData?.tokenSymbol}</p>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <p className="text-purple-400/60 text-xs">Platform Fee (20%)</p>
                <p className="text-purple-400 font-bold">{previewData?.platformFeeAmount} {previewData?.tokenSymbol}</p>
              </div>
            </div>
            {txHash && (
              <a
                href={`https://etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-green-400/70 text-xs font-mono hover:text-green-400 mb-4"
              >
                TX: {txHash.slice(0, 20)}...
              </a>
            )}
            <button
              onClick={() => { setStep('input'); setPreviewData(null); setContractAddress(''); setWalletAddress('') }}
              className="w-full py-3 bg-white/[0.05] rounded-xl text-sm hover:bg-white/[0.1]"
            >
              Claim Another Airdrop
            </button>
          </div>
        )}

        {/* Error */}
        {step === 'error' && (
          <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl">
            <h3 className="text-red-400 font-bold text-lg mb-2">❌ Error</h3>
            <p className="text-white/60 text-sm mb-4">{errorMsg}</p>
            <button
              onClick={() => { setStep('input'); setPreviewData(null) }}
              className="px-4 py-2 bg-white/[0.05] rounded-lg text-sm hover:bg-white/[0.1]"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
