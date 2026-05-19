// Address Reputation System
import { ethers } from 'ethers'
import { CHAINS } from './chains'

export interface ReputationResult {
  address: string
  score: number // 0-100, higher = more trustworthy
  level: 'unknown' | 'suspicious' | 'neutral' | 'trusted' | 'verified'
  txCount: number
  firstSeen: string | null
  ageInDays: number
  scamReports: number
  isContract: boolean
  tags: string[]
  details: string[]
}

export class ReputationChecker {
  private providers: Map<number, ethers.JsonRpcProvider> = new Map()

  constructor() {
    for (const [id, chain] of Object.entries(CHAINS)) {
      this.providers.set(Number(id), new ethers.JsonRpcProvider(chain.rpc))
    }
  }

  async check(address: string, chainId: number = 1): Promise<ReputationResult> {
    const provider = this.providers.get(chainId)
    const tags: string[] = []
    const details: string[] = []
    let score = 50 // Start neutral

    if (!provider) {
      return {
        address, score: 0, level: 'unknown',
        txCount: 0, firstSeen: null, ageInDays: 0,
        scamReports: 0, isContract: false, tags, details
      }
    }

    try {
      // Check if contract
      const code = await provider.getCode(address)
      const isContract = code !== '0x'

      if (isContract) {
        tags.push('Contract')
        score += 10
        details.push('Address is a smart contract')
      }

      // Get transaction count
      const txCount = await provider.getTransactionCount(address)
      if (txCount > 100) {
        score += 15
        tags.push('Active')
        details.push(`${txCount} transactions`)
      } else if (txCount > 10) {
        score += 5
        details.push(`${txCount} transactions`)
      } else if (txCount === 0) {
        score -= 10
        tags.push('New')
        details.push('No transaction history')
      }

      // Check balance
      const balance = await provider.getBalance(address)
      if (balance > ethers.parseEther('1')) {
        score += 10
        tags.push('Funded')
      }

      // Estimate age from first transaction (simplified)
      let ageInDays = 0
      let firstSeen: string | null = null
      try {
        // Try to get a block from the past to estimate age
        const currentBlock = await provider.getBlockNumber()
        const oldBlock = await provider.getBlock(Math.max(currentBlock - 100000, 1))
        if (oldBlock) {
          firstSeen = new Date(oldBlock.timestamp * 1000).toISOString()
          ageInDays = Math.floor((Date.now() - oldBlock.timestamp * 1000) / (1000 * 60 * 60 * 24))
          if (ageInDays > 365) {
            score += 15
            tags.push('Established')
          } else if (ageInDays > 30) {
            score += 5
          }
        }
      } catch {
        // Skip age estimation
      }

      // Check for known patterns
      const codeLower = code.toLowerCase()
      if (codeLower.includes('multisig') || codeLower.includes('gnosis')) {
        tags.push('Multisig')
        score += 20
        details.push('Multisig wallet detected')
      }

      return {
        address,
        score: Math.max(0, Math.min(100, score)),
        level: this.getLevel(score),
        txCount,
        firstSeen,
        ageInDays,
        scamReports: 0,
        isContract,
        tags,
        details
      }
    } catch {
      return {
        address, score: 0, level: 'unknown',
        txCount: 0, firstSeen: null, ageInDays: 0,
        scamReports: 0, isContract: false, tags, details: ['Analysis failed']
      }
    }
  }

  private getLevel(score: number): ReputationResult['level'] {
    if (score >= 80) return 'verified'
    if (score >= 60) return 'trusted'
    if (score >= 40) return 'neutral'
    if (score >= 20) return 'suspicious'
    return 'unknown'
  }
}

export const reputationChecker = new ReputationChecker()
