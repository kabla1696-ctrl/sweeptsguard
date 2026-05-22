/**
 * Gasless Relay System for SweepGuard
 *
 * Enables users to claim airdrops WITHOUT having gas tokens.
 * Flow: User signs EIP-712 message → Relay submits TX → Gas deducted from claim
 *
 * Supported relay providers:
 * - Gelato (https://relay.gelato.network)
 * - Biconomy (https://api.biconomy.io)
 * - OpenGSN (https://gsn.scopely.io)
 * - SweepGuard self-relay (server wallet)
 */

import { ethers } from 'ethers'
import { CHAINS } from './chains'
import {
  MetaTransactionPayload,
  SignedMetaTransaction,
  ClaimAirdropPayload,
  SignedClaimAirdrop,
  verifyMetaTransactionSignature,
  isDeadlineExpired,
  getMetaTxDomain,
  META_TX_TYPES,
  SWEEPGUARD_RESCUER,
} from './metaTx'
import { calculateRelayFee, RelayFeeEstimate } from './relayFeeManager'

// ============================================================
// Relay Provider Configuration
// ============================================================

export type RelayProvider = 'gelato' | 'biconomy' | 'opengsn' | 'self'

interface RelayProviderConfig {
  name: string
  url: string
  supportedChains: number[]
  requiresApiKey: boolean
}

const RELAY_PROVIDERS: Record<RelayProvider, RelayProviderConfig> = {
  gelato: {
    name: 'Gelato Relay',
    url: 'https://relay.gelato.network',
    supportedChains: [1, 137, 42161, 10, 56, 8453, 43114, 100, 59144, 534352],
    requiresApiKey: true,
  },
  biconomy: {
    name: 'Biconomy',
    url: 'https://api.biconomy.io',
    supportedChains: [1, 137, 42161, 10, 56, 8453, 43114, 59144],
    requiresApiKey: true,
  },
  opengsn: {
    name: 'OpenGSN',
    url: 'https://gsn.scopely.io',
    supportedChains: [1, 137, 42161, 8453],
    requiresApiKey: false,
  },
  self: {
    name: 'SweepGuard Self-Relay',
    url: '/api/relay',
    supportedChains: Object.keys(CHAINS).map(Number),
    requiresApiKey: false,
  },
}

// ============================================================
// Types
// ============================================================

export interface RelayRequest {
  signedTx: SignedMetaTransaction | SignedClaimAirdrop
  chainId: number
  provider: RelayProvider
  feePayment: 'deduct' | 'usdc' | 'free'
}

export interface RelayResponse {
  success: boolean
  txHash?: string
  relayProvider: RelayProvider
  fee: RelayFeeEstimate
  error?: string
}

export interface RelayStatus {
  available: boolean
  providers: Array<{
    name: string
    available: boolean
    chains: number[]
  }>
}

// ============================================================
// Meta-Transaction Creation
// ============================================================

/**
 * Create a meta-transaction payload for gasless claiming.
 * User signs this with their wallet, then relay submits it.
 */
export function createMetaTransaction(
  to: string,
  data: string,
  chainId: number
): {
  domain: ReturnType<typeof getMetaTxDomain>
  types: typeof META_TX_TYPES
  message: {
    from: string
    to: string
    value: string
    nonce: string
    data: string
    deadline: string
  }
} {
  const domain = getMetaTxDomain(chainId)

  return {
    domain,
    types: META_TX_TYPES,
    message: {
      from: '', // Filled by caller
      to: ethers.getAddress(to),
      value: '0',
      nonce: '0', // Filled by caller
      data,
      deadline: String(Math.floor(Date.now() / 1000) + 600), // 10 min
    },
  }
}

/**
 * Sign a meta-transaction with a wallet (for testing / server-side signing).
 * In production, the user signs via MetaMask eth_signTypedData_v4.
 */
export async function signMetaTransaction(
  wallet: ethers.Wallet,
  payload: MetaTransactionPayload,
  chainId: number
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

/**
 * Estimate the cost of relaying a transaction.
 */
export async function estimateRelayCost(
  chainId: number,
  gasEstimate: bigint = 250000n
): Promise<RelayFeeEstimate> {
  return calculateRelayFee(chainId, gasEstimate)
}

// ============================================================
// Relay Provider Selection
// ============================================================

/**
 * Get the best available relay provider for a chain.
 * Priority: self (cheapest) → gelato → biconomy → opengsn
 */
export function getBestRelayProvider(chainId: number): RelayProvider {
  // Self-relay always available (we pay gas from server wallet)
  if (RELAY_PROVIDERS.self.supportedChains.includes(chainId)) {
    return 'self'
  }

  // Try external providers
  for (const [provider, config] of Object.entries(RELAY_PROVIDERS)) {
    if (config.supportedChains.includes(chainId)) {
      return provider as RelayProvider
    }
  }

  return 'self' // Fallback to self-relay
}

/**
 * Check which relay providers are available for a chain.
 */
export function getAvailableRelayProviders(chainId: number): RelayProvider[] {
  return (Object.keys(RELAY_PROVIDERS) as RelayProvider[]).filter(
    (p) => RELAY_PROVIDERS[p].supportedChains.includes(chainId)
  )
}

/**
 * Get relay status for all chains.
 */
export function getRelayStatus(): RelayStatus {
  const allChains = new Set<number>()
  for (const config of Object.values(RELAY_PROVIDERS)) {
    for (const chain of config.supportedChains) {
      allChains.add(chain)
    }
  }

  return {
    available: true,
    providers: Object.entries(RELAY_PROVIDERS).map(([key, config]) => ({
      name: config.name,
      available: true,
      chains: config.supportedChains,
    })),
  }
}

// ============================================================
// Submit to Relay
// ============================================================

/**
 * Submit a signed meta-transaction to a relay provider.
 */
export async function submitToRelay(
  signedTx: SignedMetaTransaction | SignedClaimAirdrop,
  chainId: number,
  provider: RelayProvider = 'self'
): Promise<RelayResponse> {
  const config = RELAY_PROVIDERS[provider]
  if (!config) {
    return {
      success: false,
      relayProvider: provider,
      fee: await calculateRelayFee(chainId),
      error: `Unknown relay provider: ${provider}`,
    }
  }

  if (!config.supportedChains.includes(chainId)) {
    return {
      success: false,
      relayProvider: provider,
      fee: await calculateRelayFee(chainId),
      error: `${config.name} does not support chain ${chainId}`,
    }
  }

  // Verify signature before submitting
  try {
    if ('from' in signedTx.payload) {
      const recovered = verifyMetaTransactionSignature(signedTx as SignedMetaTransaction)
      if (recovered.toLowerCase() !== signedTx.payload.from.toLowerCase()) {
        return {
          success: false,
          relayProvider: provider,
          fee: await calculateRelayFee(chainId),
          error: 'Signature verification failed',
        }
      }
    }
  } catch {
    // Signature verification not critical for ClaimAirdrop type
  }

  // Check deadline
  const deadline = 'deadline' in signedTx.payload
    ? signedTx.payload.deadline
    : (signedTx.payload as ClaimAirdropPayload).deadline

  if (isDeadlineExpired(deadline)) {
    return {
      success: false,
      relayProvider: provider,
      fee: await calculateRelayFee(chainId),
      error: 'Meta-transaction deadline has expired. Please sign again.',
    }
  }

  // Calculate fee
  const fee = await calculateRelayFee(chainId)

  // Submit based on provider
  switch (provider) {
    case 'gelato':
      return submitToGelato(signedTx, chainId, fee)
    case 'biconomy':
      return submitToBiconomy(signedTx, chainId, fee)
    case 'opengsn':
      return submitToOpenGSN(signedTx, chainId, fee)
    case 'self':
    default:
      return submitToSelfRelay(signedTx, chainId, fee)
  }
}

// ============================================================
// Gelato Relay
// ============================================================

async function submitToGelato(
  signedTx: SignedMetaTransaction | SignedClaimAirdrop,
  chainId: number,
  fee: RelayFeeEstimate
): Promise<RelayResponse> {
  const apiKey = process.env.GELATO_API_KEY
  if (!apiKey) {
    return {
      success: false,
      relayProvider: 'gelato',
      fee,
      error: 'Gelato API key not configured',
    }
  }

  try {
    const response = await fetch(`${RELAY_PROVIDERS.gelato.url}/relays/v2/sponsored-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        chainId,
        target: 'to' in signedTx.payload
          ? signedTx.payload.to
          : (signedTx.payload as ClaimAirdropPayload).airdropContract,
        data: 'data' in signedTx.payload
          ? signedTx.payload.data
          : (signedTx.payload as ClaimAirdropPayload).claimData,
        sponsorApiKey: apiKey,
      }),
    })

    const data = await response.json()

    if (data.taskId) {
      return {
        success: true,
        txHash: data.taskId, // Gelato returns taskId, not txHash directly
        relayProvider: 'gelato',
        fee,
      }
    }

    return {
      success: false,
      relayProvider: 'gelato',
      fee,
      error: data.message || 'Gelato relay failed',
    }
  } catch (err: unknown) {
    return {
      success: false,
      relayProvider: 'gelato',
      fee,
      error: err instanceof Error ? err.message : 'Gelato relay failed',
    }
  }
}

// ============================================================
// Biconomy Relay
// ============================================================

async function submitToBiconomy(
  signedTx: SignedMetaTransaction | SignedClaimAirdrop,
  chainId: number,
  fee: RelayFeeEstimate
): Promise<RelayResponse> {
  const apiKey = process.env.BICONOMY_API_KEY
  if (!apiKey) {
    return {
      success: false,
      relayProvider: 'biconomy',
      fee,
      error: 'Biconomy API key not configured',
    }
  }

  try {
    const response = await fetch(`${RELAY_PROVIDERS.biconomy.url}/v2/meta-tx/native`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        to: 'to' in signedTx.payload
          ? signedTx.payload.to
          : (signedTx.payload as ClaimAirdropPayload).airdropContract,
        apiId: '', // Would need to register on Biconomy dashboard
        params: [
          'from' in signedTx.payload ? signedTx.payload.from : (signedTx.payload as ClaimAirdropPayload).hackedWallet,
          'data' in signedTx.payload
            ? signedTx.payload.data
            : (signedTx.payload as ClaimAirdropPayload).claimData,
        ],
        chainId,
      }),
    })

    const data = await response.json()

    if (data.txHash) {
      return {
        success: true,
        txHash: data.txHash,
        relayProvider: 'biconomy',
        fee,
      }
    }

    return {
      success: false,
      relayProvider: 'biconomy',
      fee,
      error: data.message || 'Biconomy relay failed',
    }
  } catch (err: unknown) {
    return {
      success: false,
      relayProvider: 'biconomy',
      fee,
      error: err instanceof Error ? err.message : 'Biconomy relay failed',
    }
  }
}

// ============================================================
// OpenGSN Relay
// ============================================================

async function submitToOpenGSN(
  signedTx: SignedMetaTransaction | SignedClaimAirdrop,
  chainId: number,
  fee: RelayFeeEstimate
): Promise<RelayResponse> {
  try {
    const provider = new ethers.JsonRpcProvider(
      RELAY_PROVIDERS.opengsn.url
    )

    // OpenGSN uses a different meta-tx format
    // For now, return not-implemented with helpful message
    return {
      success: false,
      relayProvider: 'opengsn',
      fee,
      error: 'OpenGSN integration requires GSN provider setup. Use self-relay or Gelato instead.',
    }
  } catch (err: unknown) {
    return {
      success: false,
      relayProvider: 'opengsn',
      fee,
      error: err instanceof Error ? err.message : 'OpenGSN relay failed',
    }
  }
}

// ============================================================
// Self-Relay (SweepGuard Server Wallet)
// ============================================================

async function submitToSelfRelay(
  signedTx: SignedMetaTransaction | SignedClaimAirdrop,
  chainId: number,
  fee: RelayFeeEstimate
): Promise<RelayResponse> {
  try {
    const response = await fetch('/api/relay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signedTx,
        chainId,
        feePayment: 'deduct',
      }),
    })

    const data = await response.json()

    if (data.success) {
      return {
        success: true,
        txHash: data.txHash,
        relayProvider: 'self',
        fee,
      }
    }

    return {
      success: false,
      relayProvider: 'self',
      fee,
      error: data.error || 'Self-relay failed',
    }
  } catch (err: unknown) {
    return {
      success: false,
      relayProvider: 'self',
      fee,
      error: err instanceof Error ? err.message : 'Self-relay failed',
    }
  }
}

// ============================================================
// Gasless Claim Flow (Full Pipeline)
// ============================================================

export interface GaslessClaimParams {
  contractAddress: string
  chainId: number
  walletAddress: string
  safeWallet: string
  tokenAddress: string
  claimableRaw: string
  claimData?: string
  merkleProof?: string
}

export interface GaslessClaimResult {
  success: boolean
  txHash?: string
  fee: RelayFeeEstimate
  relayProvider: RelayProvider
  error?: string
}

/**
 * Execute a full gasless claim:
 * 1. Build claim calldata
 * 2. Create meta-transaction
 * 3. Estimate fee
 * 4. Return data for user to sign (frontend handles signing)
 */
export async function prepareGaslessClaim(
  params: GaslessClaimParams
): Promise<{
  typedData: object
  fee: RelayFeeEstimate
  relayProvider: RelayProvider
  nonce: number
  deadline: number
}> {
  const {
    contractAddress,
    chainId,
    walletAddress,
    safeWallet,
    tokenAddress,
    claimableRaw,
    claimData,
  } = params

  // Get best relay provider
  const relayProvider = getBestRelayProvider(chainId)

  // Estimate fee
  const fee = await estimateRelayCost(chainId, 250000n)

  // Get nonce (from contract or cache)
  const provider = new ethers.JsonRpcProvider(
    CHAINS[chainId]?.rpc || 'https://mainnet.base.org'
  )
  const nonce = 0 // Will be fetched from contract in production
  const deadline = Math.floor(Date.now() / 1000) + 600

  // Build claim calldata if not provided
  let finalClaimData = claimData || '0x'
  if (!claimData || claimData === '0x') {
    const iface = new ethers.Interface([
      'function claim()',
      'function claim(address to)',
      'function claim(address to, uint256 amount, bytes32[] proof)',
    ])
    try {
      finalClaimData = iface.encodeFunctionData('claim', [walletAddress])
    } catch {
      finalClaimData = iface.encodeFunctionData('claim')
    }
  }

  // Build EIP-712 typed data
  const verifyingContract = SWEEPGUARD_RESCUER[chainId]
  if (!verifyingContract) {
    throw new Error(`SweepGuard not deployed on chain ${chainId}`)
  }

  const typedData = {
    types: {
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
    },
    primaryType: 'ClaimAirdrop',
    domain: {
      name: 'SweepGuard',
      version: '1',
      chainId,
      verifyingContract,
    },
    message: {
      hackedWallet: ethers.getAddress(walletAddress),
      safeWallet: ethers.getAddress(safeWallet),
      tokenAddress: ethers.getAddress(tokenAddress || contractAddress),
      airdropContract: ethers.getAddress(contractAddress),
      claimData: finalClaimData,
      amount: claimableRaw || '0',
      deadline,
      nonce,
    },
  }

  return {
    typedData,
    fee,
    relayProvider,
    nonce,
    deadline,
  }
}
