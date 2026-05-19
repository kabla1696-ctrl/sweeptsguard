import { ethers } from 'ethers'
import { CHAINS, type ChainConfig } from './chains'

// ERC-20 ABI (minimal)
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
]

// EIP-7702 delegation detection
const EIP7702_DELEGATION_PREFIX = '0xef0100'

export interface WalletAsset {
  type: 'native' | 'erc20'
  symbol: string
  name?: string
  balance: string
  balanceFormatted: string
  decimals: number
  contractAddress?: string
  chainId: number
  chainName: string
  usdValue?: number
}

export interface DelegationInfo {
  hasDelegation: boolean
  delegatedTo: string | null
  isDrainer: boolean
  drainerName?: string
}

export interface ScanResult {
  address: string
  assets: WalletAsset[]
  totalUsdValue: number
  delegation: DelegationInfo
  chains: number[]
  lastActivity: string | null
}

// Known drainer contract addresses (community-maintained)
const KNOWN_DRAINERS: Record<string, string> = {
  '0xCce0A2eBE17c5E532802896Fc8AfCaaB8aBD8ba0': 'Inferno Drainer (EIP-7702)',
  '0x0000000000000000000000000000000000000000': 'Null Address',
  // Add more as discovered
}

export class WalletScanner {
  private providers: Map<number, ethers.JsonRpcProvider> = new Map()

  constructor() {
    for (const [id, chain] of Object.entries(CHAINS)) {
      this.providers.set(Number(id), new ethers.JsonRpcProvider(chain.rpc))
    }
  }

  getProvider(chainId: number): ethers.JsonRpcProvider {
    const provider = this.providers.get(chainId)
    if (!provider) throw new Error(`Chain ${chainId} not supported`)
    return provider
  }

  // Check EIP-7702 delegation
  async checkDelegation(address: string, chainId: number = 1): Promise<DelegationInfo> {
    try {
      const provider = this.getProvider(chainId)
      const code = await provider.getCode(address)

      if (code && code.startsWith(EIP7702_DELEGATION_PREFIX)) {
        // Extract delegated address (last 20 bytes after prefix)
        const delegatedTo = '0x' + code.slice(22) // Remove 0xef0100 + 2 padding zeros
        const isDrainer = KNOWN_DRAINERS[delegatedTo.toLowerCase()] !== undefined ||
                          KNOWN_DRAINERS[delegatedTo] !== undefined

        return {
          hasDelegation: true,
          delegatedTo,
          isDrainer,
          drainerName: KNOWN_DRAINERS[delegatedTo.toLowerCase()] ||
                       KNOWN_DRAINERS[delegatedTo] ||
                       (isDrainer ? 'Unknown Drainer' : undefined)
        }
      }

      return { hasDelegation: false, delegatedTo: null, isDrainer: false }
    } catch {
      return { hasDelegation: false, delegatedTo: null, isDrainer: false }
    }
  }

  // Get native balance (ETH, BNB, etc.)
  async getNativeBalance(address: string, chainId: number): Promise<WalletAsset | null> {
    try {
      const provider = this.getProvider(chainId)
      const balance = await provider.getBalance(address)
      const chain = CHAINS[chainId]

      if (balance === BigInt(0)) return null

      return {
        type: 'native',
        symbol: chain.nativeCurrency,
        balance: balance.toString(),
        balanceFormatted: ethers.formatEther(balance),
        decimals: 18,
        chainId,
        chainName: chain.name
      }
    } catch {
      return null
    }
  }

  // Get ERC-20 token balances
  async getTokenBalances(address: string, chainId: number): Promise<WalletAsset[]> {
    try {
      const provider = this.getProvider(chainId)
      const chain = CHAINS[chainId]

      // Use Multicall3 for efficient batch calls
      const multicallAddress = chain.multicallAddress
      if (!multicallAddress) return []

      // Get recent token transfer events to find tokens
      const filter = {
        fromBlock: -10000, // Last ~10000 blocks
        toBlock: 'latest',
        topics: [
          ethers.id('Transfer(address,address,uint256)'),
          null,
          ethers.zeroPadValue(address, 32)
        ]
      }

      const logs = await provider.getLogs(filter).catch(() => [])
      const tokenAddresses = [...new Set(logs.map(log => log.address))]

      const assets: WalletAsset[] = []

      // Check balance for each token
      for (const tokenAddr of tokenAddresses.slice(0, 50)) { // Limit to 50 tokens
        try {
          const contract = new ethers.Contract(tokenAddr, ERC20_ABI, provider)
          const [balance, decimals, symbol] = await Promise.all([
            contract.balanceOf(address),
            contract.decimals().catch(() => 18),
            contract.symbol().catch(() => 'UNKNOWN')
          ])

          if (balance > BigInt(0)) {
            assets.push({
              type: 'erc20',
              symbol,
              balance: balance.toString(),
              balanceFormatted: ethers.formatUnits(balance, decimals),
              decimals,
              contractAddress: tokenAddr,
              chainId,
              chainName: chain.name
            })
          }
        } catch {
          // Skip tokens that fail
        }
      }

      return assets
    } catch {
      return []
    }
  }

  // Full wallet scan
  async scanWallet(address: string, chainIds: number[] = [1, 8453, 56]): Promise<ScanResult> {
    const allAssets: WalletAsset[] = []
    const activeChains: number[] = []

    // Check delegation on mainnet
    const delegation = await this.checkDelegation(address, 1)

    // Scan all chains in parallel
    const scanPromises = chainIds.map(async (chainId) => {
      const [native, tokens] = await Promise.all([
        this.getNativeBalance(address, chainId),
        this.getTokenBalances(address, chainId)
      ])

      const chainAssets: WalletAsset[] = []
      if (native) chainAssets.push(native)
      chainAssets.push(...tokens)

      if (chainAssets.length > 0) activeChains.push(chainId)
      return chainAssets
    })

    const results = await Promise.all(scanPromises)
    results.forEach(assets => allAssets.push(...assets))

    return {
      address,
      assets: allAssets,
      totalUsdValue: 0, // TODO: Price API integration
      delegation,
      chains: activeChains,
      lastActivity: null
    }
  }

  // Check if address is a known exchange
  async isExchangeAddress(address: string): Promise<{ isExchange: boolean; name?: string }> {
    // Known exchange deposit addresses (simplified - in production use a larger database)
    const exchanges: Record<string, string> = {
      '0x28c6c06298d514db089934071355e5743bf21d60': 'Binance',
      '0x21a31ee1afc51d94c2efccaa2092ad1028285549': 'Binance',
      '0x56eddb7aa87536c09ccc2793473599fd21a8b17f': 'Binance',
      '0x974caa59e49682cda0ad2bbe82983419a2ecc400': 'Coinbase',
      '0xa9d1e08c7793af67e9d92fe308d5697fb81d3e43': 'Coinbase',
      '0x503828976d22510aad0201ac7ec88293211d23da': 'Coinbase',
      '0x1151314c646ce4e0efd76d1af4760ae66a9fe30f': 'Bybit',
      '0xf89d7b9c864f589bbf53a82105107622b35eaa40': 'Bybit',
    }

    const normalized = address.toLowerCase()
    return {
      isExchange: exchanges[normalized] !== undefined,
      name: exchanges[normalized]
    }
  }
}

export const scanner = new WalletScanner()
