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
  suspiciousApprovals: { chainId: number; chainName: string; token: string; spender: string; amount: string; isDrainer: boolean }[]
  drainerMethodCalls: { chainId: number; chainName: string; method: string; to: string; txHash: string; timestamp: string }[]
  privateKeyCompromised?: { isCompromised: boolean; drainerAddresses: string[]; affectedChains: string[]; method: string }
  chains: number[]
  totalChainsScanned?: number
  failedChains?: number[]
  lastActivity: string | null
}

// Known drainer contract addresses (community-maintained)
const KNOWN_DRAINERS: Record<string, string> = {
  '0xcce0a2ebe17c5e532802896fc8afcaab8abd8ba0': 'Inferno Drainer (EIP-7702)',
  '0xb0d6b42f6406d8b9ae980de584c21f517bf0b746': 'Inferno Drainer (Base)',
  '0x354bd0d713d6674605a6a41eea93cf8a8a01dc85': 'Inferno Drainer (Arbitrum)',
  '0x56a645ef8cc03631a28be1fc6c803eda7bfbbc5a': 'Inferno Drainer (Polygon)',
  '0x0000000000000000000000000000000000000000': 'Null Address',
}

// Known drainer DESTINATION addresses (where stolen funds are sent)
const KNOWN_DRAINER_DESTINATIONS: Record<string, string> = {
  '0xc1186b96930a29e3ff1e8c0c10468b2e38a08277': 'Multi-Chain Drainer #1',
  '0x49f5deaddeaddeaddeaddeaddeaddeaddeaddead': 'Dead Address Drainer',
  '0x1023729000000000000000000000000000000000': 'Multi-Chain Drainer #2',
  '0x3502cf8c00000000000000000000000000000000': 'Hemi/Scroll Drainer',
  '0x1fcbbb5500000000000000000000000000000000': 'Ink/XLayer Drainer',
  '0x4cf65b4c00000000000000000000000000000000': 'BSC/Polygon Drainer',
  '0x54ba52cbd043b0b2e11a6823a910360e31bb2544': 'Primary Drainer (Phish)',
  '0x8652767d52054d2cd29343369b19ba357f46869d': 'Secondary Drainer (Phish)',
  '0x63825239f09d8ec83bc556ec32b7773a8aaaaaaa': 'Drainer Creator',
  '0x354bd0d713d6674605a6a41eea93cf8a8a01dc85': 'Arbitrum Drainer',
  '0xb0d6b42f6406d8b9ae980de584c21f517bf0b746': 'Base Drainer',
  '0x56a645ef8cc03631a28be1fc6c803eda7bfbbc5a': 'Polygon Drainer',
  '0xcce0a2ebe17c5e532802896fc8afcaab8abd8ba0': 'Ethereum Drainer',
  '0x06ee3c7a00000000000000000000000000000000': 'Contract Interaction Target',
}

// Suspicious method selectors
const DRAINER_METHODS: Record<string, string> = {
  '0xa1798512': 'Inferno Drain (a1798512)',
  '0x23b872dd': 'transferFrom (drain)',
  '0x42842e0e': 'safeTransferFrom (NFT drain)',
  '0x095ea7b3': 'approve (setup drain)',
  '0xd505accf': 'permit (signature drain)',
  '0x2b67b570': 'Permit2 (signature drain)',
  '0x1cff79cd': 'execute (delegate call)',
  '0x692c1f72': 'execute (Permit2)',
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

  // Timeout wrapper for RPC calls
  private async withTimeout<T>(promise: Promise<T>, ms: number = 10000): Promise<T> {
    const timeout = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('RPC timeout')), ms)
    )
    return Promise.race([promise, timeout])
  }

  // Check EIP-7702 delegation
  async checkDelegation(address: string, chainId: number = 1): Promise<DelegationInfo> {
    const maxRetries = 2
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const provider = this.getProvider(chainId)
        const code = await this.withTimeout(provider.getCode(address), 8000)

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
      } catch (err) {
        if (attempt === maxRetries) {
          console.error(`Delegation check failed for chain ${chainId}:`, err)
          return { hasDelegation: false, delegatedTo: null, isDrainer: false }
        }
        // Wait before retry
        await new Promise(r => setTimeout(r, 500))
      }
    }
    return { hasDelegation: false, delegatedTo: null, isDrainer: false }
  }

  // Get native balance (ETH, BNB, etc.)
  async getNativeBalance(address: string, chainId: number): Promise<WalletAsset | null> {
    try {
      const provider = this.getProvider(chainId)
      const balance = await this.withTimeout(provider.getBalance(address), 8000)
      const chain = CHAINS[chainId]

      // Filter out dust (less than 0.00001 ETH equivalent)
      const DUST_THRESHOLD = BigInt('10000000000000') // 0.00001 ETH in wei
      if (balance <= DUST_THRESHOLD) return null

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

          // Filter out dust tokens (less than 0.00001 of token)
          const dustThreshold = BigInt(10) ** BigInt(Math.max(decimals - 5, 0))
          if (balance > dustThreshold) {
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

  // Check for suspicious approvals (approve/transferFrom drainer pattern)
  async checkSuspiciousApprovals(address: string, chainId: number): Promise<{ token: string; spender: string; amount: string; isDrainer: boolean }[]> {
    try {
      const provider = this.getProvider(chainId)
      const currentBlock = await provider.getBlockNumber()
      const fromBlock = Math.max(0, currentBlock - 100000)

      // Get Approval events
      const approvalFilter = {
        fromBlock: Math.max(0, currentBlock - 5000), // Reduced from 50k
        toBlock: 'latest',
        topics: [
          ethers.id('Approval(address,address,uint256)'),
          ethers.zeroPadValue(address, 32)
        ]
      }

      const logs = await this.withTimeout(
        provider.getLogs(approvalFilter).catch(() => []),
        8000
      )
      const suspicious: { token: string; spender: string; amount: string; isDrainer: boolean }[] = []

      for (const log of logs.slice(-50)) {
        try {
          const iface = new ethers.Interface(['event Approval(address indexed owner, address indexed spender, uint256 value)'])
          const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data })
          if (parsed) {
            const spender = parsed.args.spender.toLowerCase()
            const amount = parsed.args.value.toString()
            // Check if approval is to a known drainer or is max approval
            const isMaxApproval = amount === '115792089237316195423570985008687907853269984665640564039457584007913129639935'
            const isDrainer = KNOWN_DRAINERS[spender] !== undefined || isMaxApproval

            if (isDrainer || isMaxApproval) {
              suspicious.push({
                token: log.address,
                spender: parsed.args.spender,
                amount,
                isDrainer
              })
            }
          }
        } catch {}
      }

      return suspicious
    } catch {
      return []
    }
  }

  // Check for known drainer method calls (0xa1798512, etc.)
  async checkDrainerMethodCalls(address: string, chainId: number): Promise<{ method: string; to: string; txHash: string; timestamp: string }[]> {
    try {
      const provider = this.getProvider(chainId)
      const currentBlock = await provider.getBlockNumber()
      const fromBlock = Math.max(0, currentBlock - 5000) // Reduced from 50k to 5k

      // Known drainer method selectors
      const DRAINER_METHODS: Record<string, string> = {
        '0xa1798512': 'Inferno Drain (a1798512)',
        '0x23b872dd': 'transferFrom (drain)',
        '0x42842e0e': 'safeTransferFrom (NFT drain)',
        '0x095ea7b3': 'approve (setup drain)',
        '0xd505accf': 'permit (signature drain)',
        '0x2b67b570': 'Permit2 (signature drain)',
      }

      const drainerCalls: { method: string; to: string; txHash: string; timestamp: string }[] = []

      // FAST: Use getLogs for Transfer events FROM this address
      const transferTopic = ethers.id('Transfer(address,address,uint256)')
      const filter = {
        fromBlock,
        toBlock: 'latest',
        topics: [transferTopic, ethers.zeroPadValue(address, 32)]
      }

      const logs = await this.withTimeout(provider.getLogs(filter).catch(() => []), 8000)
      
      // Get unique tx hashes
      const txHashes = [...new Set(logs.map(l => l.transactionHash))].slice(0, 20)
      
      // Check each unique tx for drainer methods
      for (const txHash of txHashes) {
        try {
          const tx = await this.withTimeout(provider.getTransaction(txHash), 5000)
          if (tx && tx.from && tx.from.toLowerCase() === address.toLowerCase()) {
            const methodSig = tx.data.slice(0, 10)
            if (DRAINER_METHODS[methodSig]) {
              const receipt = await this.withTimeout(provider.getTransactionReceipt(txHash), 5000)
              const block = receipt ? await this.withTimeout(provider.getBlock(receipt.blockNumber), 5000) : null
              drainerCalls.push({
                method: DRAINER_METHODS[methodSig],
                to: tx.to || 'contract creation',
                txHash: tx.hash,
                timestamp: block ? new Date(Number(block.timestamp) * 1000).toISOString() : new Date().toISOString()
              })
            }
          }
        } catch {}
      }

      return drainerCalls.slice(0, 20)
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
    const failedChains: number[] = []

    // Check delegation on ALL chains (with error tracking)
    const delegationPromises = chainIds.map(async (chainId) => {
      const chain = CHAINS[chainId]
      try {
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
        return { chainId, info, success: true }
      } catch (err) {
        console.error(`Chain ${chain.name} (${chainId}) delegation check failed:`, err)
        failedChains.push(chainId)
        return { chainId, info: { hasDelegation: false, delegatedTo: null, isDrainer: false }, success: false }
      }
    })

    // Scan all chains in parallel (with error tracking)
    const scanPromises = chainIds.map(async (chainId) => {
      try {
        const [native, tokens] = await Promise.all([
          this.getNativeBalance(address, chainId),
          this.getTokenBalances(address, chainId)
        ])

        const chainAssets: WalletAsset[] = []
        if (native) chainAssets.push(native)
        chainAssets.push(...tokens)

        if (chainAssets.length > 0) activeChains.push(chainId)
        return chainAssets
      } catch (err) {
        console.error(`Chain ${chainId} scan failed:`, err)
        return []
      }
    })

    // Get recent outgoing transactions (where drained funds went)
    const drainPromises = chainIds.map(async (chainId) => {
      try {
        const provider = this.getProvider(chainId)
        const chain = CHAINS[chainId]
        const currentBlock = await provider.getBlockNumber()
        const fromBlock = Math.max(0, currentBlock - 5000) // Reduced from 50k to 5k

        // Use getLogs for Transfer events FROM this address
        const filter = {
          fromBlock,
          toBlock: 'latest',
          topics: [
            ethers.id('Transfer(address,address,uint256)'),
            ethers.zeroPadValue(address, 32)
          ]
        }

        const logs = await this.withTimeout(
          provider.getLogs(filter).catch(() => []),
          8000
        )
        
        // Get unique block numbers and fetch blocks in batch
        const blockNumbers = [...new Set(logs.map(l => l.blockNumber))]
        const blockMap = new Map<number, { timestamp: number }>()
        
        // Fetch blocks in parallel (max 5 at a time)
        for (let i = 0; i < blockNumbers.length; i += 5) {
          const batch = blockNumbers.slice(i, i + 5)
          const blocks = await Promise.all(
            batch.map(bn => this.withTimeout(provider.getBlock(bn), 5000).catch(() => null))
          )
          blocks.forEach((block, idx) => {
            if (block) blockMap.set(batch[idx], { timestamp: Number(block.timestamp) })
          })
        }
        
        const iface = new ethers.Interface(['event Transfer(address indexed from, address indexed to, uint256 value)'])
        
        for (const log of logs.slice(-20)) {
          try {
            const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data })
            const blockInfo = blockMap.get(log.blockNumber)
            if (parsed) {
              recentDrains.push({
                chainId,
                chainName: chain.name,
                to: parsed.args.to,
                value: parsed.args.value.toString(),
                timestamp: blockInfo ? new Date(blockInfo.timestamp * 1000).toISOString() : new Date().toISOString(),
                txHash: log.transactionHash
              })
            }
          } catch {}
        }
      } catch (err) {
        console.error(`Chain ${chainId} drain scan failed:`, err)
      }
    })

    // Check for suspicious approvals
    const approvalPromises = chainIds.map(async (chainId) => {
      const chain = CHAINS[chainId]
      const approvals = await this.checkSuspiciousApprovals(address, chainId)
      return approvals.map(a => ({ ...a, chainId, chainName: chain.name }))
    })

    // Check for drainer method calls
    const methodPromises = chainIds.map(async (chainId) => {
      const chain = CHAINS[chainId]
      const calls = await this.checkDrainerMethodCalls(address, chainId)
      return calls.map(c => ({ ...c, chainId, chainName: chain.name }))
    })

    const [results, , , approvalResults, methodResults] = await Promise.all([
      Promise.all(scanPromises),
      Promise.all(delegationPromises),
      Promise.all(drainPromises),
      Promise.all(approvalPromises),
      Promise.all(methodPromises)
    ])
    results.forEach(assets => allAssets.push(...assets))

    const allApprovals = approvalResults.flat()
    const allMethodCalls = methodResults.flat()

    // Detect private key compromise
    // Check if outgoing transactions go to known drainer addresses
    const drainDestinations = recentDrains.map(d => ({ to: d.to.toLowerCase(), chain: d.chainName }))
    const pkCompromised = {
      isCompromised: false,
      drainerAddresses: [] as string[],
      affectedChains: [] as string[],
      method: ''
    }
    
    for (const drain of recentDrains) {
      const toLower = drain.to.toLowerCase()
      if (KNOWN_DRAINER_DESTINATIONS[toLower] || KNOWN_DRAINERS[toLower]) {
        if (!pkCompromised.drainerAddresses.includes(toLower)) {
          pkCompromised.drainerAddresses.push(toLower)
        }
        if (!pkCompromised.affectedChains.includes(drain.chainName)) {
          pkCompromised.affectedChains.push(drain.chainName)
        }
      }
    }
    
    // Also check if wallet sends to many different addresses across chains (drain pattern)
    const uniqueDestinations = new Set(recentDrains.map(d => d.to.toLowerCase()))
    const uniqueChains = new Set(recentDrains.map(d => d.chainName))
    if (uniqueDestinations.size >= 2 && uniqueChains.size >= 3) {
      pkCompromised.isCompromised = true
      pkCompromised.method = 'multi_chain_drain_pattern'
    }
    if (pkCompromised.drainerAddresses.length >= 1) {
      pkCompromised.isCompromised = true
      pkCompromised.method = pkCompromised.method || 'known_drainer_destination'
    }

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
      suspiciousApprovals: allApprovals,
      drainerMethodCalls: allMethodCalls,
      privateKeyCompromised: pkCompromised,
      chains: activeChains,
      totalChainsScanned: chainIds.length,
      failedChains,
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
