// ENS (Ethereum Name Service) Resolution
import { ethers } from 'ethers'
import { CHAINS } from './chains'

// ENS-supported chains (ENS registry lives on Ethereum mainnet, but resolution works on L2s via CCIP)
const ENS_SUPPORTED_CHAINS = new Set([1, 8453, 10, 42161, 137])

// ENS Registry address (same on all chains)
const ENS_REGISTRY = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e'

// Public resolvers for reverse resolution
const ETH_COIN_TYPE = 60

/**
 * Check if input looks like an ENS name
 */
export function isENSName(input: string): boolean {
  if (!input) return false
  const trimmed = input.trim().toLowerCase()
  // Must end with .eth, .xyz, .id, .lens, etc.
  // Must not start with 0x (that's an address)
  if (trimmed.startsWith('0x')) return false
  // Must have at least one dot and valid characters
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?\.([a-z]{2,})$/.test(trimmed)
}

/**
 * Resolve ENS name to address
 * Uses Ethereum mainnet for resolution (ENS registry is on mainnet)
 * Falls back to the target chain's RPC if mainnet is unavailable
 */
export async function resolveENS(
  name: string,
  chainId: number
): Promise<string | null> {
  if (!isENSName(name)) return null

  try {
    // Always resolve ENS on Ethereum mainnet (where the registry lives)
    const ethChain = CHAINS[1]
    const provider = new ethers.JsonRpcProvider(
      ethChain?.rpc || 'https://eth.llamarpc.com'
    )

    const address = await provider.resolveName(name)
    if (address && ethers.isAddress(address)) {
      return ethers.getAddress(address)
    }

    // Fallback: try on the target chain if it supports ENS
    if (ENS_SUPPORTED_CHAINS.has(chainId) && chainId !== 1) {
      const chainConfig = CHAINS[chainId]
      if (chainConfig) {
        const fallbackProvider = new ethers.JsonRpcProvider(chainConfig.rpc)
        const fallbackAddress = await fallbackProvider.resolveName(name)
        if (fallbackAddress && ethers.isAddress(fallbackAddress)) {
          return ethers.getAddress(fallbackAddress)
        }
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Reverse resolve address to ENS name
 * Returns the primary ENS name for an address
 */
export async function reverseResolve(
  address: string,
  chainId: number
): Promise<string | null> {
  if (!ethers.isAddress(address)) return null

  try {
    // Reverse resolution on Ethereum mainnet
    const ethChain = CHAINS[1]
    const provider = new ethers.JsonRpcProvider(
      ethChain?.rpc || 'https://eth.llamarpc.com'
    )

    const name = await provider.lookupAddress(ethers.getAddress(address))
    return name || null
  } catch {
    return null
  }
}

/**
 * Get ENS avatar for a name
 */
export async function getENSAvatar(
  name: string,
  chainId: number
): Promise<string | null> {
  if (!isENSName(name)) return null

  try {
    const ethChain = CHAINS[1]
    const provider = new ethers.JsonRpcProvider(
      ethChain?.rpc || 'https://eth.llamarpc.com'
    )

    const resolver = await provider.getResolver(name)
    if (!resolver) return null

    const avatar = await resolver.getAvatar()
    return avatar || null
  } catch {
    return null
  }
}

/**
 * Check if a chain supports ENS resolution
 */
export function isENSSupportedChain(chainId: number): boolean {
  return ENS_SUPPORTED_CHAINS.has(chainId)
}
