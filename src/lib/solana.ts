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

// ── Connection ─────────────────────────────────────────────
const SOLANA_RPC = process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com'

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

// ── Recover SOL + SPL tokens from compromised wallet ──────
export async function recoverSolanaFunds(
  compromisedPrivateKey: string,
  safeAddress: string,
  rpcUrl?: string
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
  let solRecovered = '0'

  // ── Step 1: Recover SOL ──────────────────────────────────
  const solBalance = await connection.getBalance(compromisedPubkey)
  const feeEstimate = 5000 // ~0.000005 SOL for tx fee
  const transferableLamports = solBalance - feeEstimate

  if (transferableLamports > 0) {
    const solAmount = transferableLamports / LAMPORTS_PER_SOL
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: compromisedPubkey,
        toPubkey: safePubkey,
        lamports: transferableLamports,
      })
    )

    const { blockhash } = await connection.getLatestBlockhash('confirmed')
    transaction.recentBlockhash = blockhash
    transaction.feePayer = compromisedPubkey

    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [compromisedKeypair],
      { commitment: 'confirmed' }
    )

    txSignatures.push(signature)
    solRecovered = solAmount.toFixed(9)
  }

  // ── Step 2: Recover SPL tokens ───────────────────────────
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
    compromisedPubkey,
    { programId: TOKEN_PROGRAM_ID }
  )

  for (const { account } of tokenAccounts.value) {
    const parsed = account.data.parsed
    const info = parsed.info
    const tokenAmount = info.tokenAmount

    if (tokenAmount.uiAmount === 0) continue

    try {
      const mint = new PublicKey(info.mint)
      const fromATA = await getAssociatedTokenAddress(mint, compromisedPubkey)
      const toATA = await getAssociatedTokenAddress(mint, safePubkey)

      // Check if destination ATA exists, skip if not (would need createATA ix)
      const toATAInfo = await connection.getAccountInfo(toATA)
      if (!toATAInfo) {
        // ATA doesn't exist on safe wallet — would need to create it first
        // For safety, we skip tokens where we can't guarantee delivery
        continue
      }

      const transaction = new Transaction().add(
        createTransferInstruction(
          fromATA,
          toATA,
          compromisedPubkey,
          BigInt(tokenAmount.amount),
          [],
          TOKEN_PROGRAM_ID
        )
      )

      const { blockhash } = await connection.getLatestBlockhash('confirmed')
      transaction.recentBlockhash = blockhash
      transaction.feePayer = compromisedPubkey

      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [compromisedKeypair],
        { commitment: 'confirmed' }
      )

      txSignatures.push(signature)
      tokensRecovered.push(info.mint)
    } catch {
      // Skip tokens that fail (may need separate tx with more SOL for fees)
      continue
    }
  }

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
