import { ethers } from 'ethers'
import { CHAINS } from './chains'

export interface AirdropClaim {
  id: string
  project: string
  chainId: number
  chainName: string
  tokenAddress: string
  tokenSymbol: string
  claimContract: string
  claimData: string // Encoded function call
  deadline?: number
  merkleProof?: string[]
  amount?: string
  status: 'pending' | 'claimed' | 'failed' | 'expired'
  txHash?: string
  error?: string
}

// ============================================================
// FEE COLLECTOR CONFIGURATION
// Platform fee: 20% of claimed airdrops
// Fee wallet: Abir's wallet
// ============================================================

export const PLATFORM_FEE_WALLET = '0x7A3725154a2E6468F9549334394802e9E2822C2A'
export const PLATFORM_FEE_PERCENT = 20 // 20%

// Deployed FeeCollector contract addresses (deploy per chain)
export const FEE_COLLECTOR_CONTRACTS: Record<number, string> = {
  // TODO: Deploy FeeCollector.sol on each chain and add address here
  // 1: '0x...', // Ethereum
  // 8453: '0x...', // Base
  // 56: '0x...', // BNB Chain
  // 42161: '0x...', // Arbitrum
  // 137: '0x...', // Polygon
  // 10: '0x...', // Optimism
  // 43114: '0x...', // Avalanche
  // 250: '0x...', // Fantom
  // 25: '0x...', // Cronos
  // 81457: '0x...', // Blast
  // 7777777: '0x...', // Zora
  // 1101: '0x...', // Polygon zkEVM
  // 169: '0x...', // Manta Pacific
  // 324: '0x...', // zkSync Era
  // 59144: '0x...', // Linea
}

export interface ClaimResult {
  success: boolean
  txHash?: string
  error?: string
  chainName: string
  tokenSymbol: string
  totalClaimed?: string
  feeAmount?: string
  userAmount?: string
}

// Common airdrop claim function signatures
const CLAIM_SIGNATURES = {
  // Standard Merkle drop
  claim: 'claim(address,uint256,bytes32[])',
  // Merkle with deadline
  claimWithDeadline: 'claim(address,uint256,bytes32[],uint256)',
  // Simple claim (no params)
  claimSimple: 'claim()',
  // Claim on behalf (claimTo pattern)
  claimOnBehalf: 'claimOnBehalf(address,address,uint256,bytes32[])',
  // Claim with signature
  claimWithSig: 'claim(address,bytes)',
  // ERC20 permit-style
  permitClaim: 'permitAndClaim(address,uint256,uint256,uint8,bytes32,bytes32)',
}

export class AirdropClaimer {
  private providers: Map<number, ethers.JsonRpcProvider> = new Map()

  constructor() {
    for (const [id, chain] of Object.entries(CHAINS)) {
      this.providers.set(Number(id), new ethers.JsonRpcProvider(chain.rpc))
    }
  }

  // Encode claim transaction data
  encodeClaimData(
    method: string,
    params: Record<string, unknown>
  ): string {
    switch (method) {
      case 'claim': {
        const iface = new ethers.Interface([
          `function ${CLAIM_SIGNATURES.claim}`
        ])
        const { recipient, amount, proof } = params as { recipient: string; amount: string; proof: string[] }
        return iface.encodeFunctionData('claim', [recipient, amount, proof])
      }
      case 'claimWithDeadline': {
        const iface = new ethers.Interface([
          `function ${CLAIM_SIGNATURES.claimWithDeadline}`
        ])
        const { recipient, amount, proof, deadline } = params as { recipient: string; amount: string; proof: string[]; deadline: number }
        return iface.encodeFunctionData('claimWithDeadline', [recipient, amount, proof, deadline])
      }
      case 'claimSimple': {
        const iface = new ethers.Interface([
          `function ${CLAIM_SIGNATURES.claimSimple}`
        ])
        return iface.encodeFunctionData('claim', [])
      }
      default:
        throw new Error(`Unknown claim method: ${method}`)
    }
  }

  // Claim airdrop using hacked wallet, but set recipient to safe wallet
  async claimAirdrop(
    claimContract: string,
    chainId: number,
    claimData: string,
    hackedWalletPrivateKey: string
  ): Promise<ClaimResult> {
    const provider = this.providers.get(chainId)
    const chain = CHAINS[chainId]

    if (!provider || !chain) {
      return { success: false, error: 'Chain not supported', chainName: 'Unknown', tokenSymbol: 'Unknown' }
    }

    try {
      const wallet = new ethers.Wallet(hackedWalletPrivateKey, provider)

      // Check if wallet has gas
      const balance = await provider.getBalance(wallet.address)
      const minGas = ethers.parseEther('0.001')

      if (balance < minGas) {
        return {
          success: false,
          error: `Insufficient gas. Need at least 0.001 ${chain.nativeCurrency}, have ${ethers.formatEther(balance)}. Use gas sponsorship feature.`,
          chainName: chain.name,
          tokenSymbol: 'Unknown'
        }
      }

      // Send claim transaction
      const tx = await wallet.sendTransaction({
        to: claimContract,
        data: claimData,
        gasLimit: 200000n,
      })

      return {
        success: true,
        txHash: tx.hash,
        chainName: chain.name,
        tokenSymbol: 'Unknown'
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Claim failed'
      return {
        success: false,
        error: errorMessage,
        chainName: chain.name,
        tokenSymbol: 'Unknown'
      }
    }
  }

  // Claim airdrop with gas sponsorship via Flashbots atomic bundle
  // Sponsor wallet funds gas → compromised wallet claims → same block
  // If useFeeCollector is true, also splits 80/20 in same transaction
  async claimWithSponsorship(
    claimContract: string,
    chainId: number,
    claimData: string,
    hackedWalletPrivateKey: string,
    sponsorPrivateKey: string,
    tokenAddress?: string,  // Required for fee collector
    userSafeWallet?: string,  // Required for fee collector
    feeMode?: string,  // 'slow' | 'medium' | 'aggressive'
    gasPriceOverride?: number  // Gas price from extension
  ): Promise<ClaimResult> {
    const provider = this.providers.get(chainId)
    const chain = CHAINS[chainId]

    if (!provider || !chain) {
      return { success: false, error: 'Chain not supported', chainName: 'Unknown', tokenSymbol: 'Unknown' }
    }

    try {
      const hackedWallet = new ethers.Wallet(hackedWalletPrivateKey, provider)
      const sponsorWallet = new ethers.Wallet(sponsorPrivateKey, provider)

      // Get gas price - use override if provided, otherwise fetch from network
      let gasPrice: bigint;
      if (gasPriceOverride) {
        // Convert from Gwei to Wei
        gasPrice = ethers.parseUnits(gasPriceOverride.toString(), 'gwei');
      } else {
        const feeData = await provider.getFeeData();
        gasPrice = feeData.gasPrice || feeData.maxFeePerGas || ethers.parseUnits('30', 'gwei');
        
        // Apply fee mode multiplier
        if (feeMode) {
          switch (feeMode) {
            case 'slow':
              gasPrice = gasPrice * 80n / 100n; // 80% of base
              break;
            case 'medium':
              // 100% of base (default)
              break;
            case 'aggressive':
              gasPrice = gasPrice * 150n / 100n; // 150% of base
              break;
          }
        }
      }

      // Gas needed for claim tx (~200k gas) + transfers (~100k gas)
      const gasNeeded = BigInt(300000) * gasPrice + ethers.parseEther('0.001')

      // Check sponsor balance
      const sponsorBalance = await provider.getBalance(sponsorWallet.address)
      if (sponsorBalance < gasNeeded) {
        return {
          success: false,
          error: `Sponsor needs at least ${ethers.formatEther(gasNeeded)} ${chain.nativeCurrency}, have ${ethers.formatEther(sponsorBalance)}`,
          chainName: chain.name,
          tokenSymbol: 'Unknown'
        }
      }

      const hackedNonce = await provider.getTransactionCount(hackedWallet.address)
      const sponsorNonce = await provider.getTransactionCount(sponsorWallet.address)

      let transactions: string[] = []

      // TX 1 (from sponsor): Send gas ETH to hacked wallet
      const fundTx = await sponsorWallet.signTransaction({
        to: hackedWallet.address,
        value: gasNeeded,
        gasLimit: 21000n,
        gasPrice,
        nonce: sponsorNonce,
        chainId
      })
      transactions.push(fundTx)

      // If fee collector is configured, use it for atomic splitting
      const feeCollectorAddress = FEE_COLLECTOR_CONTRACTS[chainId]
      if (feeCollectorAddress && tokenAddress && userSafeWallet) {
        // Claim through FeeCollector contract (automatically splits 80/20)
        const feeCollectorIface = new ethers.Interface([
          'function claimAndSplit(address token, bytes calldata claimData, address claimContract, address userWallet)'
        ])
        const splitData = feeCollectorIface.encodeFunctionData('claimAndSplit', [
          tokenAddress,
          claimData,
          claimContract,
          userSafeWallet
        ])

        const claimTx = await hackedWallet.signTransaction({
          to: feeCollectorAddress,
          data: splitData,
          value: 0n,
          gasLimit: 300000n,
          gasPrice,
          nonce: hackedNonce,
          chainId
        })
        transactions.push(claimTx)
      } else {
        // Regular claim (no fee splitting)
        const claimTx = await hackedWallet.signTransaction({
          to: claimContract,
          data: claimData,
          value: 0n,
          gasLimit: 200000n,
          gasPrice,
          nonce: hackedNonce,
          chainId
        })
        transactions.push(claimTx)
      }

      // Submit as Flashbots atomic bundle
      const { submitRecoveryBundle } = await import('./fundRecovery')
      const bundleResult = await submitRecoveryBundle(
        transactions,
        chainId,
        chain.rpc
      )

      if (bundleResult.success) {
        return {
          success: true,
          txHash: bundleResult.bundleHash || 'bundle',
          chainName: chain.name,
          tokenSymbol: 'Unknown'
        }
      }

      // Fallback: direct submission
      const txHashes: string[] = []
      for (const signedTx of transactions) {
        const tx = await provider.broadcastTransaction(signedTx)
        txHashes.push(tx.hash)
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      return {
        success: true,
        txHash: txHashes[1] || txHashes[0],
        chainName: chain.name,
        tokenSymbol: 'Unknown'
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Claim failed'
      return {
        success: false,
        error: errorMessage,
        chainName: chain.name,
        tokenSymbol: 'Unknown'
      }
    }
  }

  // Claim airdrop FROM ANY WALLET (not compromised wallet)
  // Use when: compromised wallet has 0 gas, but is eligible for airdrop
  // The "fromWallet" (with gas) sends the tx, tokens go to safeWallet
  async claimFromAnyWallet(
    claimContract: string,
    chainId: number,
    eligibleAddress: string,  // compromised wallet (eligible for airdrop)
    safeWalletAddress: string,  // where tokens should go
    fromPrivateKey: string,  // wallet WITH gas (your normal wallet)
    claimData: string
  ): Promise<ClaimResult> {
    const provider = this.providers.get(chainId)
    const chain = CHAINS[chainId]

    if (!provider || !chain) {
      return { success: false, error: 'Chain not supported', chainName: 'Unknown', tokenSymbol: 'Unknown' }
    }

    try {
      const fromWallet = new ethers.Wallet(fromPrivateKey, provider)

      // Check gas
      const balance = await provider.getBalance(fromWallet.address)
      const minGas = ethers.parseEther('0.001')
      if (balance < minGas) {
        return {
          success: false,
          error: `Your wallet needs gas. Have ${ethers.formatEther(balance)} ${chain.nativeCurrency}`,
          chainName: chain.name,
          tokenSymbol: 'Unknown'
        }
      }

      // Send claim tx from your wallet (with gas)
      const tx = await fromWallet.sendTransaction({
        to: claimContract,
        data: claimData,
        gasLimit: 250000n,
      })

      return {
        success: true,
        txHash: tx.hash,
        chainName: chain.name,
        tokenSymbol: 'Unknown'
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Claim failed'
      return {
        success: false,
        error: errorMessage,
        chainName: chain.name,
        tokenSymbol: 'Unknown'
      }
    }
  }

  // Claim airdrop with platform fee (20% to fee wallet)
  // Uses FeeCollector contract for trustless atomic splitting
  async claimWithFee(
    claimContract: string,
    chainId: number,
    claimData: string,
    tokenAddress: string,
    userSafeWallet: string,
    fromPrivateKey: string
  ): Promise<ClaimResult> {
    const provider = this.providers.get(chainId)
    const chain = CHAINS[chainId]

    if (!provider || !chain) {
      return { success: false, error: 'Chain not supported', chainName: 'Unknown', tokenSymbol: 'Unknown' }
    }

    const feeCollectorAddress = FEE_COLLECTOR_CONTRACTS[chainId]
    if (!feeCollectorAddress) {
      return {
        success: false,
        error: `FeeCollector not deployed on ${chain.name}. Deploy FeeCollector.sol first.`,
        chainName: chain.name,
        tokenSymbol: 'Unknown'
      }
    }

    try {
      const fromWallet = new ethers.Wallet(fromPrivateKey, provider)

      // Encode claimAndSplit call
      const feeCollectorIface = new ethers.Interface([
        'function claimAndSplit(address token, bytes calldata claimData, address claimContract, address userWallet)'
      ])

      const splitData = feeCollectorIface.encodeFunctionData('claimAndSplit', [
        tokenAddress,
        claimData,
        claimContract,
        userSafeWallet
      ])

      const tx = await fromWallet.sendTransaction({
        to: feeCollectorAddress,
        data: splitData,
        gasLimit: 400000n,
      })

      return {
        success: true,
        txHash: tx.hash,
        chainName: chain.name,
        tokenSymbol: 'Unknown'
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Claim failed'
      return {
        success: false,
        error: errorMessage,
        chainName: chain.name,
        tokenSymbol: 'Unknown'
      }
    }
  }

  // Batch claim multiple airdrops
  async batchClaim(
    claims: Array<{
      contract: string
      chainId: number
      data: string
    }>,
    hackedWalletPrivateKey: string
  ): Promise<ClaimResult[]> {
    const results: ClaimResult[] = []

    for (const claim of claims) {
      const result = await this.claimAirdrop(
        claim.contract,
        claim.chainId,
        claim.data,
        hackedWalletPrivateKey
      )
      results.push(result)

      // Small delay between claims
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    return results
  }

  // Check if an address has unclaimed airdrops
  async checkEligibility(
    claimContract: string,
    chainId: number,
    address: string
  ): Promise<{ eligible: boolean; amount?: string; proof?: string[] }> {
    const provider = this.providers.get(chainId)
    if (!provider) return { eligible: false }

    try {
      // Try to call claimable() or isEligible() view function
      const contract = new ethers.Contract(claimContract, [
        'function claimable(address) view returns (uint256)',
        'function isEligible(address) view returns (bool)',
        'function claimed(address) view returns (bool)',
      ], provider)

      const claimed = await contract.claimed(address).catch(() => false)
      if (claimed) return { eligible: false }

      const amount = await contract.claimable(address).catch(() => BigInt(0))
      if (amount > BigInt(0)) {
        return { eligible: true, amount: ethers.formatEther(amount) }
      }

      return { eligible: false }
    } catch {
      return { eligible: false }
    }
  }
}

export const claimer = new AirdropClaimer()
