/**
 * Batch Operations for SweepGuard
 * Execute multi-chain operations in parallel: revoke, claim, sweep, scan NFTs
 */

import { ethers } from 'ethers'
import { CHAINS } from './chains'

// ── Types ──────────────────────────────────────────────────

export interface BatchRevokeResult {
  chainId: number
  chainName: string
  success: boolean
  txHash?: string
  error?: string
  explorerUrl: string
}

export interface AirdropInfo {
  contractAddress: string
  chainId: number
  tokenSymbol?: string
  amount?: string
}

export interface BatchClaimResult {
  airdropAddress: string
  chainId: number
  chainName: string
  success: boolean
  txHash?: string
  error?: string
  tokenSymbol?: string
  amount?: string
}

export interface TokenSweepTarget {
  tokenAddress: string
  chainId: number
  symbol: string
  decimals: number
}

export interface BatchSweepResult {
  tokenAddress: string
  symbol: string
  chainId: number
  chainName: string
  success: boolean
  txHash?: string
  amount?: string
  error?: string
}

export interface NFTAsset {
  contractAddress: string
  tokenId: string
  chainId: number
  chainName: string
  name?: string
  image?: string
  collection?: string
}

export interface BatchScanNFTResult {
  chainId: number
  chainName: string
  nfts: NFTAsset[]
  success: boolean
  error?: string
}

export interface BatchOperationProgress {
  total: number
  completed: number
  successful: number
  failed: number
  inProgress: number
  pending: number
  results: (BatchRevokeResult | BatchClaimResult | BatchSweepResult)[]
}

export type ProgressCallback = (progress: BatchOperationProgress) => void

// ── Common ABIs ────────────────────────────────────────────

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
]

const DELEGATION_ABI = [
  'function delegate(address delegatee)',
  'function delegation(address) view returns (address)',
  'function delegates(address) view returns (address)',
  'function revokeDelegation()',
]

const ERC721_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function tokenOfOwnerByIndex(address, uint256) view returns (uint256)',
  'function tokenURI(uint256) view returns (string)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
]

// ── Helper: get provider & wallet ──────────────────────────

function getProviderAndWallet(chainId: number, privateKey: string) {
  const chain = CHAINS[chainId]
  if (!chain) throw new Error(`Chain ${chainId} not supported`)
  const provider = new ethers.JsonRpcProvider(chain.rpc)
  const wallet = new ethers.Wallet(privateKey, provider)
  return { provider, wallet, chain }
}

// ── 1. Batch Revoke Delegation ─────────────────────────────

/**
 * Revoke EIP-7702 delegations on multiple chains in parallel
 */
export async function batchRevokeDelegation(
  chainIds: number[],
  privateKey: string,
  safeWallet: string,
  onProgress?: ProgressCallback
): Promise<BatchRevokeResult[]> {
  const results: BatchRevokeResult[] = []
  let completed = 0
  let successful = 0
  let failed = 0

  const progress: BatchOperationProgress = {
    total: chainIds.length,
    completed: 0,
    successful: 0,
    failed: 0,
    inProgress: 0,
    pending: chainIds.length,
    results: [],
  }

  const updateProgress = () => {
    progress.completed = completed
    progress.successful = successful
    progress.failed = failed
    progress.inProgress = chainIds.length - completed
    progress.pending = 0
    progress.results = [...results]
    onProgress?.(progress)
  }

  // Execute revocations in parallel with concurrency limit
  const CONCURRENCY = 5
  const queue = [...chainIds]

  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    while (queue.length > 0) {
      const chainId = queue.shift()!
      const chain = CHAINS[chainId]
      if (!chain) {
        const result: BatchRevokeResult = {
          chainId,
          chainName: `Chain ${chainId}`,
          success: false,
          error: 'Chain not supported',
          explorerUrl: '',
        }
        results.push(result)
        completed++
        failed++
        updateProgress()
        continue
      }

      try {
        const { provider, wallet } = getProviderAndWallet(chainId, privateKey)

        // Check for delegation
        const code = await provider.getCode(wallet.address)
        if (!code || code === '0x') {
          const result: BatchRevokeResult = {
            chainId,
            chainName: chain.name,
            success: false,
            error: 'No delegation found on this chain',
            explorerUrl: chain.explorer,
          }
          results.push(result)
          completed++
          failed++
          updateProgress()
          continue
        }

        // Try to revoke delegation
        // EIP-7702 delegation revocation: send TX to self with empty data
        const tx = await wallet.sendTransaction({
          to: wallet.address,
          value: 0n,
          data: '0x',
          gasLimit: 50000n,
        })

        await tx.wait(1)

        const result: BatchRevokeResult = {
          chainId,
          chainName: chain.name,
          success: true,
          txHash: tx.hash,
          explorerUrl: chain.explorer,
        }
        results.push(result)
        completed++
        successful++
        updateProgress()
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        const result: BatchRevokeResult = {
          chainId,
          chainName: chain.name,
          success: false,
          error: errorMessage,
          explorerUrl: chain.explorer,
        }
        results.push(result)
        completed++
        failed++
        updateProgress()
      }
    }
  })

  await Promise.all(workers)
  return results
}

// ── 2. Batch Claim Airdrops ────────────────────────────────

/**
 * Claim multiple airdrops in parallel
 */
export async function batchClaimAirdrops(
  airdrops: AirdropInfo[],
  privateKey: string,
  onProgress?: ProgressCallback
): Promise<BatchClaimResult[]> {
  const results: BatchClaimResult[] = []
  let completed = 0
  let successful = 0
  let failed = 0

  const progress: BatchOperationProgress = {
    total: airdrops.length,
    completed: 0,
    successful: 0,
    failed: 0,
    inProgress: 0,
    pending: airdrops.length,
    results: [],
  }

  const updateProgress = () => {
    progress.completed = completed
    progress.successful = successful
    progress.failed = failed
    progress.inProgress = airdrops.length - completed
    progress.pending = 0
    progress.results = [...results]
    onProgress?.(progress)
  }

  const CONCURRENCY = 3
  const queue = [...airdrops]

  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    while (queue.length > 0) {
      const airdrop = queue.shift()!
      const chain = CHAINS[airdrop.chainId]
      if (!chain) {
        results.push({
          airdropAddress: airdrop.contractAddress,
          chainId: airdrop.chainId,
          chainName: `Chain ${airdrop.chainId}`,
          success: false,
          error: 'Chain not supported',
        })
        completed++
        failed++
        updateProgress()
        continue
      }

      try {
        const { wallet } = getProviderAndWallet(airdrop.chainId, privateKey)

        // Standard claim function call
        const claimAbi = [
          'function claim()',
          'function claim(address to)',
          'function claim(uint256 index, address account, uint256 amount, bytes32[] proof)',
          'function merkleClaim(uint256 index, address account, uint256 amount, bytes32[] proof)',
        ]

        const contract = new ethers.Contract(airdrop.contractAddress, claimAbi, wallet)

        // Try different claim methods
        let tx
        try {
          tx = await contract.claim()
        } catch {
          try {
            tx = await contract.claim(wallet.address)
          } catch {
            tx = await contract.merkleClaim(0, wallet.address, 0, [])
          }
        }

        await tx.wait(1)

        results.push({
          airdropAddress: airdrop.contractAddress,
          chainId: airdrop.chainId,
          chainName: chain.name,
          success: true,
          txHash: tx.hash,
          tokenSymbol: airdrop.tokenSymbol,
          amount: airdrop.amount,
        })
        completed++
        successful++
        updateProgress()
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        results.push({
          airdropAddress: airdrop.contractAddress,
          chainId: airdrop.chainId,
          chainName: chain.name,
          success: false,
          error: errorMessage,
          tokenSymbol: airdrop.tokenSymbol,
        })
        completed++
        failed++
        updateProgress()
      }
    }
  })

  await Promise.all(workers)
  return results
}

// ── 3. Batch Sweep Tokens ──────────────────────────────────

/**
 * Sweep tokens from compromised wallet across multiple chains
 */
export async function batchSweepTokens(
  tokens: TokenSweepTarget[],
  compromisedAddress: string,
  safeAddress: string,
  privateKey: string,
  onProgress?: ProgressCallback
): Promise<BatchSweepResult[]> {
  const results: BatchSweepResult[] = []
  let completed = 0
  let successful = 0
  let failed = 0

  const progress: BatchOperationProgress = {
    total: tokens.length,
    completed: 0,
    successful: 0,
    failed: 0,
    inProgress: 0,
    pending: tokens.length,
    results: [],
  }

  const updateProgress = () => {
    progress.completed = completed
    progress.successful = successful
    progress.failed = failed
    progress.inProgress = tokens.length - completed
    progress.pending = 0
    progress.results = [...results]
    onProgress?.(progress)
  }

  const CONCURRENCY = 5
  const queue = [...tokens]

  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    while (queue.length > 0) {
      const token = queue.shift()!
      const chain = CHAINS[token.chainId]
      if (!chain) {
        results.push({
          tokenAddress: token.tokenAddress,
          symbol: token.symbol,
          chainId: token.chainId,
          chainName: `Chain ${token.chainId}`,
          success: false,
          error: 'Chain not supported',
        })
        completed++
        failed++
        updateProgress()
        continue
      }

      try {
        const { provider, wallet } = getProviderAndWallet(token.chainId, privateKey)
        const contract = new ethers.Contract(token.tokenAddress, ERC20_ABI, wallet)

        const balance = await contract.balanceOf(compromisedAddress)
        if (balance === 0n) {
          results.push({
            tokenAddress: token.tokenAddress,
            symbol: token.symbol,
            chainId: token.chainId,
            chainName: chain.name,
            success: true,
            amount: '0',
          })
          completed++
          successful++
          updateProgress()
          continue
        }

        // Check gas
        const gasPrice = (await provider.getFeeData()).gasPrice || 0n
        const gasEstimate = await contract.transfer.estimateGas(safeAddress, balance)
        const gasCost = gasEstimate * gasPrice
        const nativeBalance = await provider.getBalance(compromisedAddress)

        if (nativeBalance < gasCost) {
          results.push({
            tokenAddress: token.tokenAddress,
            symbol: token.symbol,
            chainId: token.chainId,
            chainName: chain.name,
            success: false,
            error: 'Insufficient gas for transfer',
            amount: ethers.formatUnits(balance, token.decimals),
          })
          completed++
          failed++
          updateProgress()
          continue
        }

        const tx = await contract.transfer(safeAddress, balance)
        await tx.wait(1)

        results.push({
          tokenAddress: token.tokenAddress,
          symbol: token.symbol,
          chainId: token.chainId,
          chainName: chain.name,
          success: true,
          txHash: tx.hash,
          amount: ethers.formatUnits(balance, token.decimals),
        })
        completed++
        successful++
        updateProgress()
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        results.push({
          tokenAddress: token.tokenAddress,
          symbol: token.symbol,
          chainId: token.chainId,
          chainName: chain.name,
          success: false,
          error: errorMessage,
        })
        completed++
        failed++
        updateProgress()
      }
    }
  })

  await Promise.all(workers)
  return results
}

// ── 4. Batch Scan NFTs ─────────────────────────────────────

/**
 * Scan for NFTs across multiple chains
 */
export async function batchScanNFTs(
  address: string,
  chainIds: number[]
): Promise<BatchScanNFTResult[]> {
  const results: BatchScanNFTResult[] = []

  const CONCURRENCY = 5
  const queue = [...chainIds]

  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    while (queue.length > 0) {
      const chainId = queue.shift()!
      const chain = CHAINS[chainId]
      if (!chain) {
        results.push({
          chainId,
          chainName: `Chain ${chainId}`,
          nfts: [],
          success: false,
          error: 'Chain not supported',
        })
        continue
      }

      try {
        const provider = new ethers.JsonRpcProvider(chain.rpc)

        // Use balance + tokenOfOwnerByIndex pattern
        // Note: This requires ERC721Enumerable. For non-enumerable contracts,
        // we'd need an indexer API. This is a best-effort scan.
        const nfts: NFTAsset[] = []

        // Try known NFT contracts on this chain (common ones)
        const KNOWN_NFT_CONTRACTS: Record<number, string[]> = {
          1: [
            '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D', // BAYC
            '0x60E4d786628Fea6478F785A6d7e704777c86a7c6', // MAYC
            '0xED5AF388653567Af2F388E6224dC7C4b3241C544', // Azuki
            '0x49cF6f5d44E70224e2E23fDcdd2C053F30aDA28B', // CloneX
            '0x34d85c9CDeB23FA97cb08333b511ac86E1C4E258', // Otherdeed
          ],
        }

        const contractAddresses = KNOWN_NFT_CONTRACTS[chainId] || []

        for (const contractAddr of contractAddresses) {
          try {
            const contract = new ethers.Contract(contractAddr, ERC721_ABI, provider)
            const balance = await contract.balanceOf(address)
            const balanceNum = Number(balance)

            if (balanceNum > 0 && balanceNum <= 100) {
              // Cap at 100 to prevent excessive calls
              let collectionName = ''
              try {
                collectionName = await contract.name()
              } catch {
                // Ignore
              }

              for (let i = 0; i < Math.min(balanceNum, 20); i++) {
                try {
                  const tokenId = await contract.tokenOfOwnerByIndex(address, i)
                  let uri = ''
                  try {
                    uri = await contract.tokenURI(tokenId)
                  } catch {
                    // Ignore
                  }

                  nfts.push({
                    contractAddress: contractAddr,
                    tokenId: tokenId.toString(),
                    chainId,
                    chainName: chain.name,
                    collection: collectionName,
                    name: `${collectionName} #${tokenId}`,
                  })
                } catch {
                  // Skip individual token errors
                }
              }
            }
          } catch {
            // Contract might not be ERC721Enumerable
          }
        }

        results.push({
          chainId,
          chainName: chain.name,
          nfts,
          success: true,
        })
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        results.push({
          chainId,
          chainName: chain.name,
          nfts: [],
          success: false,
          error: errorMessage,
        })
      }
    }
  })

  await Promise.all(workers)
  return results
}
