// Solana support for SweepGuard
// Uses @solana/web3.js for on-chain interactions

import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from '@solana/web3.js'
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createTransferInstruction,
  getAccount,
  getMint,
} from '@solana/spl-token'
import bs58 from 'bs58'

// ── Constants ─────────────────────────────────────────────
const SOLANA_RPC = process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com'

// Solana platform fee wallet (20% fee for recovery services)
export const SOLANA_PLATFORM_WALLET = 'CoRIGkf547ZzXxw6PHFnVdoxq5xFGbcoVWtLbw1cM3x1'
export const SOLANA_FEE_BPS = 2000 // 20%

export function getSolanaConnection(rpcUrl?: string): Connection {
  return new Connection(rpcUrl || SOLANA_RPC, {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60000,
  })
}

// ── Types ──────────────────────────────────────────────────
export interface SolanaTokenBalance {
  mint: string
  symbol: string
  decimals: number
  balance: string
  balanceFormatted: string
  ata: string // Associated Token Account
}

export interface SolanaScanResult {
  address: string
  solBalance: string
  solBalanceFormatted: string
  tokens: SolanaTokenBalance[]
  totalTokens: number
  lastActivity: string | null
}

export interface SolanaTransferResult {
  success: boolean
  txSignature?: string
  error?: string
  explorerUrl: string
}

// ── Scan: Get SOL + SPL token balances ─────────────────────
export async function scanSolanaWallet(
  address: string,
  rpcUrl?: string
): Promise<SolanaScanResult> {
  const connection = getSolanaConnection(rpcUrl)
  const pubkey = new PublicKey(address)

  // Get SOL balance
  const solBalance = await connection.getBalance(pubkey)
  const solBalanceFormatted = (solBalance / LAMPORTS_PER_SOL).toFixed(9)

  // Get all SPL token accounts
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
    programId: TOKEN_PROGRAM_ID,
  })

  const tokens: SolanaTokenBalance[] = []
  for (const { account } of tokenAccounts.value) {
    const parsed = account.data.parsed
    const info = parsed.info
    const tokenAmount = info.tokenAmount

    // Skip empty accounts
    if (tokenAmount.uiAmount === 0) continue

    tokens.push({
      mint: info.mint,
      symbol: info.mint.slice(0, 6) + '...', // Short mint as symbol placeholder
      decimals: tokenAmount.decimals,
      balance: tokenAmount.amount,
      balanceFormatted: tokenAmount.uiAmountString || '0',
      ata: info.owner, // ATA address
    })
  }

  // Get last activity (most recent transaction signature)
  let lastActivity: string | null = null
  try {
    const signatures = await connection.getSignaturesForAddress(pubkey, { limit: 1 })
    if (signatures.length > 0) {
      lastActivity = signatures[0].blockTime
        ? new Date(signatures[0].blockTime * 1000).toISOString()
        : null
    }
  } catch {
    // Ignore — not critical
  }

  return {
    address,
    solBalance: solBalance.toString(),
    solBalanceFormatted,
    tokens,
    totalTokens: tokens.length,
    lastActivity,
  }
}

// ── Create SOL Transfer Transaction ────────────────────────
export async function createSolanaTransfer(
  fromPubkey: string,
  toPubkey: string,
  amountSol: number
): Promise<Transaction> {
  const from = new PublicKey(fromPubkey)
  const to = new PublicKey(toPubkey)
  const lamports = Math.floor(amountSol * LAMPORTS_PER_SOL)

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: from,
      toPubkey: to,
      lamports,
    })
  )

  // Set recent blockhash
  const connection = getSolanaConnection()
  const { blockhash } = await connection.getLatestBlockhash('confirmed')
  transaction.recentBlockhash = blockhash
  transaction.feePayer = from

  return transaction
}

// ── Create SPL Token Transfer Transaction ──────────────────
export async function createSPLTokenTransfer(
  mintAddress: string,
  fromPubkey: string,
  toPubkey: string,
  amount: number, // in human-readable units (not raw)
): Promise<Transaction> {
  const mint = new PublicKey(mintAddress)
  const from = new PublicKey(fromPubkey)
  const to = new PublicKey(toPubkey)

  // Get mint info for decimals
  const connection = getSolanaConnection()
  const mintInfo = await getMint(connection, mint)
  const rawAmount = BigInt(Math.floor(amount * Math.pow(10, mintInfo.decimals)))

  // Get or create Associated Token Accounts
  const fromATA = await getAssociatedTokenAddress(mint, from)
  const toATA = await getAssociatedTokenAddress(mint, to)

  const transaction = new Transaction().add(
    createTransferInstruction(
      fromATA,
      toATA,
      from,
      rawAmount,
      [],
      TOKEN_PROGRAM_ID
    )
  )

  // Set recent blockhash
  const { blockhash } = await connection.getLatestBlockhash('confirmed')
  transaction.recentBlockhash = blockhash
  transaction.feePayer = from

  return transaction
}

// ── Sign and Submit Solana Transaction ─────────────────────
export async function signAndSubmitSolana(
  transaction: Transaction,
  signer: Keypair,
  rpcUrl?: string
): Promise<SolanaTransferResult> {
  const connection = getSolanaConnection(rpcUrl)

  try {
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [signer],
      { commitment: 'confirmed' }
    )

    return {
      success: true,
      txSignature: signature,
      explorerUrl: `https://solscan.io/tx/${signature}`,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Transaction failed'
    return {
      success: false,
      error: message,
      explorerUrl: '',
    }
  }
}

// ── Decode private key from various formats ────────────────
// Solana keys can be: base58 string, or byte array
export function decodeSolanaKey(privateKeyInput: string): Keypair {
  // Try base58 (most common format for Solana)
  try {
    const decoded = bs58.decode(privateKeyInput)
    if (decoded.length === 64) {
      return Keypair.fromSecretKey(decoded)
    }
  } catch {
    // Not base58
  }

  // Try JSON array format: "[1,2,3,...]"
  try {
    const arr = JSON.parse(privateKeyInput)
    if (Array.isArray(arr) && arr.length === 64) {
      return Keypair.fromSecretKey(Uint8Array.from(arr))
    }
  } catch {
    // Not JSON array
  }

  // Try hex format
  try {
    const hex = privateKeyInput.startsWith('0x') ? privateKeyInput.slice(2) : privateKeyInput
    const bytes = Buffer.from(hex, 'hex')
    if (bytes.length === 64) {
      return Keypair.fromSecretKey(bytes)
    }
  } catch {
    // Not hex
  }

  throw new Error(
    'Invalid Solana private key. Supported formats: base58 string, JSON byte array [1,2,...,64], or hex.'
  )
}

// ── Jito Bundle Submission (private, no front-running) ────
const JITO_ENDPOINTS = [
  'https://mainnet.block-engine.jito.wtf/api/v1/transactions',
  'https://amsterdam.mainnet.block-engine.jito.wtf/api/v1/transactions',
  'https://ny.mainnet.block-engine.jito.wtf/api/v1/transactions',
  'https://tokyo.mainnet.block-engine.jito.wtf/api/v1/transactions',
]

async function submitViaJito(
  transaction: Transaction,
  signers: Keypair[],
  connection: Connection
): Promise<{ success: boolean; signature?: string; error?: string }> {
  // Sign the transaction
  const { blockhash } = await connection.getLatestBlockhash('confirmed')
  transaction.recentBlockhash = blockhash
  transaction.feePayer = signers[0].publicKey
  transaction.sign(...signers)

  const serialized = transaction.serialize().toString('base64')

  // Try each Jito endpoint
  for (const endpoint of JITO_ENDPOINTS) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10_000) // 10s timeout per endpoint
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'sendTransaction',
          params: [serialized, { encoding: 'base64' }],
        }),
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (!response.ok) {
        console.warn(`Jito endpoint ${endpoint} returned HTTP ${response.status}`)
        continue
      }

      const data = await response.json()
      if (data.result) {
        return { success: true, signature: data.result }
      }
      if (data.error) {
        console.warn(`Jito endpoint ${endpoint} returned error: ${data.error.message || JSON.stringify(data.error)}`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown error'
      console.warn(`Jito endpoint ${endpoint} failed: ${msg}`)
      continue
    }
  }

  return { success: false, error: 'All Jito endpoints failed' }
}

// ── Recover SOL + SPL tokens — ATOMIC BATCH ───────────────
// ALL transfers in ONE transaction = no race condition, no front-running
export async function recoverSolanaFunds(
  compromisedPrivateKey: string,
  safeAddress: string,
  rpcUrl?: string,
  useJito: boolean = true
): Promise<{
  success: boolean
  solRecovered?: string
  tokensRecovered?: string[]
  txSignatures?: string[]
  error?: string
  explorerUrl?: string
}> {
  const connection = getSolanaConnection(rpcUrl)

  // Decode compromised wallet keypair
  const compromisedKeypair = decodeSolanaKey(compromisedPrivateKey)
  const compromisedPubkey = compromisedKeypair.publicKey
  const safePubkey = new PublicKey(safeAddress)

  // Can't send to self
  if (compromisedPubkey.toBase58() === safePubkey.toBase58()) {
    return { success: false, error: 'Safe wallet cannot be the compromised wallet!' }
  }

  const txSignatures: string[] = []
  const tokensRecovered: string[] = []

  // ── Get all SPL token accounts ───────────────────────────
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
    compromisedPubkey,
    { programId: TOKEN_PROGRAM_ID }
  )

  // Filter tokens with balance
  const activeTokens = tokenAccounts.value.filter(({ account }) => {
    const parsed = account.data.parsed
    return parsed.info.tokenAmount.uiAmount > 0
  })

  // ── Get SOL balance ──────────────────────────────────────
  const solBalance = await connection.getBalance(compromisedPubkey)

  // Calculate fees: base fee + priority fee per instruction
  // Each SPL transfer = 1 instruction, SOL transfer = 1 instruction
  const numInstructions = 1 + activeTokens.length // SOL + tokens
  const baseFee = 5000 * numInstructions // 5000 lamports per signature
  const priorityFee = 50000 * numInstructions // Priority fee for faster processing
  const rentReserve = 890880 // Minimum rent for account existence
  const totalFees = baseFee + priorityFee + rentReserve

  const transferableLamports = solBalance - totalFees

  if (transferableLamports <= 0 && activeTokens.length === 0) {
    return { success: false, error: 'No recoverable funds. Wallet has 0 SOL and no SPL tokens.' }
  }

  // ── Build ONE atomic transaction with ALL transfers ─────
  const transaction = new Transaction()

  // Instruction 1: Transfer SOL (leave enough for rent if we have tokens)
  if (transferableLamports > 0) {
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: compromisedPubkey,
        toPubkey: safePubkey,
        lamports: transferableLamports,
      })
    )
  }

  // Instructions 2..N: Transfer each SPL token
  for (const { account } of activeTokens) {
    const parsed = account.data.parsed
    const info = parsed.info
    const tokenAmount = info.tokenAmount

    try {
      const mint = new PublicKey(info.mint)
      const fromATA = await getAssociatedTokenAddress(mint, compromisedPubkey)
      const toATA = await getAssociatedTokenAddress(mint, safePubkey)

      // Check if destination ATA exists
      const toATAInfo = await connection.getAccountInfo(toATA)
      if (!toATAInfo) {
        // Create ATA instruction + transfer in same TX
        const { createAssociatedTokenAccountInstruction } = await import('@solana/spl-token')
        transaction.add(
          createAssociatedTokenAccountInstruction(
            safePubkey, // payer
            toATA,      // ATA address
            safePubkey, // owner
            mint        // mint
          )
        )
      }

      // Add transfer instruction
      transaction.add(
        createTransferInstruction(
          fromATA,
          toATA,
          compromisedPubkey,
          BigInt(tokenAmount.amount),
          [],
          TOKEN_PROGRAM_ID
        )
      )

      tokensRecovered.push(info.mint)
    } catch (err) {
      // Skip tokens that fail
      console.error(`Failed to add token ${info.mint}:`, err)
      continue
    }
  }

  if (transaction.instructions.length === 0) {
    return { success: false, error: 'No valid transfer instructions could be built.' }
  }

  // ── Add priority fee (Compute Budget) for faster processing ──
  // This makes our TX process before lower-fee TXs (including hacker bots)
  const { ComputeBudgetProgram } = await import('@solana/web3.js')
  transaction.instructions.unshift(
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100000 }),
    ComputeBudgetProgram.setComputeUnitLimit({ units: 200000 * numInstructions })
  )

  // ── Submit via Jito Bundle (private) or public RPC ─────
  let signature: string | undefined

  if (useJito) {
    // Jito = private submission, no public mempool visibility
    // Hacker bots CANNOT see this transaction before it's confirmed
    const jitoResult = await submitViaJito(transaction, [compromisedKeypair], connection)
    if (jitoResult.success && jitoResult.signature) {
      signature = jitoResult.signature
    } else {
      // Fallback to public RPC with high priority fee
      // SECURITY WARNING: Transaction will be visible in public mempool
      console.warn('⚠️ Jito private submission failed — falling back to PUBLIC RPC. Transaction is now visible to drainer bots!')
      // Clone the transaction to avoid stale signatures from submitViaJito
      const fallbackTx = Transaction.from(transaction.serialize({ requireAllSignatures: false }))
      const { blockhash } = await connection.getLatestBlockhash('confirmed')
      fallbackTx.recentBlockhash = blockhash
      fallbackTx.feePayer = compromisedPubkey
      signature = await sendAndConfirmTransaction(
        connection,
        fallbackTx,
        [compromisedKeypair],
        { commitment: 'confirmed' }
      )
    }
  } else {
    // Direct public RPC submission
    const { blockhash } = await connection.getLatestBlockhash('confirmed')
    transaction.recentBlockhash = blockhash
    transaction.feePayer = compromisedPubkey
    signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [compromisedKeypair],
      { commitment: 'confirmed' }
    )
  }

  if (signature) {
    txSignatures.push(signature)
  }

  const solRecovered = transferableLamports > 0
    ? (transferableLamports / LAMPORTS_PER_SOL).toFixed(9)
    : '0'

  return {
    success: txSignatures.length > 0,
    solRecovered,
    tokensRecovered,
    txSignatures,
    explorerUrl: txSignatures.length > 0
      ? `https://solscan.io/tx/${txSignatures[0]}`
      : undefined,
  }
}

// ── Solana Hack/Drain Detection ───────────────────────────
export interface SolanaDrainAlert {
  type: 'drain' | 'suspicious' | 'approval' | 'unknown'
  severity: 'critical' | 'high' | 'medium' | 'low'
  description: string
  txSignature: string
  timestamp: string
  amount?: string
  token?: string
  destination?: string
}

export interface SolanaHackDetection {
  isCompromised: boolean
  riskLevel: 'critical' | 'high' | 'medium' | 'low' | 'clean'
  alerts: SolanaDrainAlert[]
  drainedTokens: string[]
  suspiciousDestinations: string[]
  recentDrainTxs: number
  totalDrainedSOL: string
  summary: string
}

// Known Solana drainer addresses (add to this list as discovered)
const KNOWN_SOLANA_DRAINERS = [
  // Common Solana drainer patterns
  'Drain1111111111111111111111111111111111111111',
  'DrainerSo111111111111111111111111111111111111',
  // Phishing/scam program IDs
]

export async function detectSolanaHack(
  address: string,
  rpcUrl?: string
): Promise<SolanaHackDetection> {
  const connection = getSolanaConnection(rpcUrl)
  const pubkey = new PublicKey(address)
  const alerts: SolanaDrainAlert[] = []
  const drainedTokens: string[] = []
  const suspiciousDestinations: string[] = []
  let totalDrainedLamports = 0
  let recentDrainTxs = 0

  try {
    // Get recent transaction signatures (last 50)
    const signatures = await connection.getSignaturesForAddress(pubkey, {
      limit: 50,
    })

    if (signatures.length === 0) {
      return {
        isCompromised: false,
        riskLevel: 'clean',
        alerts: [],
        drainedTokens: [],
        suspiciousDestinations: [],
        recentDrainTxs: 0,
        totalDrainedSOL: '0',
        summary: 'No transaction history found.',
      }
    }

    // Analyze recent transactions for drain patterns
    const recentTxs = signatures.slice(0, 20) // Check last 20 txs
    const destinationCounts: Record<string, number> = {}

    for (const sigInfo of recentTxs) {
      if (!sigInfo.signature) continue

      try {
        const tx = await connection.getParsedTransaction(
          sigInfo.signature,
          { maxSupportedTransactionVersion: 0 }
        )

        if (!tx || !tx.meta) continue

        const timestamp = sigInfo.blockTime
          ? new Date(sigInfo.blockTime * 1000).toISOString()
          : 'unknown'

        // Check for SOL transfers OUT (drain pattern)
        const preBalances = tx.meta.preBalances
        const postBalances = tx.meta.postBalances
        const accountKeys = tx.transaction.message.accountKeys

        // Find our address index
        const ourIndex = accountKeys.findIndex(
          (k: { pubkey: PublicKey }) => k.pubkey.toBase58() === address
        )

        if (ourIndex >= 0 && preBalances[ourIndex] > postBalances[ourIndex]) {
          const drainedLamports = preBalances[ourIndex] - postBalances[ourIndex]
          totalDrainedLamports += drainedLamports

          // Find destination (who received the SOL)
          for (let i = 0; i < accountKeys.length; i++) {
            if (i === ourIndex) continue
            if (postBalances[i] > preBalances[i]) {
              const destAddr = accountKeys[i].pubkey.toBase58()
              destinationCounts[destAddr] = (destinationCounts[destAddr] || 0) + 1
              if (!suspiciousDestinations.includes(destAddr)) {
                suspiciousDestinations.push(destAddr)
              }
            }
          }

          // Check if drain is rapid (multiple drains in short time)
          const isKnownDrainer = KNOWN_SOLANA_DRAINERS.some(
            d => destinationCounts[d] && destinationCounts[d] > 0
          )

          if (drainedLamports > 0.01 * LAMPORTS_PER_SOL) {
            recentDrainTxs++
            alerts.push({
              type: 'drain',
              severity: drainedLamports > 1 * LAMPORTS_PER_SOL ? 'critical' : 'high',
              description: `SOL drain detected: ${(drainedLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL transferred out`,
              txSignature: sigInfo.signature,
              timestamp,
              amount: (drainedLamports / LAMPORTS_PER_SOL).toFixed(9),
              token: 'SOL',
            })
          }
        }

        // Check for SPL token transfers OUT
        if (tx.meta.preTokenBalances && tx.meta.postTokenBalances) {
          for (const preToken of tx.meta.preTokenBalances) {
            if (preToken.owner !== address) continue

            const postToken = tx.meta.postTokenBalances.find(
              (p: { accountIndex: number }) => p.accountIndex === preToken.accountIndex
            )

            if (postToken && postToken.uiTokenAmount && preToken.uiTokenAmount) {
              const preAmount = parseFloat(preToken.uiTokenAmount.uiAmountString || '0')
              const postAmount = parseFloat(postToken.uiTokenAmount.uiAmountString || '0')

              if (preAmount > postAmount && postAmount === 0) {
                // Token fully drained
                const mint = preToken.mint
                drainedTokens.push(mint)
                recentDrainTxs++
                alerts.push({
                  type: 'drain',
                  severity: 'critical',
                  description: `Token fully drained: ${mint.slice(0, 8)}...${mint.slice(-4)}`,
                  txSignature: sigInfo.signature,
                  timestamp,
                  amount: preAmount.toString(),
                  token: mint,
                })
              }
            }
          }
        }

        // Check for suspicious program invocations
        if (tx.transaction.message.instructions) {
          for (const ix of tx.transaction.message.instructions) {
            const programId = 'programId' in ix ? ix.programId.toBase58() : ''
            // Known suspicious programs
            if (KNOWN_SOLANA_DRAINERS.includes(programId)) {
              alerts.push({
                type: 'suspicious',
                severity: 'critical',
                description: `Known drainer program invoked: ${programId.slice(0, 8)}...`,
                txSignature: sigInfo.signature,
                timestamp,
              })
            }
          }
        }

        // Rate limit API calls
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch {
        // Skip failed tx parsing
        continue
      }
    }

    // Analyze patterns for compromise detection
    // Multiple drains to same destination = likely compromised
    const highFreqDestinations = Object.entries(destinationCounts)
      .filter(([, count]) => count >= 2)
      .map(([addr]) => addr)

    if (highFreqDestinations.length > 0) {
      alerts.push({
        type: 'drain',
        severity: 'critical',
        description: `Multiple transfers to same destination detected: ${highFreqDestinations[0].slice(0, 8)}... — wallet likely compromised!`,
        txSignature: '',
        timestamp: new Date().toISOString(),
        destination: highFreqDestinations[0],
      })
    }

    // Determine risk level
    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length
    const highAlerts = alerts.filter(a => a.severity === 'high').length

    let riskLevel: SolanaHackDetection['riskLevel'] = 'clean'
    if (criticalAlerts >= 3 || recentDrainTxs >= 3) riskLevel = 'critical'
    else if (criticalAlerts >= 1 || recentDrainTxs >= 2) riskLevel = 'high'
    else if (highAlerts >= 2) riskLevel = 'medium'
    else if (highAlerts >= 1 || alerts.length > 0) riskLevel = 'low'

    const isCompromised = riskLevel === 'critical' || riskLevel === 'high'

    const summary = isCompromised
      ? `⚠️ WALLET COMPROMISED! ${recentDrainTxs} drain transactions detected. ${(totalDrainedLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL drained. ${drainedTokens.length} tokens drained. Recover funds immediately!`
      : alerts.length > 0
        ? `⚠️ ${alerts.length} suspicious activities detected. Monitor closely.`
        : '✅ No suspicious activity detected. Wallet appears clean.'

    return {
      isCompromised,
      riskLevel,
      alerts,
      drainedTokens,
      suspiciousDestinations,
      recentDrainTxs,
      totalDrainedSOL: (totalDrainedLamports / LAMPORTS_PER_SOL).toFixed(9),
      summary,
    }
  } catch (err) {
    return {
      isCompromised: false,
      riskLevel: 'clean',
      alerts: [{
        type: 'unknown',
        severity: 'low',
        description: `Scan incomplete: ${err instanceof Error ? err.message : 'unknown error'}`,
        txSignature: '',
        timestamp: new Date().toISOString(),
      }],
      drainedTokens: [],
      suspiciousDestinations: [],
      recentDrainTxs: 0,
      totalDrainedSOL: '0',
      summary: 'Scan incomplete — could not analyze transactions.',
    }
  }
}

// ── Validate Solana address ────────────────────────────────
export function isValidSolanaAddress(address: string): boolean {
  try {
    const pubkey = new PublicKey(address)
    return PublicKey.isOnCurve(pubkey.toBytes())
  } catch {
    return false
  }
}

// ── Get Phantom wallet connection (for browser) ────────────
// This returns JS code to be used client-side
export function getPhantomConnectCode(): string {
  return `
    async function connectPhantom() {
      if (!window.solana || !window.solana.isPhantom) {
        throw new Error('Phantom wallet not found. Install phantom.app');
      }
      const resp = await window.solana.connect();
      return resp.publicKey.toString();
    }

    async function signSolanaTransaction(serializedTx) {
      if (!window.solana || !window.solana.isPhantom) {
        throw new Error('Phantom wallet not found');
      }
      const tx = window.solana.Transaction.from(
        Uint8Array.from(atob(serializedTx), c => c.charCodeAt(0))
      );
      const signedTx = await window.solana.signTransaction(tx);
      return btoa(String.fromCharCode(...signedTx.serialize()));
    }
  `
}
