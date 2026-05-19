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
  error?: string
}

export default function AirdropPage() {
  // Step 1: Input fields
  const [contractAddress, setContractAddress] = useState('')
  const [walletAddress, setWalletAddress] = useState('')
  const [chainId, setChainId] = useState(1)
  const [safeWallet, setSafeWallet] = useState('')
  const [sponsorWallet, setSponsorWallet] = useState('')
  const [sponsorKey, setSponsorKey] = useState('')
  const [showSponsorKey, setShowSponsorKey] = useState(false)

  // Optional fields
  const [claimData, setClaimData] = useState('')
  const [merkleProof, setMerkleProof] = useState('')
  const [tokenAmount, setTokenAmount] = useState('')
  const [showOptional, setShowOptional] = useState(false)

  // Flow states
  const [step, setStep] = useState<'input' | 'preview' | 'signing' | 'claiming' | 'done' | 'error'>('input')
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [txHash, setTxHash] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [signature, setSignature] = useState('')

  // Guide state
  const [showGuide, setShowGuide] = useState(false)

  // Step 1: Preview — detect token, eligibility, amount
  const handlePreview = async () => {
    if (!contractAddress || !walletAddress || !safeWallet || !sponsorWallet) return

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
          sponsorAddress: sponsorWallet,
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

  // Step 2: Sign — MetaMask EIP-712 signature (NO private key needed!)
  const handleSign = async () => {
    if (!previewData || !window.ethereum) {
      setErrorMsg('MetaMask not found. Please install MetaMask.')
      setStep('error')
      return
    }

    setStep('signing')
    setErrorMsg('')

    try {
      // Get EIP-712 typed data from backend
      const signRes = await fetch('/api/airdrop/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sign',
          contractAddress,
          chainId,
          safeWallet,
          walletAddress,
          tokenAddress: previewData.tokenAddress,
          claimableRaw: previewData.claimableRaw,
          claimData: claimData || undefined,
          merkleProof: merkleProof || undefined,
        })
      })
      const signData = await signRes.json()

      if (signData.error) {
        setErrorMsg(signData.error)
        setStep('error')
        return
      }

      // Request MetaMask to sign EIP-712 typed data
      // This is a MESSAGE signature, NOT a transaction — private key never leaves browser
      const sig = await window.ethereum!.request({
        method: 'eth_signTypedData_v4',
        params: [walletAddress, JSON.stringify(signData.typedData)],
      }) as string

      setSignature(sig)
      setStep('preview') // Go back to preview with signature ready
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Signature rejected or failed'
      setErrorMsg(msg)
      setStep('error')
    }
  }

  // Step 3: Execute — submit signed claim to blockchain
  const handleExecute = async () => {
    if (!signature || !previewData || !sponsorKey) return

    setStep('claiming')
    setErrorMsg('')

    try {
      const res = await fetch('/api/airdrop/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute-signed',
          contractAddress,
          chainId,
          safeWallet,
          walletAddress,
          tokenAddress: previewData.tokenAddress,
          claimableRaw: previewData.claimableRaw,
          signature,
          sponsorPrivateKey: sponsorKey,
          claimData: claimData || undefined,
          merkleProof: merkleProof || undefined,
        })
      })
      const data = await res.json()

      if (data.success) {
        setTxHash(data.txHash || '')
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

        {/* Security Badge */}
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl mb-6">
          <p className="text-green-400 text-sm">
            🔒 <strong>Signature-Based Security</strong> — Your private key NEVER leaves your browser.
            You only sign an EIP-712 message in MetaMask. The smart contract handles everything atomically.
          </p>
        </div>

        {/* ============ GUIDE SECTION ============ */}
        <div className="mb-8">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="w-full p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-left hover:bg-yellow-500/15 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📖</span>
                <div>
                  <h3 className="text-yellow-400 font-semibold">How to Claim — Complete Guide</h3>
                  <p className="text-white/30 text-xs">Step-by-step instructions • Read this first!</p>
                </div>
              </div>
              <span className="text-yellow-400 text-xl">{showGuide ? '▼' : '▶'}</span>
            </div>
          </button>

          {showGuide && (
            <div className="mt-3 p-5 bg-yellow-500/5 border border-yellow-500/10 rounded-xl space-y-6">
              {/* Warning */}
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 font-semibold text-sm mb-2">⚠️ CRITICAL WARNING</p>
                <p className="text-red-300/80 text-sm">
                  Entering the wrong address = <strong>permanent fund loss</strong>.
                  Double-check EVERY address before proceeding. There is NO undo.
                </p>
              </div>

              {/* Step 1 */}
              <div>
                <h4 className="text-green-400 font-semibold mb-2">Step 1: Select Chain</h4>
                <p className="text-white/50 text-sm">
                  Choose the blockchain where the airdrop is. If unsure, check the airdrop project&apos;s website.
                  Each chain has different gas costs — L2s (Base, Arbitrum) are much cheaper than Ethereum.
                </p>
              </div>

              {/* Step 2 */}
              <div>
                <h4 className="text-green-400 font-semibold mb-2">Step 2: Airdrop Contract Address</h4>
                <p className="text-white/50 text-sm">
                  Enter the <strong>airdrop contract address</strong> (NOT the token address).
                  Find it on the project&apos;s claim page or documentation.
                  The system will auto-detect what token you&apos;ll receive.
                </p>
              </div>

              {/* Step 3 */}
              <div>
                <h4 className="text-green-400 font-semibold mb-2">Step 3: Your (Hacked) Wallet Address</h4>
                <p className="text-white/50 text-sm">
                  This is the wallet that was compromised. It must be eligible for the airdrop.
                  <strong className="text-red-400"> DO NOT enter your private key here</strong> — you only sign in MetaMask later.
                </p>
              </div>

              {/* Step 4 */}
              <div>
                <h4 className="text-green-400 font-semibold mb-2">Step 4: Safe Wallet Address</h4>
                <p className="text-white/50 text-sm">
                  This is where <strong>80%</strong> of claimed tokens will be sent.
                  <strong className="text-red-400"> TRIPLE CHECK this address</strong> — if wrong, tokens go to wrong wallet.
                  Use a wallet you fully control (hardware wallet recommended).
                </p>
              </div>

              {/* Step 5 */}
              <div>
                <h4 className="text-green-400 font-semibold mb-2">Step 5: Sponsor Wallet</h4>
                <p className="text-white/50 text-sm">
                  The sponsor wallet pays the gas fee for the transaction. You need:
                </p>
                <ul className="text-white/50 text-sm mt-2 space-y-1 ml-4">
                  <li>• <strong>Sponsor Wallet Address</strong>: A wallet with gas/native tokens</li>
                  <li>• <strong>Sponsor Private Key</strong>: To sign the gas payment transaction</li>
                  <li>• <strong className="text-red-400">NEVER enter your hacked wallet&apos;s private key</strong></li>
                </ul>
              </div>

              {/* Step 6 */}
              <div>
                <h4 className="text-green-400 font-semibold mb-2">Step 6: Preview Claim</h4>
                <p className="text-white/50 text-sm">
                  Click <strong>&quot;Preview Claim&quot;</strong> to check:
                </p>
                <ul className="text-white/50 text-sm mt-2 space-y-1 ml-4">
                  <li>✅ Is the contract valid?</li>
                  <li>✅ Are you eligible?</li>
                  <li>✅ How many tokens can you claim?</li>
                  <li>✅ Does the sponsor wallet have enough gas?</li>
                </ul>
              </div>

              {/* Step 7 */}
              <div>
                <h4 className="text-green-400 font-semibold mb-2">Step 7: Sign Authorization</h4>
                <p className="text-white/50 text-sm">
                  Click <strong>&quot;Sign Authorization&quot;</strong> → MetaMask will pop up with an EIP-712 message.
                  This is a <strong>MESSAGE signature</strong>, NOT a transaction.
                  Your private key <strong>NEVER leaves your browser</strong>.
                </p>
              </div>

              {/* Step 8 */}
              <div>
                <h4 className="text-green-400 font-semibold mb-2">Step 8: Execute Claim</h4>
                <p className="text-white/50 text-sm">
                  Click <strong>&quot;Execute Claim&quot;</strong> → The transaction will be submitted.
                  Sponsor wallet pays gas. Smart contract claims tokens and splits them atomically:
                </p>
                <div className="mt-3 p-3 bg-white/[0.03] rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-green-400">→ Safe Wallet (80%)</span>
                    <span className="text-green-400">You receive</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-purple-400">→ Platform Fee (20%)</span>
                    <span className="text-purple-400">SweepGuard fee</span>
                  </div>
                </div>
              </div>

              {/* Common Mistakes */}
              <div>
                <h4 className="text-red-400 font-semibold mb-2">❌ Common Mistakes to Avoid</h4>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-red-400">❌</span>
                    <p className="text-white/50 text-sm">Entering hacked wallet&apos;s private key as sponsor key</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-red-400">❌</span>
                    <p className="text-white/50 text-sm">Entering wrong safe wallet address (tokens go to wrong wallet)</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-red-400">❌</span>
                    <p className="text-white/50 text-sm">Using wrong chain (airdrop on Base but selected Ethereum)</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-red-400">❌</span>
                    <p className="text-white/50 text-sm">Not enough gas in sponsor wallet</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-red-400">❌</span>
                    <p className="text-white/50 text-sm">Entering token address instead of airdrop contract address</p>
                  </div>
                </div>
              </div>

              {/* Security Model */}
              <div>
                <h4 className="text-blue-400 font-semibold mb-2">🛡️ Security Model</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 bg-white/[0.02] rounded">✅ Private key stays in browser</div>
                  <div className="p-2 bg-white/[0.02] rounded">✅ EIP-712 message signature</div>
                  <div className="p-2 bg-white/[0.02] rounded">✅ One-time use (nonce)</div>
                  <div className="p-2 bg-white/[0.02] rounded">✅ 10-minute deadline</div>
                  <div className="p-2 bg-white/[0.02] rounded">✅ Atomic execution</div>
                  <div className="p-2 bg-white/[0.02] rounded">✅ Smart contract enforced</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ============ INPUT STEP ============ */}
        {step === 'input' && (
          <div className="space-y-5">
            {/* Chain Selector */}
            <div>
              <label className="block text-sm text-white/50 mb-2">Chain</label>
              <div className="grid grid-cols-3 gap-2">
                {SUPPORTED_CHAINS.map(chain => (
                  <button
                    key={chain.id}
                    onClick={() => setChainId(chain.id)}
                    className={`p-2 rounded-lg text-xs font-medium transition-all ${
                      chainId === chain.id
                        ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                        : 'bg-white/[0.03] border border-white/[0.05] text-white/40 hover:bg-white/[0.06]'
                    }`}
                  >
                    {chain.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Airdrop Contract Address */}
            <div>
              <label className="block text-sm text-white/50 mb-2">
                Airdrop Contract Address
                <span className="text-white/20 ml-2">(NOT the token address)</span>
              </label>
              <input
                type="text"
                value={contractAddress}
                onChange={e => setContractAddress(e.target.value)}
                placeholder="0x..."
                className="w-full p-3 bg-white/[0.03] border border-white/[0.05] rounded-lg text-white text-sm focus:border-green-500/50 outline-none"
              />
            </div>

            {/* Your (Hacked) Wallet Address */}
            <div>
              <label className="block text-sm text-white/50 mb-2">Your (Hacked) Wallet Address</label>
              <input
                type="text"
                value={walletAddress}
                onChange={e => setWalletAddress(e.target.value)}
                placeholder="0x..."
                className="w-full p-3 bg-white/[0.03] border border-white/[0.05] rounded-lg text-white text-sm focus:border-green-500/50 outline-none"
              />
              <p className="text-white/20 text-xs mt-1">This is the compromised wallet. Tokens will be claimed from here.</p>
            </div>

            {/* Safe Wallet */}
            <div>
              <label className="block text-sm text-white/50 mb-2">
                Safe Wallet (receives 80%)
                <span className="text-red-400 ml-2">⚠️ Triple check!</span>
              </label>
              <input
                type="text"
                value={safeWallet}
                onChange={e => setSafeWallet(e.target.value)}
                placeholder="0x..."
                className="w-full p-3 bg-white/[0.03] border border-white/[0.05] rounded-lg text-white text-sm focus:border-green-500/50 outline-none"
              />
            </div>

            {/* Sponsor Wallet Address */}
            <div>
              <label className="block text-sm text-white/50 mb-2">Sponsor Wallet Address (pays gas)</label>
              <input
                type="text"
                value={sponsorWallet}
                onChange={e => setSponsorWallet(e.target.value)}
                placeholder="0x..."
                className="w-full p-3 bg-white/[0.03] border border-white/[0.05] rounded-lg text-white text-sm focus:border-green-500/50 outline-none"
              />
            </div>

            {/* Sponsor Private Key */}
            <div>
              <label className="block text-sm text-white/50 mb-2">Sponsor Private Key (for gas payment)</label>
              <div className="relative">
                <input
                  type={showSponsorKey ? 'text' : 'password'}
                  value={sponsorKey}
                  onChange={e => setSponsorKey(e.target.value)}
                  placeholder="0x..."
                  className="w-full p-3 bg-white/[0.03] border border-white/[0.05] rounded-lg text-white text-sm focus:border-green-500/50 outline-none pr-10"
                />
                <button
                  onClick={() => setShowSponsorKey(!showSponsorKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                >
                  {showSponsorKey ? '🙈' : '👁️'}
                </button>
              </div>
              <p className="text-orange-400/60 text-xs mt-1">⚠️ This key is used to pay gas. NEVER share your hacked wallet&apos;s private key.</p>
            </div>

            {/* Optional Fields */}
            <div>
              <button
                onClick={() => setShowOptional(!showOptional)}
                className="text-sm text-white/30 hover:text-white/60 transition-colors"
              >
                {showOptional ? '▼' : '▶'} Optional Fields (claim data, merkle proof, token amount)
              </button>
              {showOptional && (
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-xs text-white/30 mb-1">Claim Data (hex, from project page)</label>
                    <input
                      type="text"
                      value={claimData}
                      onChange={e => setClaimData(e.target.value)}
                      placeholder="0x..."
                      className="w-full p-2 bg-white/[0.02] border border-white/[0.03] rounded-lg text-white/60 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/30 mb-1">Merkle Proof (JSON array)</label>
                    <textarea
                      value={merkleProof}
                      onChange={e => setMerkleProof(e.target.value)}
                      placeholder='["0xabc...", "0xdef..."]'
                      className="w-full p-2 bg-white/[0.02] border border-white/[0.03] rounded-lg text-white/60 text-xs h-16"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/30 mb-1">Token Amount (if not auto-detected)</label>
                    <input
                      type="text"
                      value={tokenAmount}
                      onChange={e => setTokenAmount(e.target.value)}
                      placeholder="1000"
                      className="w-full p-2 bg-white/[0.02] border border-white/[0.03] rounded-lg text-white/60 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handlePreview}
              disabled={!contractAddress || !walletAddress || !safeWallet || !sponsorWallet || previewLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold hover:brightness-110 transition-all disabled:opacity-30"
            >
              {previewLoading ? '⏳ Scanning...' : '🔍 Preview Claim'}
            </button>
          </div>
        )}

        {/* ============ PREVIEW STEP ============ */}
        {step === 'preview' && previewData && (
          <div className="space-y-4">
            {/* Token Info */}
            <div className="p-4 bg-white/[0.03] rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white/30 text-sm">Token</span>
                <span className="text-white font-semibold">{previewData.tokenSymbol}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/30 text-sm">Claimable Amount</span>
                <span className="text-green-400 font-bold text-lg">{previewData.claimableAmount} {previewData.tokenSymbol}</span>
              </div>
            </div>

            {/* Split Breakdown */}
            <div className="p-4 bg-white/[0.03] rounded-xl">
              <p className="text-white/30 text-sm mb-2">Token Split (80/20)</p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-green-400">→ Safe Wallet (80%)</span>
                  <span className="text-green-400 font-semibold">{previewData.safeWalletAmount} {previewData.tokenSymbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-400">→ Platform Fee (20%)</span>
                  <span className="text-purple-400 font-semibold">{previewData.platformFeeAmount} {previewData.tokenSymbol}</span>
                </div>
              </div>
            </div>

            {/* Execution Method */}
            {previewData.executionMethod && (
              <div className={`p-3 rounded-lg ${previewData.executionSafe ? 'bg-blue-500/10' : 'bg-yellow-500/10'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-white/30 text-xs">Execution Method</p>
                    <p className={`font-semibold ${previewData.executionSafe ? 'text-blue-400' : 'text-yellow-400'}`}>
                      {previewData.executionDescription}
                    </p>
                  </div>
                  <span className={`${previewData.executionSafe ? 'text-blue-400' : 'text-yellow-400'} text-xl`}>
                    {previewData.executionSafe ? '🛡️' : '⚠️'}
                  </span>
                </div>
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

            {/* Eligibility */}
            {previewData.alreadyClaimed && (
              <div className="p-3 bg-red-500/10 rounded-lg">
                <p className="text-red-400 text-sm">❌ Already claimed — cannot claim again</p>
              </div>
            )}

            {/* Signature Status */}
            {signature && (
              <div className="p-3 bg-green-500/10 rounded-lg">
                <p className="text-green-400 text-sm">✅ Signature ready — click &quot;Execute Claim&quot; to proceed</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => { setStep('input'); setSignature(''); }}
                className="flex-1 py-3 rounded-xl bg-white/[0.03] border border-white/[0.05] text-white/50 hover:bg-white/[0.06]"
              >
                ← Back
              </button>

              {!signature ? (
                <button
                  onClick={handleSign}
                  disabled={!previewData.sponsorHasGas || previewData.alreadyClaimed}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold hover:brightness-110 disabled:opacity-30"
                >
                  ✍️ Sign Authorization (MetaMask)
                </button>
              ) : (
                <button
                  onClick={handleExecute}
                  disabled={!previewData.sponsorHasGas || previewData.alreadyClaimed}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold hover:brightness-110 disabled:opacity-30"
                >
                  ⚡ Execute Claim
                </button>
              )}
            </div>
          </div>
        )}

        {/* ============ SIGNING STEP ============ */}
        {step === 'signing' && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">✍️</div>
            <h3 className="text-xl font-semibold mb-2">Check MetaMask</h3>
            <p className="text-white/40">Sign the EIP-712 message in MetaMask to authorize the claim.</p>
            <p className="text-white/20 text-xs mt-2">This is a message signature, NOT a transaction. Your private key stays in your browser.</p>
          </div>
        )}

        {/* ============ CLAIMING STEP ============ */}
        {step === 'claiming' && (
          <div className="text-center py-12">
            <div className="animate-spin text-4xl mb-4">⏳</div>
            <h3 className="text-xl font-semibold mb-2">Executing Claim...</h3>
            <p className="text-white/40">Sponsor wallet is paying gas. Claim + split happening atomically.</p>
          </div>
        )}

        {/* ============ DONE STEP ============ */}
        {step === 'done' && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🎉</div>
            <h3 className="text-xl font-semibold text-green-400 mb-2">Claim Successful!</h3>
            {txHash && (
              <a
                href={`${SUPPORTED_CHAINS.find(c => c.id === chainId)?.id === 1 ? 'https://etherscan.io' : `https://${SUPPORTED_CHAINS.find(c => c.id === chainId)?.name.toLowerCase()}.blockscout.com`}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 text-sm hover:underline break-all"
              >
                View Transaction: {txHash.slice(0, 20)}...
              </a>
            )}
            <div className="mt-6">
              <button
                onClick={() => { setStep('input'); setSignature(''); setContractAddress(''); }}
                className="px-6 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05] text-white/50 hover:bg-white/[0.06]"
              >
                Claim Another
              </button>
            </div>
          </div>
        )}

        {/* ============ ERROR STEP ============ */}
        {step === 'error' && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">❌</div>
            <h3 className="text-xl font-semibold text-red-400 mb-2">Error</h3>
            <p className="text-white/60 text-sm mb-6 max-w-md mx-auto">{errorMsg}</p>
            <button
              onClick={() => { setStep('input'); setSignature(''); setErrorMsg(''); }}
              className="px-6 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05] text-white/50 hover:bg-white/[0.06]"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
