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
  delegations: { chainId: number; chainName: string; delegatedTo: string; isDrainer: boolean; drainerName?: string }[]
  recentDrains: { chainId: number; chainName: string; to: string; value: string; timestamp: string; txHash: string }[]
  chains: number[]
  lastActivity: string | null
}

// Known drainer contract addresses (community-maintained)
const KNOWN_DRAINERS: Record<string, string> = {
  '0xcce0a2ebe17c5e532802896fc8afcaab8abd8ba0': 'Inferno Drainer (EIP-7702)',
  '0xb0d6b42f6406d8b9ae980de584c21f517bf0b746': 'Inferno Drainer (Base)',
  '0x354bd0d713d6674605a6a41eea93cf8a8a01dc85': 'Inferno Drainer (Arbitrum)',
  '0x56a645ef8cc03631a28be1fc6c803eda7bfbbc5a': 'Inferno Drainer (Polygon)',
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
        // Extract delegated address (20 bytes after 0xef0100 prefix)
        // Format: 0xef0100 + 40 hex chars (20 bytes)
        const delegatedTo = '0x' + code.slice(8, 48)
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
    const delegations: ScanResult['delegations'] = []
    const recentDrains: ScanResult['recentDrains'] = []

    // Check delegation on ALL chains
    const delegationPromises = chainIds.map(async (chainId) => {
      const chain = CHAINS[chainId]
      const info = await this.checkDelegation(address, chainId)
      if (info.hasDelegation) {
        delegations.push({
          chainId,
          chainName: chain.name,
          delegatedTo: info.delegatedTo!,
          isDrainer: info.isDrainer,
          drainerName: info.drainerName
        })
      }
      return { chainId, info }
    })

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

    // Get recent outgoing transactions (where drained funds went)
    const drainPromises = chainIds.map(async (chainId) => {
      try {
        const provider = this.getProvider(chainId)
        const chain = CHAINS[chainId]
        const currentBlock = await provider.getBlockNumber()
        const fromBlock = Math.max(0, currentBlock - 50000) // Last ~50k blocks

        // Get recent transactions FROM this address
        const txs: { hash: string; to: string; value: bigint; blockNumber: number }[] = []
        
        // Use getLogs for Transfer events FROM this address
        const filter = {
          fromBlock,
          toBlock: 'latest',
          topics: [
            ethers.id('Transfer(address,address,uint256)'),
            ethers.zeroPadValue(address, 32)
          ]
        }

        const logs = await provider.getLogs(filter).catch(() => [])
        
        for (const log of logs.slice(-20)) { // Last 20 transfers
          const block = await provider.getBlock(log.blockNumber).catch(() => null)
          if (block) {
            const iface = new ethers.Interface(['event Transfer(address indexed from, address indexed to, uint256 value)'])
            const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data })
            if (parsed) {
              recentDrains.push({
                chainId,
                chainName: chain.name,
                to: parsed.args.to,
                value: parsed.args.value.toString(),
                timestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
                txHash: log.transactionHash
              })
            }
          }
        }
      } catch {
        // Skip failed chains
      }
    })

    const [results] = await Promise.all([
      Promise.all(scanPromises),
      Promise.all(delegationPromises),
      Promise.all(drainPromises)
    ])
    results.forEach(assets => allAssets.push(...assets))

    // Main delegation (first found or Ethereum)
    const mainDelegation = delegations.find(d => d.chainId === 1) || delegations[0]

    return {
      address,
      assets: allAssets,
      totalUsdValue: 0, // TODO: Price API integration
      delegation: mainDelegation ? {
        hasDelegation: true,
        delegatedTo: mainDelegation.delegatedTo,
        isDrainer: mainDelegation.isDrainer,
        drainerName: mainDelegation.drainerName
      } : { hasDelegation: false, delegatedTo: null, isDrainer: false },
      delegations,
      recentDrains: recentDrains.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 20),
      chains: activeChains,
      lastActivity: recentDrains.length > 0 ? recentDrains[0].timestamp : null
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
