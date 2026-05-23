// Cross-Chain Bridge Integration
// Aggregates routes from Across, Stargate, Hop for recovered tokens

import { ethers } from 'ethers'

export interface BridgeRoute {
  fromChain: number
  toChain: number
  token: string
  bridge: string // 'Across' | 'Stargate' | 'Hop'
  fee: string // estimated fee in token units
  estimatedTime: string // e.g. '5 min'
  bridgeUrl: string
  contractAddress?: string
  inputTokenAddress?: string
  outputTokenAddress?: string
}

export interface BridgeTransaction {
  to: string
  data: string
  value: string
  bridge: string
  fromChain: number
  toChain: number
  estimatedFee: string
  estimatedTime: string
}

// Bridge registry: known bridge contracts and URLs
const BRIDGE_REGISTRY: Record<string, {
  name: string
  url: string
  supportedChains: number[]
  supportedTokens: string[]
  defaultFee: string
  defaultTime: string
  contractAddress?: string
}> = {
  across: {
    name: 'Across',
    url: 'https://across.to',
    supportedChains: [1, 10, 42161, 8453, 137, 84532, 11155111],
    supportedTokens: ['ETH', 'USDC', 'WETH', 'DAI', 'WBTC'],
    defaultFee: '0.06%',
    defaultTime: '2-5 min',
    contractAddress: '0x5c7BCd6E7De5423a257D81B442095A1a6ced35C5', // Across SpokePool (Ethereum)
  },
  stargate: {
    name: 'Stargate',
    url: 'https://stargate.finance',
    supportedChains: [1, 10, 42161, 137, 56, 43114, 8453],
    supportedTokens: ['USDC', 'USDT', 'ETH', 'WETH', 'DAI'],
    defaultFee: '0.06%',
    defaultTime: '1-3 min',
    contractAddress: '0x8731d54E9D02c286767d56ac03e8037C07e01e98', // Stargate Router (Ethereum)
  },
  hop: {
    name: 'Hop',
    url: 'https://hop.exchange',
    supportedChains: [1, 10, 42161, 137, 8453],
    supportedTokens: ['ETH', 'USDC', 'USDT', 'DAI', 'WETH'],
    defaultFee: '0.10%',
    defaultTime: '5-15 min',
    contractAddress: '0xb8901acB165ed027E32754E0FFe830802919727f', // Hop Bridge (Ethereum)
  },
}

// Chain-specific fee estimates
const CHAIN_FEE_MULTIPLIER: Record<number, number> = {
  1: 1.5,    // Ethereum = most expensive
  8453: 0.3, // Base = cheap
  42161: 0.4, // Arbitrum
  137: 0.3,  // Polygon
  10: 0.4,   // Optimism
  56: 0.3,   // BSC
  43114: 0.5, // Avalanche
}

/**
 * Get all available bridge routes between two chains for a given token
 */
export function getBridgeRoutes(
  fromChain: number,
  toChain: number,
  token: string
): BridgeRoute[] {
  const routes: BridgeRoute[] = []
  const normalizedToken = token.toUpperCase()

  for (const [key, bridge] of Object.entries(BRIDGE_REGISTRY)) {
    const supportsFrom = bridge.supportedChains.includes(fromChain)
    const supportsTo = bridge.supportedChains.includes(toChain)
    const supportsToken = bridge.supportedTokens.includes(normalizedToken)

    if (supportsFrom && supportsTo && supportsToken) {
      const feeMultiplier = CHAIN_FEE_MULTIPLIER[fromChain] || 1
      const feePercent = parseFloat(bridge.defaultFee) / 100
      const estimatedFee = `${(feePercent * feeMultiplier * 100).toFixed(2)}%`

      routes.push({
        fromChain,
        toChain,
        token: normalizedToken,
        bridge: bridge.name,
        fee: estimatedFee,
        estimatedTime: bridge.defaultTime,
        bridgeUrl: bridge.url,
        contractAddress: bridge.contractAddress,
      })
    }
  }

  // Sort by fee (cheapest first)
  routes.sort((a, b) => parseFloat(a.fee) - parseFloat(b.fee))
  return routes
}

/**
 * Build a bridge transaction for a specific route
 * Note: This returns calldata templates. Actual execution requires
 * the bridge SDK or direct contract interaction.
 */
export function buildBridgeTx(
  route: BridgeRoute,
  amount: string,
  recipient: string
): BridgeTransaction {
  const bridgeInfo = Object.values(BRIDGE_REGISTRY).find(b => b.name === route.bridge)

  if (!bridgeInfo?.contractAddress) {
    return {
      to: ethers.ZeroAddress,
      data: '0x',
      value: '0',
      bridge: route.bridge,
      fromChain: route.fromChain,
      toChain: route.toChain,
      estimatedFee: route.fee,
      estimatedTime: route.estimatedTime,
    }
  }

  // Build a generic bridge call — real implementation would use bridge SDKs
  const iface = new ethers.Interface([
    'function sendToL2(uint256 destinationChainId, address recipient, address token, uint256 amount, uint256 fee) payable'
  ])

  const feePercent = parseFloat(route.fee) / 100
  const amountWei = ethers.parseEther(amount)
  const feeWei = BigInt(Math.floor(feePercent * Number(amountWei)))

  return {
    to: bridgeInfo.contractAddress,
    data: iface.encodeFunctionData('sendToL2', [
      route.toChain,
      recipient,
      ethers.ZeroAddress, // token address resolved at call time
      amountWei - feeWei,
      feeWei,
    ]),
    value: route.token === 'ETH' ? amountWei.toString() : '0',
    bridge: route.bridge,
    fromChain: route.fromChain,
    toChain: route.toChain,
    estimatedFee: route.fee,
    estimatedTime: route.estimatedTime,
  }
}

/**
 * Get all supported bridge names
 */
export function getSupportedBridges(): string[] {
  return Object.values(BRIDGE_REGISTRY).map(b => b.name)
}

/**
 * Get supported chains for a specific bridge
 */
export function getBridgeSupportedChains(bridgeName: string): number[] {
  const bridge = Object.values(BRIDGE_REGISTRY).find(
    b => b.name.toLowerCase() === bridgeName.toLowerCase()
  )
  return bridge?.supportedChains || []
}

/**
 * Get supported tokens for a specific bridge
 */
export function getBridgeSupportedTokens(bridgeName: string): string[] {
  const bridge = Object.values(BRIDGE_REGISTRY).find(
    b => b.name.toLowerCase() === bridgeName.toLowerCase()
  )
  return bridge?.supportedTokens || []
}
