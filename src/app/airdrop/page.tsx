'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ethers } from 'ethers'
import { getExplorerUrl } from '@/lib/validation'
import AddressInput from '@/components/AddressInput'

const PLATFORM_FEE_WALLET = '0x7A3725154a2E6468F9549334394802e9E2822C2A'
const PLATFORM_FEE_PERCENT = 20

// Only Base chain — our contract deployed there
// Other chains will be added when we deploy SweepGuardRescuer on them
const SWEEPGUARD_RESCUER: Record<number, string> = {
  8453: '0xDB671f97bfB72e324A758588456373EEC141400F', // Base ✅ deployed
}

function getRescuerContract(chainId: number): string | null {
  return SWEEPGUARD_RESCUER[chainId] || null
}

// Only Base chain enabled for EIP-7702 rescue (our contract deployed)
// Other chains will be enabled when we deploy SweepGuardRescuer on them
const ANTIDRAIN_CHAINS = new Set([
  8453,   // Base ✅ deployed
])

// Antidrain executeRescue ABI (key functions only)
const ANTIDRAIN_ABI = [
  'function executeRescue(address safeRecipient, address[] tokens, address claimTarget, bytes claimData, address fw) external payable',
  'function executeMoveERC20(address safeRecipient, address[] tokens, address fw) external',
  'function executeRescueNative(address payable safeRecipient, address payable fw) external',
  'function accountNonces(address account, address sponsor) external view returns (uint256)',
  'function FEE_BPS() external view returns (uint256)',
  'function feeWallet() external view returns (address)',
]
// Chains with PRIVATE sequencers (no public mempool — drainer can't frontrun)
const PRIVATE_SEQUENCER_CHAINS = new Set([
  8453,   // Base
  42161,  // Arbitrum
  10,     // Optimism
  324,    // zkSync
  59144,  // Linea
  534352, // Scroll
  5000,   // Mantle
  34443,  // Mode
  81457,  // Blast
  7777777,// Zora
  57073,  // Ink
  1868,   // Soneium
  1923,   // Swellchain
  2818,   // Morph
  43111,  // Hemi
  80094,  // Berachain
  1329,   // Sei
])

const SUPPORTED_CHAINS = [
  { id: 1, name: 'Ethereum', token: 'ETH', method: ANTIDRAIN_CHAINS.has(1) ? 'EIP-7702' : 'Flashbots' },
  { id: 8453, name: 'Base', token: 'ETH', method: ANTIDRAIN_CHAINS.has(8453) ? 'EIP-7702' : 'Rapid-fire' },
  { id: 42161, name: 'Arbitrum', token: 'ETH', method: ANTIDRAIN_CHAINS.has(42161) ? 'EIP-7702' : 'Rapid-fire' },
  { id: 137, name: 'Polygon', token: 'MATIC', method: ANTIDRAIN_CHAINS.has(137) ? 'EIP-7702' : 'Rapid-fire' },
  { id: 56, name: 'BSC', token: 'BNB', method: ANTIDRAIN_CHAINS.has(56) ? 'EIP-7702' : 'Rapid-fire' },
  { id: 10, name: 'Optimism', token: 'ETH', method: ANTIDRAIN_CHAINS.has(10) ? 'EIP-7702' : 'Rapid-fire' },
  { id: 43114, name: 'Avalanche', token: 'AVAX', method: ANTIDRAIN_CHAINS.has(43114) ? 'EIP-7702' : 'Rapid-fire' },
  { id: 250, name: 'Fantom', token: 'FTM', method: 'Direct Claim' },
  { id: 81457, name: 'Blast', token: 'ETH', method: ANTIDRAIN_CHAINS.has(81457) ? 'EIP-7702' : 'Rapid-fire' },
  { id: 324, name: 'zkSync', token: 'ETH', method: ANTIDRAIN_CHAINS.has(324) ? 'EIP-7702' : 'Rapid-fire' },
  { id: 59144, name: 'Linea', token: 'ETH', method: ANTIDRAIN_CHAINS.has(59144) ? 'EIP-7702' : 'Rapid-fire' },
  { id: 5000, name: 'Mantle', token: 'MNT', method: ANTIDRAIN_CHAINS.has(5000) ? 'EIP-7702' : 'Rapid-fire' },
  { id: 534352, name: 'Scroll', token: 'ETH', method: ANTIDRAIN_CHAINS.has(534352) ? 'EIP-7702' : 'Rapid-fire' },
  { id: 80094, name: 'Berachain', token: 'BERA', method: ANTIDRAIN_CHAINS.has(80094) ? 'EIP-7702' : 'Rapid-fire' },
  { id: 1329, name: 'Sei', token: 'SEI', method: ANTIDRAIN_CHAINS.has(1329) ? 'EIP-7702' : 'Rapid-fire' },
  { id: 43111, name: 'Hemi', token: 'ETH', method: 'Rapid-fire' },
  { id: 57073, name: 'Ink', token: 'ETH', method: ANTIDRAIN_CHAINS.has(57073) ? 'EIP-7702' : 'Rapid-fire' },
  { id: 1868, name: 'Soneium', token: 'ETH', method: ANTIDRAIN_CHAINS.has(1868) ? 'EIP-7702' : 'Rapid-fire' },
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
  const [chainId, setChainId] = useState(8453) // Default to Base — EIP-7702 works here
  const [safeWallet, setSafeWallet] = useState('')
  const [sponsorWallet, setSponsorWallet] = useState('')
  const [sponsorKey, setSponsorKey] = useState('')
  const [showSponsorKey, setShowSponsorKey] = useState(false)
  const [privateKey, setPrivateKey] = useState('')
  const [showPrivateKey, setShowPrivateKey] = useState(false)

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

  // Guide state — shown by default
  const [showGuide, setShowGuide] = useState(true)

  // Wizard step (1-4 for input form, then 'preview'/'claiming'/'done'/'error')
  const [wizardStep, setWizardStep] = useState(1)

  // Chain search
  const [chainSearch, setChainSearch] = useState('')
  const [showChainDropdown, setShowChainDropdown] = useState(false)

  // Double confirmation for private key send
  const [showConfirmSend, setShowConfirmSend] = useState(false)
  const [pendingAction, setPendingAction] = useState<'claim' | null>(null)

  // Track last action for retry
  const [lastAction, setLastAction] = useState<'claim' | 'execute' | 'eip7702' | null>(null)

  // BUG FIX #1: Clear private keys from memory on unmount
  useEffect(() => {
    return () => {
      setPrivateKey('')
      setSponsorKey('')
    }
  }, [])

  // BUG FIX #2: Validate safe wallet ≠ compromised wallet
  const validateSafeAddress = (safe: string, hacked: string): string | null => {
    if (!safe || !hacked) return null
    try {
      const normalizedSafe = ethers.getAddress(safe)
      const normalizedHacked = ethers.getAddress(hacked)
      if (normalizedSafe === normalizedHacked) {
        return 'Safe wallet CANNOT be the compromised wallet — tokens would go back to the drainer!'
      }
    } catch {
      return 'Invalid safe wallet address format'
    }
    return null
  }

  // BUG FIX #3: Public mempool chain warning
  const isPublicMempoolChain = (id: number) => {
    return !PRIVATE_SEQUENCER_CHAINS.has(id) && id !== 1 // Ethereum uses Flashbots
  }

  // Step 1: Preview — detect token, eligibility, amount
  const handlePreview = async () => {
    if (!contractAddress || !walletAddress || !safeWallet || !sponsorWallet) return

    // BUG FIX #2: Validate safe wallet ≠ compromised wallet
    const validationError = validateSafeAddress(safeWallet, walletAddress)
    if (validationError) {
      setErrorMsg(validationError)
      setStep('error')
      return
    }

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

  // Direct Claim — uses private key directly (no smart contract needed)
  const handleDirectClaim = async () => {
    if (!previewData || !privateKey || !sponsorKey) return

    // BUG FIX #2: Validate safe wallet ≠ compromised wallet
    const validationError = validateSafeAddress(safeWallet, walletAddress)
    if (validationError) {
      setErrorMsg(validationError)
      setStep('error')
      return
    }

    // BUG FIX #4: Double confirmation before sending private key
    if (!showConfirmSend) {
      setShowConfirmSend(true)
      setPendingAction('claim')
      return
    }
    setShowConfirmSend(false)
    setPendingAction(null)

    setStep('claiming')
    setErrorMsg('')
    setLastAction('claim')

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
        // SECURITY: Clear BOTH keys from memory ONLY on success
        setPrivateKey('')
        setSponsorKey('')
        setTxHash(data.txHash || '')
        setStep('done')
      } else {
        // BUG FIX #9: Sanitize error messages
        const errMsg = data.error || 'Claim failed'
        const sanitized = errMsg.includes('execution reverted')
          ? 'Claim transaction reverted — the airdrop may not be claimable yet or you may not be eligible.'
          : errMsg.includes('insufficient funds')
            ? 'Sponsor wallet has insufficient funds for gas.'
            : errMsg
        setErrorMsg(sanitized)
        setStep('error')
      }
    } catch {
      setErrorMsg('Transaction failed. Please try again.')
      setStep('error')
    }
  }

  // Step 3: Execute — submit signed claim to blockchain
  const handleExecute = async () => {
    if (!signature || !previewData || !sponsorKey) return

    setStep('claiming')
    setErrorMsg('')
    setLastAction('execute')

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
        // BUG FIX #9: Sanitize error messages
        const errMsg = data.error || 'Claim failed'
        const sanitized = errMsg.includes('execution reverted')
          ? 'Claim transaction reverted — the airdrop may not be claimable yet or you may not be eligible.'
          : errMsg.includes('simulation failed')
            ? 'Claim simulation failed — the airdrop contract rejected the claim. Check eligibility.'
            : errMsg.includes('insufficient funds')
              ? 'Sponsor wallet has insufficient funds for gas.'
              : errMsg
        setErrorMsg(sanitized)
        setStep('error')
      }
    } catch {
      setErrorMsg('Transaction failed. Please try again.')
      setStep('error')
    }
  }

  // ═══════════════════════════════════════════════════════════
  // EIP-7702 + ANTIDRAIN RESCUE — THE REAL SOLUTION
  // Key NEVER leaves browser. Sponsor pays gas. Atomic batch.
  // Same system used by zun's Antidrain extension.
  // ═══════════════════════════════════════════════════════════
  const handleEIP7702Rescue = async () => {
    if (!previewData || !privateKey || !sponsorKey) return
    if (!ANTIDRAIN_CHAINS.has(chainId)) {
      setErrorMsg('EIP-7702 Antidrain not available on this chain. Use Direct Claim instead.')
      return
    }

    // BUG FIX #2: Validate token address is not empty
    if (!previewData.tokenAddress || previewData.tokenAddress === ethers.ZeroAddress) {
      setErrorMsg('Token address not detected. Please check the airdrop contract and try again.')
      return
    }

    // Validate safe wallet ≠ compromised wallet
    const validationError = validateSafeAddress(safeWallet, walletAddress)
    if (validationError) {
      setErrorMsg(validationError)
      setStep('error')
      return
    }

    setStep('claiming')
    setErrorMsg('')
    setLastAction('eip7702')

    try {
      // Step 1: Create provider + compromised wallet signer (LOCAL ONLY)
      const rpcUrl = getChainRPC(chainId)
      const provider = new ethers.JsonRpcProvider(rpcUrl)
      const compromisedWallet = new ethers.Wallet(privateKey, provider)

      // Step 2: Get current nonce for EIP-7702 authorization
      const nonce = await provider.getTransactionCount(compromisedWallet.address)

      // Step 3: Sign EIP-7702 authorization LOCALLY
      // EIP-7702 authorization = keccak256(0x05 || rlp([chainId, address, nonce]))
      const rescuerContract = getRescuerContract(chainId)
      if (!rescuerContract) {
        setErrorMsg('EIP-7702 rescue not available on this chain yet.')
        setStep('error')
        return
      }
      const authPayload = ethers.concat([
        '0x05',
        ethers.encodeRlp([
          ethers.toBeHex(chainId),
          rescuerContract.toLowerCase(),
          ethers.toBeHex(nonce),
        ]),
      ])
      const authHash = ethers.keccak256(authPayload)
      const sig = compromisedWallet.signingKey.sign(authHash)
      const auth = {
        chainId: chainId,
        address: rescuerContract,
        nonce: nonce,
        yParity: sig.v - 27, // 0 or 1
        r: sig.r,
        s: sig.s,
      }

      // Step 4: Send authorization to backend for TX construction + submission
      // BUG FIX #3: Clear key AFTER fetch completes, not after signing
      const res = await fetch('/api/airdrop/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'antidrain-rescue',
          contractAddress,
          chainId,
          safeWallet,
          walletAddress,
          sponsorPrivateKey: sponsorKey,
          tokenAddress: previewData.tokenAddress,
          claimableRaw: previewData.claimableRaw,
          claimData: claimData || undefined,
          merkleProof: merkleProof || undefined,
          tokenAmount: tokenAmount || undefined,
          eip7702Auth: {
            chainId: auth.chainId,
            address: auth.address,
            nonce: auth.nonce,
            yParity: auth.yParity,
            r: auth.r,
            s: auth.s,
          },
        })
      })
      const data = await res.json()

      if (data.success) {
        // SECURITY: Clear BOTH keys from memory ONLY on success
        setPrivateKey('')
        setSponsorKey('')
        setTxHash(data.txHash || '')
        setStep('done')
      } else {
        // DON'T clear keys on error — user might retry without re-entering
        const errMsg = data.error || 'EIP-7702 rescue failed'
        const sanitized = errMsg.includes('execution reverted')
          ? 'Claim transaction reverted — the airdrop may not be claimable yet or you may not be eligible.'
          : errMsg.includes('insufficient funds')
            ? 'Sponsor wallet has insufficient funds for gas.'
            : errMsg.includes('nonce')
              ? 'Nonce conflict — please try again.'
              : errMsg
        setErrorMsg(sanitized)
        setStep('error')
      }
    } catch (err: unknown) {
      // DON'T clear keys on error — user might retry without re-entering
      const msg = err instanceof Error ? err.message : 'EIP-7702 rescue failed'
      setErrorMsg(msg.includes('rejected') ? 'Authorization signature rejected by user.' : msg)
      setStep('error')
    }
  }

  // Helper: Get RPC URL for chain
  const getChainRPC = (id: number): string => {
    const rpcs: Record<number, string> = {
      1: 'https://eth.llamarpc.com',
      8453: 'https://mainnet.base.org',
      42161: 'https://arb1.arbitrum.io/rpc',
      137: 'https://polygon-rpc.com',
      56: 'https://bsc-dataseed1.binance.org',
      10: 'https://mainnet.optimism.io',
      43114: 'https://api.avax.network/ext/bc/C/rpc',
      250: 'https://rpc.ftm.tools',
      81457: 'https://rpc.blast.io',
      324: 'https://mainnet.era.zksync.io',
      59144: 'https://rpc.linea.build',
      5000: 'https://rpc.mantle.xyz',
      534352: 'https://rpc.scroll.io',
      80094: 'https://rpc.berachain.com',
      1329: 'https://evm-rpc.sei-apis.com',
      57073: 'https://rpc-gel.inkonchain.com',
      1868: 'https://rpc.soneium.org',
      143: 'https://rpc.monad.xyz',
    }
    return rpcs[id] || 'https://eth.llamarpc.com'
  }

  const selectedChain = SUPPORTED_CHAINS.find(c => c.id === chainId)

  // Filtered chains for search
  const filteredChains = SUPPORTED_CHAINS.filter(c =>
    c.name.toLowerCase().includes(chainSearch.toLowerCase()) ||
    c.token.toLowerCase().includes(chainSearch.toLowerCase())
  )

  // Wizard navigation
  const nextWizard = () => setWizardStep(s => Math.min(s + 1, 4))
  const prevWizard = () => setWizardStep(s => Math.max(s - 1, 1))

  // Progress bar component
  const ProgressBar = () => (
    <div className="flex items-center gap-2 mb-8">
      {[1, 2, 3, 4].map(s => (
        <div key={s} className="flex items-center gap-2 flex-1">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
            wizardStep >= s ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' : 'bg-white/[0.05] text-white/20'
          }`}>
            {wizardStep > s ? '✓' : s}
          </div>
          {s < 4 && <div className={`flex-1 h-1 rounded ${wizardStep > s ? 'bg-green-500' : 'bg-white/[0.05]'}`} />}
        </div>
      ))}
    </div>
  )

  // Tooltip component
  const Tooltip = ({ text, children }: { text: string; children: React.ReactNode }) => {
    const [show, setShow] = useState(false)
    return (
      <span className="relative inline-block">
        <span onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
          {children}
        </span>
        {show && (
          <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[#1a1a2e] border border-white/10 rounded-lg text-xs text-white/60 w-64 shadow-xl">
            {text}
          </span>
        )}
      </span>
    )
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

      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">🎯 Airdrop Claimer</h1>
        <p className="text-white/40 mb-8">Claim airdrops from compromised wallet → 80% safe wallet, 20% platform fee</p>

        {/* Security Badge */}
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl mb-6">
          <p className="text-green-400 text-sm">
            🔒 <strong>Two Claim Modes</strong> —
            <strong className="text-green-400"> EIP-7702 Rescue</strong>: Key NEVER leaves browser, sponsor pays gas, atomic batch. Works on {ANTIDRAIN_CHAINS.size}+ chains (recommended! ✅).
            <strong className="text-yellow-400"> Direct Claim</strong>: Private key sent to API — fallback for chains without EIP-7702 support.
          </p>
        </div>

        {/* ============ GUIDE SECTION ============ */}
        <div className="mb-8">
          <button
            onClick={() => setShowGuide(!showGuide)}
            aria-expanded={showGuide}
            aria-label="Toggle claim guide"
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
                  <li>• <strong className="text-red-400">NEVER enter your hacked wallet&apos;s private key as the sponsor key</strong></li>
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
                <h4 className="text-green-400 font-semibold mb-2">Step 7: Sign & Rescue</h4>
                <p className="text-white/50 text-sm">
                  Enter your <strong>hacked wallet's private key</strong> — it stays in your browser and is used to sign an EIP-7702 authorization <strong>locally</strong>.
                  The key is <strong>NEVER sent to any server</strong>. Same system as zun's Antidrain.
                </p>
                <p className="text-white/50 text-sm mt-2">
                  Click <strong>&quot;EIP-7702 Rescue&quot;</strong> → Sponsor wallet pays gas. Smart contract claims tokens and splits them atomically:
                </p>
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
                  <div className="p-2 bg-white/[0.02] rounded">✅ Private key stays in browser (EIP-7702)</div>
                  <div className="p-2 bg-white/[0.02] rounded">✅ Atomic claim + transfer</div>
                  <div className="p-2 bg-white/[0.02] rounded">✅ Sponsor pays gas (not your wallet)</div>
                  <div className="p-2 bg-white/[0.02] rounded">✅ Same system as zun's Antidrain</div>
                  <div className="p-2 bg-white/[0.02] rounded">✅ 20% platform fee enforced</div>
                  <div className="p-2 bg-white/[0.02] rounded">✅ Our deployed contract (verified)</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ============ GUIDE (shown by default) ============ */}
        {showGuide && step === 'input' && (
          <div className="mb-8 p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-green-400">📖 How to Claim Airdrops</h2>
              <button onClick={() => setShowGuide(false)} className="text-white/30 hover:text-white/60 text-sm">Hide ✕</button>
            </div>
            <div className="space-y-4">
              {[
                { n: 1, title: 'Select Chain & Contract', desc: 'Choose blockchain (Base recommended) and paste the airdrop contract address.' },
                { n: 2, title: 'Enter Wallet Addresses', desc: 'Your hacked wallet, safe wallet (where tokens go), and sponsor wallet (pays gas).' },
                { n: 3, title: 'Enter Private Keys', desc: 'Sponsor key for gas. Hacked wallet key for signing (stays in browser on Base).' },
                { n: 4, title: 'Review & Claim', desc: 'Preview your claim, see fees, and click claim. 80% to safe wallet, 20% platform fee.' },
              ].map(s => (
                <div key={s.n} className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 font-bold text-sm">{s.n}</div>
                  <div>
                    <p className="text-white/80 text-sm font-semibold">{s.title}</p>
                    <p className="text-white/40 text-xs mt-1">{s.desc}</p>
                  </div>
                </div>
              ))}
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-green-400 text-xs">🔒 On Base chain, your private key NEVER leaves the browser. Uses EIP-7702 — same system as zun's Antidrain.</p>
              </div>
            </div>
          </div>
        )}

        {/* ============ WIZARD INPUT ============ */}
        {step === 'input' && (
          <div>
            {/* Progress Bar */}
            <div className="flex items-center gap-2 mb-8">
              {[1, 2, 3, 4].map(s => (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    wizardStep >= s ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' : 'bg-white/[0.05] text-white/20'
                  }`}>
                    {wizardStep > s ? '✓' : s}
                  </div>
                  {s < 4 && <div className={`flex-1 h-1 rounded ${wizardStep > s ? 'bg-green-500' : 'bg-white/[0.05]'}`} />}
                </div>
              ))}
            </div>

            {/* Step 1: Chain + Contract */}
            {wizardStep === 1 && (
              <div className="space-y-5">
                <h2 className="text-xl font-bold text-white">🔗 Select Chain & Contract</h2>
                <div>
                  <label className="block text-sm text-white/50 mb-2">Blockchain</label>
                  <div className="relative">
                    <button onClick={() => setShowChainDropdown(!showChainDropdown)} className="w-full p-3 bg-white/[0.03] border border-white/[0.05] rounded-xl text-left text-sm flex items-center justify-between hover:border-green-500/30 transition-colors">
                      <span className="text-white">
                        {selectedChain ? `${selectedChain.name} (${selectedChain.token})` : 'Select chain'}
                        {chainId === 8453 && <span className="ml-2 text-green-400">⭐ Recommended</span>}
                      </span>
                      <span className="text-white/30">▼</span>
                    </button>
                    {showChainDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl max-h-64 overflow-hidden">
                        <input type="text" value={chainSearch} onChange={e => setChainSearch(e.target.value)} placeholder="Search chain..." className="w-full p-3 bg-transparent border-b border-white/[0.05] text-white text-sm outline-none placeholder:text-white/20" autoFocus />
                        <div className="overflow-y-auto max-h-52">
                          {SUPPORTED_CHAINS.filter(c => c.name.toLowerCase().includes(chainSearch.toLowerCase()) || c.token.toLowerCase().includes(chainSearch.toLowerCase())).map(chain => (
                            <button key={chain.id} onClick={() => { setChainId(chain.id); setShowChainDropdown(false); setChainSearch('') }} className={`w-full p-3 text-left text-sm hover:bg-white/[0.05] flex items-center justify-between ${chainId === chain.id ? 'text-green-400 bg-green-500/10' : 'text-white/60'}`}>
                              <span>{chain.name} ({chain.token})</span>
                              <span className="text-white/20 text-xs">{chain.method}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {isPublicMempoolChain(chainId) && (
                    <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <p className="text-yellow-400 text-xs">⚠️ Public mempool — drainer bots may front-run. Use Base for best security.</p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-white/50 mb-2">Airdrop Contract Address</label>
                  <input type="text" value={contractAddress} onChange={e => setContractAddress(e.target.value)} placeholder="0x... (NOT the token address)" className="w-full p-3 bg-white/[0.03] border border-white/[0.05] rounded-xl text-white text-sm focus:border-green-500/50 outline-none placeholder:text-white/20" />
                  <p className="text-white/20 text-xs mt-1">Find this on the airdrop project's claim page</p>
                </div>
                <button onClick={() => setWizardStep(2)} disabled={!contractAddress} className="w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold hover:brightness-110 disabled:opacity-30 transition-all">
                  Next: Wallet Setup →
                </button>
              </div>
            )}

            {/* Step 2: Wallet Addresses */}
            {wizardStep === 2 && (
              <div className="space-y-5">
                <h2 className="text-xl font-bold text-white">💳 Wallet Setup</h2>
                <AddressInput
                  value={walletAddress}
                  onChange={setWalletAddress}
                  label="Your Hacked Wallet Address"
                  sublabel="The compromised wallet eligible for the airdrop. Supports ENS names."
                  placeholder="0x... or ENS name (e.g. vitalik.eth)"
                  variant="red"
                  chainId={chainId}
                />
                <AddressInput
                  value={safeWallet}
                  onChange={setSafeWallet}
                  label="Safe Wallet Address"
                  sublabel="Where 80% of claimed tokens will be sent. Use a wallet you fully control. NOT the hacked wallet! Triple check!"
                  placeholder="0x... or ENS name"
                  variant="green"
                  chainId={chainId}
                />
                <AddressInput
                  value={sponsorWallet}
                  onChange={setSponsorWallet}
                  label="Sponsor Wallet Address"
                  sublabel="Pays the gas fee for the claim transaction. Needs ETH/native tokens. NEVER use your hacked wallet."
                  placeholder="0x... or ENS name"
                  chainId={chainId}
                />
                <div className="flex gap-3">
                  <button onClick={() => setWizardStep(1)} className="flex-1 py-3 rounded-xl bg-white/[0.03] border border-white/[0.05] text-white/50 hover:bg-white/[0.06] transition-all">← Back</button>
                  <button onClick={() => setWizardStep(3)} disabled={!walletAddress || !safeWallet || !sponsorWallet} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold hover:brightness-110 disabled:opacity-30 transition-all">Next: Security Keys →</button>
                </div>
              </div>
            )}

            {/* Step 3: Keys */}
            {wizardStep === 3 && (
              <div className="space-y-5">
                <h2 className="text-xl font-bold text-white">🔑 Security Keys</h2>
                <div>
                  <label className="block text-sm text-white/50 mb-2">Sponsor Private Key (pays gas)</label>
                  <div className="relative">
                    <input type={showSponsorKey ? 'text' : 'password'} value={sponsorKey} onChange={e => setSponsorKey(e.target.value)} placeholder="0x..." className="w-full p-3 bg-white/[0.03] border border-white/[0.05] rounded-xl text-white text-sm focus:border-green-500/50 outline-none pr-10 placeholder:text-white/20" />
                    <button onClick={() => setShowSponsorKey(!showSponsorKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">{showSponsorKey ? '🙈' : '👁️'}</button>
                  </div>
                  <p className="text-orange-400/50 text-xs mt-1">⚠️ NEVER enter your hacked wallet's key here</p>
                </div>
                <div>
                  <label className="block text-sm text-white/50 mb-2">
                    Hacked Wallet Private Key
                    {ANTIDRAIN_CHAINS.has(chainId) ? <span className="text-green-400 ml-2">(stays in browser ✅)</span> : <span className="text-yellow-400 ml-2">(sent to API ⚠️)</span>}
                  </label>
                  <div className="relative">
                    <input type={showPrivateKey ? 'text' : 'password'} value={privateKey} onChange={e => setPrivateKey(e.target.value)} placeholder="0x..." className="w-full p-3 bg-white/[0.03] border border-red-500/20 rounded-xl text-white text-sm focus:border-red-500/50 outline-none pr-10 placeholder:text-white/20" />
                    <button onClick={() => setShowPrivateKey(!showPrivateKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">{showPrivateKey ? '🙈' : '👁️'}</button>
                  </div>
                  {ANTIDRAIN_CHAINS.has(chainId) ? <p className="text-green-400/50 text-xs mt-1">✅ EIP-7702: key signs locally, never sent to server</p> : <p className="text-yellow-400/50 text-xs mt-1">⚠️ Sent to API for direct claim. Only on non-Base chains.</p>}
                </div>
                <details className="group">
                  <summary className="text-sm text-white/30 hover:text-white/60 cursor-pointer">▸ Optional: Claim Data, Merkle Proof, Token Amount</summary>
                  <div className="mt-3 space-y-3 pl-3 border-l border-white/[0.05]">
                    <div>
                      <label className="block text-xs text-white/30 mb-1">Claim Data (hex)</label>
                      <input type="text" value={claimData} onChange={e => setClaimData(e.target.value)} placeholder="0x..." className="w-full p-2 bg-white/[0.02] border border-white/[0.03] rounded-lg text-white/60 text-xs" />
                    </div>
                    <div>
                      <label className="block text-xs text-white/30 mb-1">Merkle Proof (JSON array)</label>
                      <textarea value={merkleProof} onChange={e => setMerkleProof(e.target.value)} placeholder='["0xabc..."]' className="w-full p-2 bg-white/[0.02] border border-white/[0.03] rounded-lg text-white/60 text-xs h-16" />
                    </div>
                    <div>
                      <label className="block text-xs text-white/30 mb-1">Token Amount</label>
                      <input type="text" value={tokenAmount} onChange={e => setTokenAmount(e.target.value)} placeholder="1000" className="w-full p-2 bg-white/[0.02] border border-white/[0.03] rounded-lg text-white/60 text-xs" />
                    </div>
                  </div>
                </details>
                <div className="flex gap-3">
                  <button onClick={() => setWizardStep(2)} className="flex-1 py-3 rounded-xl bg-white/[0.03] border border-white/[0.05] text-white/50 hover:bg-white/[0.06] transition-all">← Back</button>
                  <button onClick={() => { setWizardStep(4); handlePreview(); }} disabled={!sponsorKey || !privateKey || previewLoading} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold hover:brightness-110 disabled:opacity-30 transition-all">
                    {previewLoading ? '⏳ Scanning...' : '🔍 Preview Claim'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Loading */}
            {wizardStep === 4 && previewLoading && (
              <div className="text-center py-16">
                <svg className="animate-spin h-10 w-10 text-green-400 mx-auto mb-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                <p className="text-green-400 font-semibold">Scanning airdrop contract...</p>
                <p className="text-white/30 text-sm mt-2">Checking eligibility, token balance, and gas costs</p>
              </div>
            )}
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
                aria-label="Go back to input form"
                className="flex-1 py-3 rounded-xl bg-white/[0.03] border border-white/[0.05] text-white/50 hover:bg-white/[0.06]"
              >
                ← Back
              </button>

              {/* EIP-7702 + Antidrain button — BEST option for supported chains */}
              {ANTIDRAIN_CHAINS.has(chainId) ? (
                <button
                  onClick={handleEIP7702Rescue}
                  disabled={!previewData.sponsorHasGas || previewData.alreadyClaimed}
                  aria-label="Execute EIP-7702 rescue claim"
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold hover:brightness-110 disabled:opacity-30"
                >
                  🔒 EIP-7702 Rescue (Key Stays Local)
                </button>
              ) : (
                /* Non-Base chains: SweepGuardClaimer not deployed yet — show info */
                <div className="flex-1 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                  <p className="text-yellow-400 text-xs text-center">
                    ⚠️ EIP-7702 Rescue coming soon to {selectedChain?.name}.<br/>Use <strong>Base chain</strong> for now — it&apos;s the safest option.
                  </p>
                </div>
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
                href={getExplorerUrl(chainId, txHash, 'tx')}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 text-sm hover:underline break-all"
              >
                View Transaction: {txHash.slice(0, 20)}...
              </a>
            )}
            <div className="mt-6">
              <button
                onClick={() => {
                  setStep('input')
                  setSignature('')
                  setContractAddress('')
                  setPrivateKey('')
                  setSponsorKey('')
                  setTxHash('')
                  setLastAction(null)
                }}
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
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setStep('input')
                  setSignature('')
                  setErrorMsg('')
                  setPrivateKey('')
                  setSponsorKey('')
                  setLastAction(null)
                  setShowConfirmSend(false)
                }}
                aria-label="Start over with new inputs"
                className="px-6 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05] text-white/50 hover:bg-white/[0.06]"
              >
                Start Over
              </button>
              {/* BUG FIX #8: Retry button */}
              {lastAction && (
                <button
                  onClick={() => {
                    setErrorMsg('')
                    setStep('claiming')
                    if (lastAction === 'claim') handleDirectClaim()
                    else if (lastAction === 'execute') handleExecute()
                    else if (lastAction === 'eip7702') handleEIP7702Rescue()
                  }}
                  aria-label="Retry failed claim action"
                  className="px-6 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold hover:brightness-110"
                >
                  🔄 Retry
                </button>
              )}
            </div>
          </div>
        )}

        {/* BUG FIX #4: Double Confirmation Modal */}
        {showConfirmSend && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 max-w-md w-full">
              <div className="text-center">
                <div className="text-4xl mb-4">🔐</div>
                <h3 className="text-xl font-bold text-white mb-2">Confirm Private Key Send</h3>
                <p className="text-white/50 text-sm mb-4">
                  You are about to send the compromised wallet's private key to the API for direct claim execution.
                </p>
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg mb-4">
                  <p className="text-yellow-400 text-xs">
                    ⚠️ The private key will be used to sign the claim transaction on the server. Make sure you trust this connection.
                  </p>
                </div>
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg mb-6">
                  <p className="text-red-400 text-xs">
                    ⚠️ Safe wallet: <strong>{(() => { try { return safeWallet ? ethers.getAddress(safeWallet) : 'Not set' } catch { return safeWallet || 'Invalid address' } })()}</strong>
                    <br />Tokens will be split: 80% → safe wallet, 20% → platform fee.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowConfirmSend(false); setPendingAction(null) }}
                    aria-label="Cancel claim"
                    className="flex-1 py-3 rounded-xl bg-white/[0.03] border border-white/[0.05] text-white/50 hover:bg-white/[0.06]"
                  >
                    ❌ Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowConfirmSend(false)
                      if (pendingAction === 'claim') handleDirectClaim()
                    }}
                    aria-label="Confirm and send claim transaction"
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold hover:brightness-110"
                  >
                    ✅ Confirm & Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
