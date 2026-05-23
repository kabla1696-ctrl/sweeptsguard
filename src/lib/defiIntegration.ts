// DeFi Integration — Auto-stake recovered tokens
// Provides staking options via Lido, Aave, Compound, Rocket Pool

import { ethers } from 'ethers'

export interface StakeOption {
  protocol: string
  token: string // output token symbol (stETH, aUSDC, etc.)
  inputToken: string // input token symbol (ETH, USDC, etc.)
  apy: string // e.g. '4.5%'
  chainId: number
  minAmount: string // in human-readable units
  contractAddress: string // the staking/deposit contract
  description: string
}

export interface StakeTransaction {
  to: string
  data: string
  value: string
  protocol: string
  inputToken: string
  outputToken: string
  estimatedAPY: string
}

// Known staking protocol contracts and configurations
const STAKE_PROTOCOLS: Record<number, StakeOption[]> = {
  // Ethereum Mainnet
  1: [
    {
      protocol: 'Lido',
      token: 'stETH',
      inputToken: 'ETH',
      apy: '3.2%',
      chainId: 1,
      minAmount: '0.001',
      contractAddress: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
      description: 'Stake ETH with Lido for stETH. Liquid staking — use stETH in DeFi while earning staking rewards.'
    },
    {
      protocol: 'Rocket Pool',
      token: 'rETH',
      inputToken: 'ETH',
      apy: '3.0%',
      chainId: 1,
      minAmount: '0.01',
      contractAddress: '0xae78736Cd615f374D3085123A210448E74Fc6393',
      description: 'Stake ETH with Rocket Pool for rETH. Decentralized liquid staking with no minimum deposit lock.'
    },
    {
      protocol: 'Aave V3',
      token: 'aUSDC',
      inputToken: 'USDC',
      apy: '4.5%',
      chainId: 1,
      minAmount: '1',
      contractAddress: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
      description: 'Supply USDC to Aave V3 and earn interest. aUSDC accrues value over time.'
    },
    {
      protocol: 'Compound V3',
      token: 'cUSDC',
      inputToken: 'USDC',
      apy: '3.8%',
      chainId: 1,
      minAmount: '1',
      contractAddress: '0xc3d688B66703497DAA19211EEdff47f25384cdc3',
      description: 'Supply USDC to Compound V3. Earn COMP rewards on top of base interest.'
    },
  ],
  // Base
  8453: [
    {
      protocol: 'Aave V3',
      token: 'aUSDC',
      inputToken: 'USDC',
      apy: '5.1%',
      chainId: 8453,
      minAmount: '1',
      contractAddress: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
      description: 'Supply USDC to Aave V3 on Base. Higher yields than mainnet due to incentives.'
    },
  ],
  // Arbitrum
  42161: [
    {
      protocol: 'Aave V3',
      token: 'aUSDC',
      inputToken: 'USDC',
      apy: '4.8%',
      chainId: 42161,
      minAmount: '1',
      contractAddress: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
      description: 'Supply USDC to Aave V3 on Arbitrum. Low gas fees.'
    },
  ],
  // Optimism
  10: [
    {
      protocol: 'Aave V3',
      token: 'aUSDC',
      inputToken: 'USDC',
      apy: '4.6%',
      chainId: 10,
      minAmount: '1',
      contractAddress: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
      description: 'Supply USDC to Aave V3 on Optimism. OP token incentives available.'
    },
  ],
  // Polygon
  137: [
    {
      protocol: 'Aave V3',
      token: 'aUSDC',
      inputToken: 'USDC',
      apy: '5.3%',
      chainId: 137,
      minAmount: '1',
      contractAddress: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
      description: 'Supply USDC to Aave V3 on Polygon. High yields with low gas.'
    },
  ],
}

// Common ERC-20 addresses for matching
const TOKEN_ADDRESSES: Record<number, Record<string, string>> = {
  1: {
    'USDC': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    'DAI': '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    'WETH': '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  },
  8453: {
    'USDC': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  },
  42161: {
    'USDC': '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  },
  10: {
    'USDC': '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  },
  137: {
    'USDC': '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  },
}

/**
 * Get available staking options for a chain and token
 */
export function getStakeOptions(chainId: number, tokenAddress?: string): StakeOption[] {
  const chainOptions = STAKE_PROTOCOLS[chainId] || []

  if (!tokenAddress) return chainOptions

  // Filter by input token address match
  const tokenMap = TOKEN_ADDRESSES[chainId] || {}
  const normalizedAddr = tokenAddress.toLowerCase()

  for (const [symbol, addr] of Object.entries(tokenMap)) {
    if (addr.toLowerCase() === normalizedAddr) {
      return chainOptions.filter(o => o.inputToken === symbol || o.inputToken === 'ETH')
    }
  }

  // If no match, return ETH options (native token)
  return chainOptions.filter(o => o.inputToken === 'ETH')
}

/**
 * Get all supported staking options across all chains
 */
export function getAllStakeOptions(): StakeOption[] {
  const all: StakeOption[] = []
  for (const options of Object.values(STAKE_PROTOCOLS)) {
    all.push(...options)
  }
  return all
}

/**
 * Build a staking transaction for direct execution
 */
export function buildStakeTx(option: StakeOption, amount: string): StakeTransaction {
  const amountWei = ethers.parseEther(amount)

  if (option.protocol === 'Lido' && option.inputToken === 'ETH') {
    // Lido submit() — payable, send ETH to get stETH
    return {
      to: option.contractAddress,
      data: '0xa1903eab', // submit() selector
      value: amountWei.toString(),
      protocol: option.protocol,
      inputToken: option.inputToken,
      outputToken: option.token,
      estimatedAPY: option.apy,
    }
  }

  if (option.protocol === 'Rocket Pool' && option.inputToken === 'ETH') {
    // Rocket Pool deposit()
    const iface = new ethers.Interface(['function deposit() payable'])
    return {
      to: option.contractAddress,
      data: iface.encodeFunctionData('deposit'),
      value: amountWei.toString(),
      protocol: option.protocol,
      inputToken: option.inputToken,
      outputToken: option.token,
      estimatedAPY: option.apy,
    }
  }

  // Aave/Compound: supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)
  if (option.protocol.startsWith('Aave') || option.protocol.startsWith('Compound')) {
    // For ERC-20 supply, we need the token address — build a generic supply calldata
    // The caller must have already approved the contract to spend tokens
    const iface = new ethers.Interface([
      'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)'
    ])
    // Placeholder: actual token address resolved at call time
    return {
      to: option.contractAddress,
      data: iface.encodeFunctionData('supply', [
        TOKEN_ADDRESSES[option.chainId]?.[option.inputToken] || ethers.ZeroAddress,
        amountWei.toString(),
        ethers.ZeroAddress, // onBehalfOf: caller
        0 // referralCode
      ]),
      value: '0',
      protocol: option.protocol,
      inputToken: option.inputToken,
      outputToken: option.token,
      estimatedAPY: option.apy,
    }
  }

  // Fallback — return contract address for manual interaction
  return {
    to: option.contractAddress,
    data: '0x',
    value: option.inputToken === 'ETH' ? amountWei.toString() : '0',
    protocol: option.protocol,
    inputToken: option.inputToken,
    outputToken: option.token,
    estimatedAPY: option.apy,
  }
}

/**
 * Resolve a token symbol to its address on a given chain
 */
export function getTokenAddress(chainId: number, symbol: string): string | undefined {
  return TOKEN_ADDRESSES[chainId]?.[symbol]
}

/**
 * Get supported chains for DeFi staking
 */
export function getSupportedChains(): number[] {
  return Object.keys(STAKE_PROTOCOLS).map(Number)
}
