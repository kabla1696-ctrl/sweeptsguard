import { ethers } from 'ethers'
import { CHAINS } from './chains'

// Gas Sponsor System
// Problem: If you send gas to compromised wallet, drainer steals it instantly
// Solution: Use Flashbots private mempool to fund gas + claim atomically
// The drainer can't see transactions in Flashbots relay

export interface GasSponsorConfig {
  sponsorPrivateKey: string // Safe wallet's key (has funds)
  compromisedAddress: string
  chainId: number
}

export interface SponsorBundle {
  gasFundingTx: string // Signed tx: sponsor -> compromised wallet (gas)
  claimTx: string // Signed tx: compromised wallet -> claim contract
  totalGasCost: string // ETH amount needed
  success: boolean
  error?: string
}

export class GasSponsor {
  private provider: ethers.JsonRpcProvider
  private sponsorWallet: ethers.Wallet
  private chainId: number

  constructor(config: GasSponsorConfig) {
    const chain = CHAINS[config.chainId]
    if (!chain) throw new Error('Unsupported chain')

    this.provider = new ethers.JsonRpcProvider(chain.rpc)
    this.sponsorWallet = new ethers.Wallet(config.sponsorPrivateKey, this.provider)
    this.chainId = config.chainId
  }

  // Estimate gas needed for claim transaction
  async estimateClaimGas(
    claimContract: string,
    claimData: string
  ): Promise<bigint> {
    try {
      const gas = await this.provider.estimateGas({
        to: claimContract,
        data: claimData
      })
      // Add 20% buffer
      return gas * 120n / 100n
    } catch {
      return 200000n // Default estimate
    }
  }

  // Get current gas price
  async getGasPrice(): Promise<bigint> {
    const feeData = await this.provider.getFeeData()
    return feeData.gasPrice || feeData.maxFeePerGas || BigInt(0)
  }

  // Calculate total gas cost
  async calculateGasCost(
    claimContract: string,
    claimData: string
  ): Promise<{ gasLimit: bigint; gasPrice: bigint; totalCost: bigint }> {
    const gasLimit = await this.estimateClaimGas(claimContract, claimData)
    const gasPrice = await this.getGasPrice()
    const totalCost = gasLimit * gasPrice

    return { gasLimit, gasPrice, totalCost }
  }

  // Create atomic bundle: fund gas + claim in one block
  // This is the KEY solution - drainer can't intercept because:
  // 1. Flashbots relay is private (not public mempool)
  // 2. Both txs execute in same block atomically
  // 3. Drainer's bot never sees the gas funding
  async createAtomicBundle(
    claimContract: string,
    claimData: string,
    compromisedWalletPrivateKey: string
  ): Promise<SponsorBundle> {
    try {
      const { gasLimit, gasPrice, totalCost } = await this.calculateGasCost(claimContract, claimData)

      // Add extra ETH for safety margin (gas prices can spike)
      const safetyMargin = totalCost * 150n / 100n // 50% extra

      // Check sponsor has enough balance
      const sponsorBalance = await this.provider.getBalance(this.sponsorWallet.address)
      if (sponsorBalance < safetyMargin) {
        return {
          gasFundingTx: '',
          claimTx: '',
          totalGasCost: ethers.formatEther(safetyMargin),
          success: false,
          error: `Sponsor needs ${ethers.formatEther(safetyMargin)} ETH but has ${ethers.formatEther(sponsorBalance)}`
        }
      }

      // Get compromised wallet's current nonce
      const compromisedAddress = ethers.computeAddress(compromisedWalletPrivateKey)
      const nonce = await this.provider.getTransactionCount(compromisedAddress)

      // TX 1: Sponsor sends gas to compromised wallet (PRIVATE - via Flashbots)
      const fundingTx = await this.sponsorWallet.signTransaction({
        to: compromisedAddress,
        value: safetyMargin,
        gasLimit: 21000n,
        gasPrice,
        nonce: await this.provider.getTransactionCount(this.sponsorWallet.address),
        chainId: this.chainId
      })

      // TX 2: Compromised wallet claims airdrop (sends to safe wallet)
      const compromisedWallet = new ethers.Wallet(compromisedWalletPrivateKey, this.provider)
      const claimTx = await compromisedWallet.signTransaction({
        to: claimContract,
        data: claimData,
        value: 0n,
        gasLimit,
        gasPrice,
        nonce,
        chainId: this.chainId
      })

      return {
        gasFundingTx: fundingTx,
        claimTx: claimTx,
        totalGasCost: ethers.formatEther(safetyMargin),
        success: true
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Bundle creation failed'
      return {
        gasFundingTx: '',
        claimTx: '',
        totalGasCost: '0',
        success: false,
        error: errorMessage
      }
    }
  }

  // Submit bundle to Flashbots relay
  async submitToFlashbots(bundle: SponsorBundle): Promise<{ success: boolean; bundleHash?: string; error?: string }> {
    if (!bundle.success || !bundle.gasFundingTx || !bundle.claimTx) {
      return { success: false, error: 'Invalid bundle' }
    }

    try {
      const blockNumber = await this.provider.getBlockNumber()
      const targetBlock = blockNumber + 1

      // Flashbots relay endpoint
      const relayUrl = this.chainId === 11155111
        ? 'https://relay-sepolia.flashbots.net'
        : 'https://relay.flashbots.net'

      // Create auth signer
      const authSigner = ethers.Wallet.createRandom()

      const bundleRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_sendBundle',
        params: [{
          txs: [bundle.gasFundingTx, bundle.claimTx],
          blockNumber: '0x' + targetBlock.toString(16)
        }]
      }

      const message = JSON.stringify(bundleRequest)
      const signature = await authSigner.signMessage(message)
      // Flashbots requires format: <address>:<signature>
      const flashbotsSig = `${authSigner.address}:${signature}`

      const response = await fetch(relayUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Flashbots-Signature': flashbotsSig
        },
        body: message
      })

      const data = await response.json()

      if (data.error) {
        return { success: false, error: data.error.message }
      }

      return { success: true, bundleHash: data.result?.bundleHash }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Submission failed'
      return { success: false, error: errorMessage }
    }
  }

  // Full flow: create + submit bundle
  async sponsorAndClaim(
    claimContract: string,
    claimData: string,
    compromisedWalletPrivateKey: string
  ): Promise<{ success: boolean; bundleHash?: string; error?: string; gasCost?: string }> {
    const bundle = await this.createAtomicBundle(claimContract, claimData, compromisedWalletPrivateKey)

    if (!bundle.success) {
      return { success: false, error: bundle.error, gasCost: bundle.totalGasCost }
    }

    const result = await this.submitToFlashbots(bundle)

    return {
      ...result,
      gasCost: bundle.totalGasCost
    }
  }
}

// Alternative: Relayer approach (no Flashbots needed)
// User pays relayer from safe wallet, relayer executes claim
export class Relayer {
  private provider: ethers.JsonRpcProvider
  private relayerWallet: ethers.Wallet
  private chainId: number

  constructor(relayerPrivateKey: string, chainId: number) {
    const chain = CHAINS[chainId]
    if (!chain) throw new Error('Unsupported chain')

    this.provider = new ethers.JsonRpcProvider(chain.rpc)
    this.relayerWallet = new ethers.Wallet(relayerPrivateKey, this.provider)
    this.chainId = chainId
  }

  // Relayer executes claim on behalf of compromised wallet
  // User pays relayer from safe wallet
  async relayClaim(
    claimContract: string,
    claimData: string,
    paymentAmount: string // ETH to pay relayer
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      const feeData = await this.provider.getFeeData()
      const gasPrice = feeData.gasPrice || BigInt(0)

      const tx = await this.relayerWallet.sendTransaction({
        to: claimContract,
        data: claimData,
        gasLimit: 300000n,
        gasPrice
      })

      return { success: true, txHash: tx.hash }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Relay failed'
      return { success: false, error: errorMessage }
    }
  }
}
