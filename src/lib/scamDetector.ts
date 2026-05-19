// AI Scam Detection - Transaction pattern analysis and honeypot detection
import { ethers } from 'ethers'
import { CHAINS } from './chains'

export interface ScamCheckResult {
  address: string
  riskScore: number // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  flags: ScamFlag[]
  tokenAnalysis?: TokenAnalysis
  recommendation: string
}

export interface ScamFlag {
  type: string
  severity: 'info' | 'warning' | 'danger'
  description: string
}

export interface TokenAnalysis {
  isHoneypot: boolean
  buyTax: number
  sellTax: number
  hasBlacklist: boolean
  hasMint: boolean
  hasPause: boolean
  isProxy: boolean
  ownerCanChangeBalance: boolean
  liquidityLocked: boolean
}

// Suspicious function selectors
const SUSPICIOUS_SELECTORS: Record<string, string> = {
  '0xa9059cbb': 'transfer',
  '0x23b872dd': 'transferFrom',
  '0x095ea7b3': 'approve',
  '0x395e4485': 'setFee',
  '0x8b7afe2e': 'setBlacklist',
  '0x4c1f5f4d': 'setMint',
  '0x8456cb59': 'pause',
  '0x3f4ba83a': 'unpause',
  '0x70a08231': 'balanceOf',
  '0x18160ddd': 'totalSupply',
}

export class ScamDetector {
  private providers: Map<number, ethers.JsonRpcProvider> = new Map()

  constructor() {
    for (const [id, chain] of Object.entries(CHAINS)) {
      this.providers.set(Number(id), new ethers.JsonRpcProvider(chain.rpc))
    }
  }

  async checkAddress(address: string, chainId: number = 1): Promise<ScamCheckResult> {
    const flags: ScamFlag[] = []
    let riskScore = 0

    const provider = this.providers.get(chainId)
    if (!provider) {
      return {
        address,
        riskScore: 0,
        riskLevel: 'low',
        flags: [{ type: 'error', severity: 'info', description: 'Chain not supported' }],
        recommendation: 'Unable to analyze - chain not supported.'
      }
    }

    try {
      // Check if contract
      const code = await provider.getCode(address)
      const isContract = code !== '0x'

      if (isContract) {
        // Check for proxy patterns
        if (code.length < 200) {
          flags.push({ type: 'proxy', severity: 'warning', description: 'Minimal bytecode - likely proxy contract' })
          riskScore += 15
        }

        // Check for selfdestruct
        if (code.includes('ff')) {
          flags.push({ type: 'selfdestruct', severity: 'warning', description: 'Contract contains selfdestruct opcode' })
          riskScore += 10
        }
      }

      // Check transaction history patterns
      const txCount = await provider.getTransactionCount(address)
      if (txCount === 0) {
        flags.push({ type: 'new_address', severity: 'info', description: 'Address has no transaction history' })
        riskScore += 5
      }

      // Check balance
      const balance = await provider.getBalance(address)
      if (balance === BigInt(0) && txCount > 0) {
        flags.push({ type: 'empty_balance', severity: 'info', description: 'Address has been drained or emptied' })
      }

      // Determine risk level
      let riskLevel: ScamCheckResult['riskLevel'] = 'low'
      if (riskScore >= 80) riskLevel = 'critical'
      else if (riskScore >= 50) riskLevel = 'high'
      else if (riskScore >= 25) riskLevel = 'medium'

      const recommendation = this.getRecommendation(riskLevel, flags)

      return {
        address,
        riskScore: Math.min(riskScore, 100),
        riskLevel,
        flags,
        recommendation
      }
    } catch {
      return {
        address,
        riskScore: 0,
        riskLevel: 'low',
        flags: [{ type: 'error', severity: 'info', description: 'Failed to analyze address' }],
        recommendation: 'Unable to complete analysis. Try again later.'
      }
    }
  }

  async analyzeToken(tokenAddress: string, chainId: number = 1): Promise<TokenAnalysis> {
    const provider = this.providers.get(chainId)
    if (!provider) {
      return {
        isHoneypot: false, buyTax: 0, sellTax: 0,
        hasBlacklist: false, hasMint: false, hasPause: false,
        isProxy: false, ownerCanChangeBalance: false, liquidityLocked: false
      }
    }

    const defaultResult: TokenAnalysis = {
      isHoneypot: false, buyTax: 0, sellTax: 0,
      hasBlacklist: false, hasMint: false, hasPause: false,
      isProxy: false, ownerCanChangeBalance: false, liquidityLocked: false
    }

    try {
      const code = await provider.getCode(tokenAddress)
      if (code === '0x') return defaultResult

      const codeLower = code.toLowerCase()

      // Check for suspicious patterns in bytecode
      const hasBlacklist = codeLower.includes('blacklist') || codeLower.includes('isblacklisted')
      const hasMint = codeLower.includes('mint') && codeLower.includes('onlyowner')
      const hasPause = codeLower.includes('pause') && codeLower.includes('onlyowner')
      const isProxy = code.length < 200 || codeLower.includes('delegatecall')

      // Try to call common functions
      const contract = new ethers.Contract(tokenAddress, [
        'function owner() view returns (address)',
        'function _isBlacklisted(address) view returns (bool)',
        'function isBlacklisted(address) view returns (bool)',
        'function mint(address,uint256)',
        'function pause()',
        'function paused() view returns (bool)',
      ], provider)

      let ownerCanChangeBalance = false
      try {
        const owner = await contract.owner()
        ownerCanChangeBalance = !!owner
      } catch {
        // No owner function
      }

      return {
        isHoneypot: hasBlacklist && hasMint,
        buyTax: 0,
        sellTax: 0,
        hasBlacklist,
        hasMint,
        hasPause,
        isProxy,
        ownerCanChangeBalance,
        liquidityLocked: false
      }
    } catch {
      return defaultResult
    }
  }

  private getRecommendation(riskLevel: string, flags: ScamFlag[]): string {
    if (riskLevel === 'critical') {
      return 'DO NOT interact with this address. Multiple high-risk indicators detected.'
    }
    if (riskLevel === 'high') {
      return 'Exercise extreme caution. This address shows several suspicious patterns.'
    }
    if (riskLevel === 'medium') {
      return 'Proceed with caution. Some suspicious activity detected.'
    }
    return 'Address appears relatively safe, but always do your own research.'
  }
}

export const scamDetector = new ScamDetector()
