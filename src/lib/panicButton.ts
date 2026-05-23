/**
 * Emergency Panic Button System
 * One-click emergency response: revoke all approvals + sweep funds to cold wallet
 */

import { ethers } from 'ethers'
import { CHAINS } from './chains'
import { sendNotification, NotificationTemplates } from './notifications'
import { createAlertSystem } from './alerts'

// ERC-20 approve ABI
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function transfer(address to, uint256 amount) returns (bool)',
]

// ERC-721/1155 setApprovalForAll
const ERC721_ABI = [
  'function setApprovalForAll(address operator, bool approved)',
  'function isApprovedForAll(address owner, address operator) view returns (bool)',
]

export type EmergencyStepStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped'

export interface EmergencyStep {
  id: string
  label: string
  description: string
  status: EmergencyStepStatus
  txHash?: string
  error?: string
  chainName?: string
  timestamp?: number
}

export interface EmergencyContact {
  name: string
  address: string
  notifyMethod: 'onchain' | 'telegram' | 'discord' | 'email'
  notifyTarget?: string // telegram chat id, discord webhook, email
}

export interface PanicConfig {
  compromisedAddress: string
  coldWalletAddress: string
  privateKey: string
  chainIds: number[]
  priorityFeeMultiplier: number // 1-5x, higher = faster
  autoTriggerOnDrainer: boolean
  emergencyContacts: EmergencyContact[]
  revokeApprovals: boolean
  sweepFunds: boolean
  notifyContacts: boolean
}

export interface PanicResult {
  success: boolean
  steps: EmergencyStep[]
  totalRevoked: number
  totalSwept: { asset: string; amount: string; chainName: string }[]
  errors: string[]
  duration: number // ms
}

export class PanicButtonEngine {
  private config: PanicConfig
  private providers: Map<number, ethers.JsonRpcProvider> = new Map()
  private wallets: Map<number, ethers.Wallet> = new Map()
  private steps: EmergencyStep[] = []
  private onStepUpdate?: (step: EmergencyStep) => void

  constructor(config: PanicConfig, onStepUpdate?: (step: EmergencyStep) => void) {
    this.config = config
    this.onStepUpdate = onStepUpdate

    for (const chainId of config.chainIds) {
      const chain = CHAINS[chainId]
      if (!chain) continue
      const provider = new ethers.JsonRpcProvider(chain.rpc)
      const wallet = new ethers.Wallet(config.privateKey, provider)
      this.providers.set(chainId, provider)
      this.wallets.set(chainId, wallet)
    }
  }

  private addStep(step: EmergencyStep) {
    this.steps.push(step)
    this.onStepUpdate?.(step)
  }

  private updateStep(id: string, updates: Partial<EmergencyStep>) {
    const idx = this.steps.findIndex(s => s.id === id)
    if (idx >= 0) {
      this.steps[idx] = { ...this.steps[idx], ...updates }
      this.onStepUpdate?.(this.steps[idx])
    }
  }

  private async getGasSettings(chainId: number): Promise<ethers.FeeData & { maxPriorityFeePerGas: bigint }> {
    const provider = this.providers.get(chainId)!
    const feeData = await provider.getFeeData()
    const basePriority = feeData.maxPriorityFeePerGas ?? BigInt('1500000000') // 1.5 gwei fallback
    return {
      ...feeData,
      maxPriorityFeePerGas: basePriority * BigInt(this.config.priorityFeeMultiplier),
    } as ethers.FeeData & { maxPriorityFeePerGas: bigint }
  }

  // Step 1: Revoke all ERC-20 approvals
  async revokeApprovals(chainId: number): Promise<{ revoked: number; errors: string[] }> {
    const provider = this.providers.get(chainId)!
    const wallet = this.wallets.get(chainId)!
    const chain = CHAINS[chainId]
    const address = this.config.compromisedAddress
    const errors: string[] = []
    let revoked = 0

    try {
      const currentBlock = await provider.getBlockNumber()
      const fromBlock = Math.max(0, currentBlock - 50000)

      // Get Approval events
      const approvalFilter = {
        fromBlock,
        toBlock: 'latest',
        topics: [
          ethers.id('Approval(address,address,uint256)'),
          ethers.zeroPadValue(address, 32),
        ],
      }

      const logs = await provider.getLogs(approvalFilter).catch(() => [])
      const iface = new ethers.Interface(['event Approval(address indexed owner, address indexed spender, uint256 value)'])

      // Deduplicate by token+spender
      const approvals = new Map<string, { token: string; spender: string }>()
      for (const log of logs) {
        try {
          const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data })
          if (parsed) {
            const key = `${log.address}-${parsed.args.spender}`
            approvals.set(key, { token: log.address, spender: parsed.args.spender })
          }
        } catch {}
      }

      // Revoke each approval
      for (const [, { token, spender }] of approvals) {
        try {
          const contract = new ethers.Contract(token, ERC20_ABI, wallet)
          const gasSettings = await this.getGasSettings(chainId)
          const tx = await contract.approve(spender, 0, {
            maxFeePerGas: gasSettings.maxFeePerGas,
            maxPriorityFeePerGas: gasSettings.maxPriorityFeePerGas,
            gasLimit: 60000,
          })
          await tx.wait()
          revoked++
        } catch (err) {
          errors.push(`Failed to revoke ${token} -> ${spender}: ${err instanceof Error ? err.message : 'unknown'}`)
        }
      }

      // Also revoke ERC-721 setApprovalForAll
      const nftApprovalFilter = {
        fromBlock,
        toBlock: 'latest',
        topics: [
          ethers.id('ApprovalForAll(address,address,bool)'),
          ethers.zeroPadValue(address, 32),
        ],
      }
      const nftLogs = await provider.getLogs(nftApprovalFilter).catch(() => [])
      const nftIface = new ethers.Interface(['event ApprovalForAll(address indexed owner, address indexed operator, bool approved)'])

      for (const log of nftLogs) {
        try {
          const parsed = nftIface.parseLog({ topics: log.topics as string[], data: log.data })
          if (parsed && parsed.args.approved) {
            const nftContract = new ethers.Contract(log.address, ERC721_ABI, wallet)
            const gasSettings = await this.getGasSettings(chainId)
            const tx = await nftContract.setApprovalForAll(parsed.args.operator, false, {
              maxFeePerGas: gasSettings.maxFeePerGas,
              maxPriorityFeePerGas: gasSettings.maxPriorityFeePerGas,
              gasLimit: 60000,
            })
            await tx.wait()
            revoked++
          }
        } catch {}
      }
    } catch (err) {
      errors.push(`Approval scan failed on ${chain.name}: ${err instanceof Error ? err.message : 'unknown'}`)
    }

    return { revoked, errors }
  }

  // Step 2: Sweep all funds to cold wallet
  async sweepFunds(chainId: number): Promise<{ swept: { asset: string; amount: string; chainName: string }[]; errors: string[] }> {
    const provider = this.providers.get(chainId)!
    const wallet = this.wallets.get(chainId)!
    const chain = CHAINS[chainId]
    const swept: { asset: string; amount: string; chainName: string }[] = []
    const errors: string[] = []

    // Sweep native currency
    try {
      const balance = await provider.getBalance(wallet.address)
      const gasSettings = await this.getGasSettings(chainId)
      const gasPrice = gasSettings.maxFeePerGas ?? BigInt('20000000000')
      const gasLimit = BigInt(21000)
      const gasCost = gasPrice * gasLimit

      if (balance > gasCost + BigInt('1000000000000000')) { // > 0.001 ETH + gas
        const amount = balance - gasCost
        const tx = await wallet.sendTransaction({
          to: this.config.coldWalletAddress,
          value: amount,
          maxFeePerGas: gasSettings.maxFeePerGas,
          maxPriorityFeePerGas: gasSettings.maxPriorityFeePerGas,
          gasLimit,
        })
        await tx.wait()
        swept.push({
          asset: chain.nativeCurrency,
          amount: ethers.formatEther(amount),
          chainName: chain.name,
        })
      }
    } catch (err) {
      errors.push(`Native sweep failed on ${chain.name}: ${err instanceof Error ? err.message : 'unknown'}`)
    }

    // Sweep ERC-20 tokens
    try {
      const currentBlock = await provider.getBlockNumber()
      const fromBlock = Math.max(0, currentBlock - 10000)
      const filter = {
        fromBlock,
        toBlock: 'latest',
        topics: [
          ethers.id('Transfer(address,address,uint256)'),
          null,
          ethers.zeroPadValue(wallet.address, 32),
        ],
      }
      const logs = await provider.getLogs(filter).catch(() => [])
      const tokenAddresses = [...new Set(logs.map(l => l.address))]

      for (const tokenAddr of tokenAddresses.slice(0, 30)) {
        try {
          const contract = new ethers.Contract(tokenAddr, ERC20_ABI, wallet)
          const [balance, decimals, symbol] = await Promise.all([
            contract.balanceOf(wallet.address),
            contract.decimals().catch(() => 18),
            contract.symbol().catch(() => 'UNKNOWN'),
          ])

          if (balance > BigInt(0)) {
            const gasSettings = await this.getGasSettings(chainId)
            const tx = await contract.transfer(this.config.coldWalletAddress, balance, {
              maxFeePerGas: gasSettings.maxFeePerGas,
              maxPriorityFeePerGas: gasSettings.maxPriorityFeePerGas,
              gasLimit: 100000,
            })
            await tx.wait()
            swept.push({
              asset: symbol,
              amount: ethers.formatUnits(balance, decimals),
              chainName: chain.name,
            })
          }
        } catch {
          // Skip failed tokens
        }
      }
    } catch (err) {
      errors.push(`Token sweep failed on ${chain.name}: ${err instanceof Error ? err.message : 'unknown'}`)
    }

    return { swept, errors }
  }

  // Step 3: Notify emergency contacts
  async notifyEmergencyContacts(result: PanicResult): Promise<void> {
    if (!this.config.emergencyContacts.length) return

    const message = `🚨 EMERGENCY PANIC BUTTON ACTIVATED\n\nWallet: ${this.config.compromisedAddress}\nCold wallet: ${this.config.coldWalletAddress}\n\nRevoked: ${result.totalRevoked} approvals\nSwept: ${result.totalSwept.length} assets\nDuration: ${(result.duration / 1000).toFixed(1)}s\n\n${result.errors.length > 0 ? `⚠️ Errors: ${result.errors.length}` : '✅ All steps completed'}`

    for (const contact of this.config.emergencyContacts) {
      try {
        if (contact.notifyMethod === 'onchain' && contact.address) {
          // Send a small ETH memo tx
          const wallet = this.wallets.get(this.config.chainIds[0])
          if (wallet) {
            const gasSettings = await this.getGasSettings(this.config.chainIds[0])
            await wallet.sendTransaction({
              to: contact.address,
              value: ethers.parseEther('0'),
              data: ethers.hexlify(ethers.toUtf8Bytes(message.slice(0, 256))),
              maxFeePerGas: gasSettings.maxFeePerGas,
              maxPriorityFeePerGas: gasSettings.maxPriorityFeePerGas,
              gasLimit: 50000,
            })
          }
        }
        // Telegram/Discord/email notifications would use their respective APIs
        // For now we send browser notifications
        await sendNotification({
          type: 'drainer_activity',
          title: '🚨 Panic Button Activated',
          body: `Emergency response sent to ${contact.name}`,
        })
      } catch {
        // Don't fail panic for notification errors
      }
    }
  }

  // Execute full emergency protocol
  async executePanic(): Promise<PanicResult> {
    const startTime = Date.now()
    const allErrors: string[] = []
    let totalRevoked = 0
    const allSwept: { asset: string; amount: string; chainName: string }[] = []

    // Step 1: Revoke approvals
    if (this.config.revokeApprovals) {
      for (const chainId of this.config.chainIds) {
        const chain = CHAINS[chainId]
        const stepId = `revoke-${chainId}`
        this.addStep({
          id: stepId,
          label: `Revoke approvals on ${chain?.name || chainId}`,
          description: 'Revoking all token and NFT approvals',
          status: 'running',
          chainName: chain?.name,
        })

        try {
          const result = await this.revokeApprovals(chainId)
          totalRevoked += result.revoked
          allErrors.push(...result.errors)
          this.updateStep(stepId, {
            status: result.errors.length > 0 && result.revoked === 0 ? 'failed' : 'success',
            timestamp: Date.now(),
          })
        } catch (err) {
          allErrors.push(err instanceof Error ? err.message : 'Unknown error')
          this.updateStep(stepId, { status: 'failed', error: 'Revoke failed', timestamp: Date.now() })
        }
      }
    }

    // Step 2: Sweep funds
    if (this.config.sweepFunds) {
      for (const chainId of this.config.chainIds) {
        const chain = CHAINS[chainId]
        const stepId = `sweep-${chainId}`
        this.addStep({
          id: stepId,
          label: `Sweep funds on ${chain?.name || chainId}`,
          description: 'Transferring all assets to cold wallet',
          status: 'running',
          chainName: chain?.name,
        })

        try {
          const result = await this.sweepFunds(chainId)
          allSwept.push(...result.swept)
          allErrors.push(...result.errors)
          this.updateStep(stepId, {
            status: result.errors.length > 0 && result.swept.length === 0 ? 'failed' : 'success',
            timestamp: Date.now(),
          })
        } catch (err) {
          allErrors.push(err instanceof Error ? err.message : 'Unknown error')
          this.updateStep(stepId, { status: 'failed', error: 'Sweep failed', timestamp: Date.now() })
        }
      }
    }

    const result: PanicResult = {
      success: allErrors.length === 0,
      steps: this.steps,
      totalRevoked,
      totalSwept: allSwept,
      errors: allErrors,
      duration: Date.now() - startTime,
    }

    // Step 3: Notify contacts
    if (this.config.notifyContacts) {
      const stepId = 'notify-contacts'
      this.addStep({
        id: stepId,
        label: 'Notify emergency contacts',
        description: `Sending alerts to ${this.config.emergencyContacts.length} contacts`,
        status: 'running',
      })

      try {
        await this.notifyEmergencyContacts(result)
        this.updateStep(stepId, { status: 'success', timestamp: Date.now() })
      } catch {
        this.updateStep(stepId, { status: 'failed', timestamp: Date.now() })
      }
    }

    result.steps = this.steps
    return result
  }
}

// Auto-trigger check: scan for drainer activity and trigger panic if detected
export async function shouldAutoTrigger(
  address: string,
  chainIds: number[]
): Promise<{ shouldTrigger: boolean; reason: string; drainerAddress?: string }> {
  // Import dynamically to avoid circular deps
  const { WalletScanner } = await import('./scanner')
  const scanner = new WalletScanner()
  const result = await scanner.scanWallet(address, chainIds)

  if (result.delegation.isDrainer) {
    return {
      shouldTrigger: true,
      reason: `Known drainer delegation detected: ${result.delegation.drainerName || 'Unknown'}`,
      drainerAddress: result.delegation.delegatedTo || undefined,
    }
  }

  if (result.privateKeyCompromised?.isCompromised) {
    return {
      shouldTrigger: true,
      reason: `Private key compromise detected on ${result.privateKeyCompromised.affectedChains.length} chains`,
    }
  }

  if (result.drainerMethodCalls.length > 0) {
    return {
      shouldTrigger: true,
      reason: `Drainer method calls detected: ${result.drainerMethodCalls[0].method}`,
    }
  }

  return { shouldTrigger: false, reason: 'No drainer activity detected' }
}

// Estimate gas cost for panic operation
export async function estimatePanicGas(chainIds: number[]): Promise<{ chainId: number; chainName: string; estimatedGas: string }[]> {
  const estimates: { chainId: number; chainName: string; estimatedGas: string }[] = []

  for (const chainId of chainIds) {
    const chain = CHAINS[chainId]
    if (!chain) continue

    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc)
      const feeData = await provider.getFeeData()
      const gasPrice = feeData.gasPrice ?? BigInt('20000000000')
      // Estimate: revoke (60k gas) + sweep native (21k) + sweep tokens (~100k per token * 5 avg)
      const estimatedGasUnits = BigInt(60000 + 21000 + 500000)
      const totalCost = gasPrice * estimatedGasUnits
      estimates.push({
        chainId,
        chainName: chain.name,
        estimatedGas: ethers.formatEther(totalCost),
      })
    } catch {
      estimates.push({ chainId, chainName: chain.name, estimatedGas: 'unknown' })
    }
  }

  return estimates
}
