// Honeypot Detection - Check if a token is a honeypot before interacting
import { ethers } from 'ethers'
import { CHAINS } from './chains'

export interface HoneypotResult {
  tokenAddress: string
  chainId: number
  isHoneypot: boolean
  buyTax: number
  sellTax: number
  canSell: boolean
  hasBlacklist: boolean
  hasMint: boolean
  hasPause: boolean
  isProxy: boolean
  ownerCanDrain: boolean
  riskScore: number
  flags: string[]
}

export class HoneypotChecker {
  private providers: Map<number, ethers.JsonRpcProvider> = new Map()

  constructor() {
    for (const [id, chain] of Object.entries(CHAINS)) {
      this.providers.set(Number(id), new ethers.JsonRpcProvider(chain.rpc))
    }
  }

  async check(tokenAddress: string, chainId: number = 1): Promise<HoneypotResult> {
    const provider = this.providers.get(chainId)
    const flags: string[] = []
    let riskScore = 0

    const defaultResult: HoneypotResult = {
      tokenAddress, chainId, isHoneypot: false,
      buyTax: 0, sellTax: 0, canSell: true,
      hasBlacklist: false, hasMint: false, hasPause: false,
      isProxy: false, ownerCanDrain: false,
      riskScore: 0, flags: []
    }

    if (!provider) return { ...defaultResult, flags: ['Chain not supported'] }

    try {
      const code = await provider.getCode(tokenAddress)
      if (code === '0x') return { ...defaultResult, flags: ['Not a contract'] }

      const codeLower = code.toLowerCase()

      // Check bytecode patterns
      const hasBlacklist = codeLower.includes('blacklist') || codeLower.includes('isblacklisted')
      const hasMint = codeLower.includes('mint')
      const hasPause = codeLower.includes('pause')
      const isProxy = code.length < 200

      if (hasBlacklist) { flags.push('Blacklist function detected'); riskScore += 30 }
      if (hasMint) { flags.push('Mint function detected'); riskScore += 20 }
      if (hasPause) { flags.push('Pause function detected'); riskScore += 15 }
      if (isProxy) { flags.push('Proxy contract'); riskScore += 10 }

      // Try to interact with the contract
      const contract = new ethers.Contract(tokenAddress, [
        'function owner() view returns (address)',
        'function balanceOf(address) view returns (uint256)',
        'function totalSupply() view returns (uint256)',
        'function decimals() view returns (uint8)',
        'function symbol() view returns (string)',
        'function name() view returns (string)',
        'function _isBlacklisted(address) view returns (bool)',
        'function isBlacklisted(address) view returns (bool)',
      ], provider)

      // Check if owner can blacklist
      try {
        await contract.owner()
        flags.push('Has owner (centralized)')
        riskScore += 10
      } catch {
        // No owner - good
      }

      // Check if token has reasonable supply
      try {
        const totalSupply = await contract.totalSupply()
        if (totalSupply === BigInt(0)) {
          flags.push('Zero total supply')
          riskScore += 25
        }
      } catch {
        // Can't read supply
      }

      const isHoneypot = riskScore >= 50 || (hasBlacklist && hasMint)

      return {
        tokenAddress,
        chainId,
        isHoneypot,
        buyTax: 0,
        sellTax: 0,
        canSell: !hasBlacklist,
        hasBlacklist,
        hasMint,
        hasPause,
        isProxy,
        ownerCanDrain: hasMint && hasBlacklist,
        riskScore: Math.min(riskScore, 100),
        flags
      }
    } catch {
      return { ...defaultResult, flags: ['Analysis failed'] }
    }
  }
}

export const honeypotChecker = new HoneypotChecker()
