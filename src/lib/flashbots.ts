import { ethers } from 'ethers'

// Flashbots relay endpoints
const FLASHBOTS_RELAY = 'https://relay.flashbots.net'
const FLASHBOTS_RELAY_SEPOLIA = 'https://relay-sepolia.flashbots.net'

export interface FlashbotsConfig {
  rpcUrl: string
  chainId: number
  authSigner?: ethers.Wallet // Optional: separate signer for Flashbots auth
}

export interface BundleTransaction {
  to: string
  data: string
  value?: bigint
  gasLimit?: bigint
}

export interface BundleResult {
  success: boolean
  bundleHash?: string
  blockNumber?: number
  error?: string
  receipts?: ethers.TransactionReceipt[]
}

export class FlashbotsClient {
  private provider: ethers.JsonRpcProvider
  private authSigner: ethers.Wallet | ethers.HDNodeWallet
  private chainId: number

  constructor(config: FlashbotsConfig) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl)
    this.chainId = config.chainId

    // Use provided auth signer or generate temporary one
    this.authSigner = config.authSigner || ethers.Wallet.createRandom()
  }

  // Sign Flashbots auth header
  private async signAuth(message: string): Promise<string> {
    return this.authSigner.signMessage(message)
  }

  // Send bundle to Flashbots relay
  async sendBundle(
    transactions: BundleTransaction[],
    targetBlockNumber: number,
    signer: ethers.Wallet
  ): Promise<BundleResult> {
    try {
      // Sign all transactions
      const signedTxs: string[] = []

      for (const tx of transactions) {
        const nonce = await this.provider.getTransactionCount(signer.address)
        const feeData = await this.provider.getFeeData()

        const signedTx = await signer.signTransaction({
          to: tx.to,
          data: tx.data,
          value: tx.value || 0n,
          gasLimit: tx.gasLimit || 100000n,
          nonce,
          maxFeePerGas: feeData.maxFeePerGas || 0n,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || 0n,
          type: 2,
          chainId: this.chainId
        })

        signedTxs.push(signedTx)
      }

      // Create bundle request
      const bundle = {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_sendBundle',
        params: [{
          txs: signedTxs,
          blockNumber: '0x' + targetBlockNumber.toString(16)
        }]
      }

      // Sign the request
      const message = JSON.stringify(bundle)
      const signature = await this.signAuth(message)

      // Send to Flashbots relay
      const relayUrl = this.chainId === 11155111 ? FLASHBOTS_RELAY_SEPOLIA : FLASHBOTS_RELAY

      const response = await fetch(relayUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Flashbots-Signature': signature
        },
        body: message
      })

      const data = await response.json()

      if (data.error) {
        return { success: false, error: data.error.message }
      }

      return {
        success: true,
        bundleHash: data.result?.bundleHash,
        blockNumber: targetBlockNumber
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      return { success: false, error: errorMessage }
    }
  }

  // Get current block number
  async getCurrentBlock(): Promise<number> {
    return this.provider.getBlockNumber()
  }

  // Simulate bundle before sending
  async simulateBundle(
    transactions: BundleTransaction[],
    blockNumber: number,
    signer: ethers.Wallet
  ): Promise<{ success: boolean; error?: string; gasUsed?: bigint }> {
    try {
      const signedTxs: string[] = []

      for (const tx of transactions) {
        const nonce = await this.provider.getTransactionCount(signer.address)
        const feeData = await this.provider.getFeeData()

        const signedTx = await signer.signTransaction({
          to: tx.to,
          data: tx.data,
          value: tx.value || 0n,
          gasLimit: tx.gasLimit || 100000n,
          nonce,
          maxFeePerGas: feeData.maxFeePerGas || 0n,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || 0n,
          type: 2,
          chainId: this.chainId
        })

        signedTxs.push(signedTx)
      }

      const bundle = {
        jsonrpc: '2.0',
        id: 1,
        method: 'flashbots_simulateBundle',
        params: [{
          txs: signedTxs,
          blockNumber: '0x' + blockNumber.toString(16)
        }]
      }

      const message = JSON.stringify(bundle)
      const signature = await this.signAuth(message)

      const relayUrl = this.chainId === 11155111 ? FLASHBOTS_RELAY_SEPOLIA : FLASHBOTS_RELAY

      const response = await fetch(relayUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Flashbots-Signature': signature
        },
        body: message
      })

      const data = await response.json()

      if (data.error) {
        return { success: false, error: data.error.message }
      }

      return {
        success: true,
        gasUsed: data.result?.totalGasUsed ? BigInt(data.result.totalGasUsed) : undefined
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      return { success: false, error: errorMessage }
    }
  }
}

export function createFlashbotsClient(config: FlashbotsConfig): FlashbotsClient {
  return new FlashbotsClient(config)
}
