/**
 * EIP-712 Meta-Transaction System for SweepGuard
 *
 * Enables gasless claiming: user signs a message (not a TX),
 * relay service submits the TX and pays gas.
 */

import { ethers } from 'ethers'

// ============================================================
// SweepGuard Rescuer contract addresses (same as EIP-7702 rescue)
// These serve as the verifyingContract for EIP-712 domain
// ============================================================
export const SWEEPGUARD_RESCUER: Record<number, string> = {
  8453: '0xDB671f97bfB72e324A758588456373EEC141400F', // Base ✅ deployed
}

// ============================================================
// EIP-712 Domain Separator
// ============================================================
export function getMetaTxDomain(chainId: number) {
  const verifyingContract = SWEEPGUARD_RESCUER[chainId]
  if (!verifyingContract) {
    throw new Error(`SweepGuard not deployed on chain ${chainId}`)
  }
  return {
    name: 'SweepGuard',
    version: '1',
    chainId: chainId,
    verifyingContract,
  }
}

// ============================================================
// EIP-712 Type Definitions
// ============================================================
export const META_TX_TYPES = {
  EIP712Domain: [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' },
  ],
  MetaTransaction: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'data', type: 'bytes' },
    { name: 'deadline', type: 'uint256' },
  ],
}

export const CLAIM_AIRDROP_TYPES = {
  EIP712Domain: [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' },
  ],
  ClaimAirdrop: [
    { name: 'hackedWallet', type: 'address' },
    { name: 'safeWallet', type: 'address' },
    { name: 'tokenAddress', type: 'address' },
    { name: 'airdropContract', type: 'address' },
    { name: 'claimData', type: 'bytes' },
    { name: 'amount', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
  ],
}

// ============================================================
// Meta-Transaction Payload
// ============================================================
export interface MetaTransactionPayload {
  from: string      // Compromised wallet address
  to: string        // Target contract (airdrop contract)
  value: bigint     // ETH value (usually 0)
  nonce: number     // Per-user nonce for replay protection
  data: string      // Encoded claim calldata
  deadline: number  // Unix timestamp expiry
}

export interface ClaimAirdropPayload {
  hackedWallet: string
  safeWallet: string
  tokenAddress: string
  airdropContract: string
  claimData: string
  amount: string
  deadline: number
  nonce: number
}

export interface SignedMetaTransaction {
  payload: MetaTransactionPayload
  signature: string
  domain: ReturnType<typeof getMetaTxDomain>
  chainId: number
}

export interface SignedClaimAirdrop {
  payload: ClaimAirdropPayload
  signature: string
  domain: ReturnType<typeof getMetaTxDomain>
  chainId: number
}

// ============================================================
// Nonce Management (in-memory cache + contract read)
// ============================================================
const nonceCache: Map<string, number> = new Map()

/**
 * Get the current nonce for a user on a given chain.
 * First checks cache, then reads from contract.
 */
export async function getNonce(
  provider: ethers.JsonRpcProvider,
  userAddress: string,
  chainId: number
): Promise<number> {
  const cacheKey = `${chainId}:${userAddress.toLowerCase()}`
  const cached = nonceCache.get(cacheKey)
  if (cached !== undefined) return cached

  const verifyingContract = SWEEPGUARD_RESCUER[chainId]
  if (!verifyingContract) return 0

  try {
    const iface = new ethers.Interface([
      'function getNonce(address) view returns (uint256)',
    ])
    const data = iface.encodeFunctionData('getNonce', [userAddress])
    const result = await provider.call({ to: verifyingContract, data })
    const nonce = Number(iface.decodeFunctionResult('getNonce', result)[0])
    nonceCache.set(cacheKey, nonce)
    return nonce
  } catch {
    // Contract may not have getNonce — default to 0
    return 0
  }
}

/**
 * Increment the cached nonce after a successful relay.
 */
export function incrementNonce(userAddress: string, chainId: number): void {
  const cacheKey = `${chainId}:${userAddress.toLowerCase()}`
  const current = nonceCache.get(cacheKey) || 0
  nonceCache.set(cacheKey, current + 1)
}

// ============================================================
// Create Meta-Transaction Payload
// ============================================================
export function createMetaTransaction(
  to: string,
  data: string,
  chainId: number,
  from: string,
  nonce: number,
  deadlineMinutes = 10
): MetaTransactionPayload {
  const deadline = Math.floor(Date.now() / 1000) + deadlineMinutes * 60

  // Validate deadline is in the future
  if (deadline <= Math.floor(Date.now() / 1000)) {
    throw new Error('Deadline must be in the future')
  }

  return {
    from: ethers.getAddress(from),
    to: ethers.getAddress(to),
    value: 0n,
    nonce,
    data,
    deadline,
  }
}

// ============================================================
// Create Claim Airdrop Payload
// ============================================================
export function createClaimAirdropPayload(
  hackedWallet: string,
  safeWallet: string,
  tokenAddress: string,
  airdropContract: string,
  claimData: string,
  amount: string,
  nonce: number,
  deadlineMinutes = 10
): ClaimAirdropPayload {
  const deadline = Math.floor(Date.now() / 1000) + deadlineMinutes * 60

  return {
    hackedWallet: ethers.getAddress(hackedWallet),
    safeWallet: ethers.getAddress(safeWallet),
    tokenAddress: ethers.getAddress(tokenAddress),
    airdropContract: ethers.getAddress(airdropContract),
    claimData,
    amount,
    deadline,
    nonce,
  }
}

// ============================================================
// Build EIP-712 Typed Data Object
// ============================================================
export function buildTypedData(
  chainId: number,
  payload: MetaTransactionPayload
): ethers.TypedDataDomain & { types: typeof META_TX_TYPES } {
  const domain = getMetaTxDomain(chainId)
  return {
    ...domain,
    types: META_TX_TYPES,
  }
}

export function buildClaimAirdropTypedData(
  chainId: number,
  payload: ClaimAirdropPayload
) {
  const domain = getMetaTxDomain(chainId)
  return {
    types: CLAIM_AIRDROP_TYPES,
    primaryType: 'ClaimAirdrop' as const,
    domain,
    message: {
      hackedWallet: payload.hackedWallet,
      safeWallet: payload.safeWallet,
      tokenAddress: payload.tokenAddress,
      airdropContract: payload.airdropContract,
      claimData: payload.claimData,
      amount: payload.amount,
      deadline: payload.deadline,
      nonce: payload.nonce,
    },
  }
}

// ============================================================
// Sign Meta-Transaction (EIP-712)
// ============================================================
export async function signMetaTransaction(
  wallet: ethers.Wallet,
  chainId: number,
  payload: MetaTransactionPayload
): Promise<SignedMetaTransaction> {
  const domain = getMetaTxDomain(chainId)

  const signature = await wallet.signTypedData(
    domain,
    META_TX_TYPES,
    payload
  )

  return {
    payload,
    signature,
    domain,
    chainId,
  }
}

// ============================================================
// Sign Claim Airdrop (EIP-712) — used by MetaMask eth_signTypedData_v4
// Returns the typed data object for the wallet to sign
// ============================================================
export function getClaimAirdropSignRequest(
  chainId: number,
  payload: ClaimAirdropPayload
) {
  return buildClaimAirdropTypedData(chainId, payload)
}

// ============================================================
// Verify Meta-Transaction Signature
// ============================================================
export function verifyMetaTransactionSignature(
  signed: SignedMetaTransaction
): string {
  const domain = getMetaTxDomain(signed.chainId)
  const recovered = ethers.verifyTypedData(
    domain,
    META_TX_TYPES,
    signed.payload,
    signed.signature
  )
  return recovered
}

// ============================================================
// Check if deadline has expired
// ============================================================
export function isDeadlineExpired(deadline: number): boolean {
  return Math.floor(Date.now() / 1000) > deadline
}

// ============================================================
// Format deadline for display
// ============================================================
export function formatDeadline(deadline: number): string {
  const remaining = deadline - Math.floor(Date.now() / 1000)
  if (remaining <= 0) return 'Expired'
  if (remaining < 60) return `${remaining}s remaining`
  if (remaining < 3600) return `${Math.floor(remaining / 60)}m remaining`
  return `${Math.floor(remaining / 3600)}h remaining`
}
