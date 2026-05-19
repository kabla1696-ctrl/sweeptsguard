import { ethers } from 'ethers'
import { CHAINS } from './chains'

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
]

export interface SweepConfig {
  compromisedAddress: string
  safeAddress: string
  privateKey: string
  chainIds: number[]
  sweepNative: boolean
  sweepTokens: boolean
  minEthBalance: string // Min ETH to keep for gas
}

export interface SweepResult {
  success: boolean
  chainId: number
  chainName: string
  asset: string
  amount: string
  txHash?: string
  error?: string
}

export class SweepEngine {
  private config: SweepConfig
  private providers: Map<number, ethers.JsonRpcProvider> = new Map()
  private wallets: Map<number, ethers.Wallet> = new Map()

  constructor(config: SweepConfig) {
    this.config = config

    for (const chainId of config.chainIds) {
      const chain = CHAINS[chainId]
      if (!chain) continue

      const provider = new ethers.JsonRpcProvider(chain.rpc)
      const wallet = new ethers.Wallet(config.privateKey, provider)

      this.providers.set(chainId, provider)
      this.wallets.set(chainId, wallet)
    }
  }

  // Sweep native currency (ETH/BNB/etc)
  async sweepNative(chainId: number): Promise<SweepResult> {
    const chain = CHAINS[chainId]
    const provider = this.providers.get(chainId)
    const wallet = this.wallets.get(chainId)

    if (!provider || !wallet || !chain) {
      return { success: false, chainId, chainName: chain?.name || 'Unknown', asset: 'ETH', amount: '0', error: 'Chain not configured' }
    }

    try {
      const balance = await provider.getBalance(this.config.compromisedAddress)
      const minKeep = ethers.parseEther(this.config.minEthBalance)

      if (balance <= minKeep) {
        return { success: false, chainId, chainName: chain.name, asset: chain.nativeCurrency, amount: '0', error: 'Balance below minimum' }
      }

      // Estimate gas
      const gasEstimate = await provider.estimateGas({
        from: this.config.compromisedAddress,
        to: this.config.safeAddress,
        value: balance - minKeep
      })

      const feeData = await provider.getFeeData()
      const gasCost = gasEstimate * (feeData.gasPrice || BigInt(0))

      if (balance - minKeep <= gasCost) {
        return { success: false, chainId, chainName: chain.name, asset: chain.nativeCurrency, amount: '0', error: 'Not enough for gas' }
      }

      const sweepAmount = balance - minKeep - gasCost

      // Send transaction
      const tx = await wallet.sendTransaction({
        from: this.config.compromisedAddress,
        to: this.config.safeAddress,
        value: sweepAmount,
        gasLimit: gasEstimate
      })

      return {
        success: true,
        chainId,
        chainName: chain.name,
        asset: chain.nativeCurrency,
        amount: ethers.formatEther(sweepAmount),
        txHash: tx.hash
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      return { success: false, chainId, chainName: chain.name, asset: chain.nativeCurrency, amount: '0', error: errorMessage }
    }
  }

  // Sweep ERC-20 tokens
  async sweepToken(chainId: number, tokenAddress: string): Promise<SweepResult> {
    const chain = CHAINS[chainId]
    const wallet = this.wallets.get(chainId)
    const provider = this.providers.get(chainId)

    if (!wallet || !provider || !chain) {
      return { success: false, chainId, chainName: chain?.name || 'Unknown', asset: 'TOKEN', amount: '0', error: 'Chain not configured' }
    }

    try {
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet)
      const [balance, decimals, symbol] = await Promise.all([
        contract.balanceOf(this.config.compromisedAddress),
        contract.decimals().catch(() => 18),
        contract.symbol().catch(() => 'UNKNOWN')
      ])

      if (balance === BigInt(0)) {
        return { success: false, chainId, chainName: chain.name, asset: symbol, amount: '0', error: 'Zero balance' }
      }

      const tx = await contract.transfer(this.config.safeAddress, balance)

      return {
        success: true,
        chainId,
        chainName: chain.name,
        asset: symbol,
        amount: ethers.formatUnits(balance, decimals),
        txHash: tx.hash
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      return { success: false, chainId, chainName: chain.name, asset: 'TOKEN', amount: '0', error: errorMessage }
    }
  }

  // Execute full sweep on a chain
  async sweepChain(chainId: number): Promise<SweepResult[]> {
    const results: SweepResult[] = []

    // Sweep native first
    if (this.config.sweepNative) {
      const result = await this.sweepNative(chainId)
      results.push(result)
    }

    return results
  }

  // Get all balances across chains
  async getAllBalances(): Promise<{ chainId: number; chainName: string; native: string; tokens: { symbol: string; balance: string; address: string }[] }[]> {
    const balances: { chainId: number; chainName: string; native: string; tokens: { symbol: string; balance: string; address: string }[] }[] = []

    for (const [chainId, provider] of this.providers) {
      const chain = CHAINS[chainId]
      if (!chain) continue

      try {
        const nativeBalance = await provider.getBalance(this.config.compromisedAddress)
        balances.push({
          chainId,
          chainName: chain.name,
          native: ethers.formatEther(nativeBalance),
          tokens: [] // TODO: Scan for tokens
        })
      } catch {
        // Skip failed chains
      }
    }

    return balances
  }
}

export function createSweepEngine(config: SweepConfig): SweepEngine {
  return new SweepEngine(config)
}
