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

export interface ClaimResult {
  success: boolean
  txHash?: string
  error?: string
  chainName: string
  tokenSymbol: string
}

// Common airdrop claim function signatures
const CLAIM_SIGNATURES = {
  // Standard Merkle drop
  claim: 'claim(address,uint256,bytes32[])',
  // Merkle with deadline
  claimWithDeadline: 'claim(address,uint256,bytes32[],uint256)',
  // Simple claim (no proof)
  claimSimple: 'claim()',
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
    const iface = new ethers.Interface([
      `function ${CLAIM_SIGNATURES.claim as string}`,
      `function ${CLAIM_SIGNATURES.claimWithDeadline as string}`,
      `function ${CLAIM_SIGNATURES.claimSimple as string}`,
      `function ${CLAIM_SIGNATURES.claimWithSig as string}`,
    ])

    switch (method) {
      case 'claim': {
        const { recipient, amount, proof } = params as { recipient: string; amount: string; proof: string[] }
        return iface.encodeFunctionData('claim', [recipient, amount, proof])
      }
      case 'claimWithDeadline': {
        const { recipient, amount, proof, deadline } = params as { recipient: string; amount: string; proof: string[]; deadline: number }
        return iface.encodeFunctionData('claimWithDeadline', [recipient, amount, proof, deadline])
      }
      case 'claimSimple':
        return iface.encodeFunctionData('claim', [])
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
          error: `Insufficient gas. Need at least 0.001 ${chain.nativeCurrency}, have ${ethers.formatEther(balance)}`,
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
