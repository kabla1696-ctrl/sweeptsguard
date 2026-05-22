import { ethers } from 'ethers'
import { CHAINS } from './chains'

// ============================================================
// NFT RESCUE SYSTEM
// Scan and rescue ERC-721 and ERC-1155 tokens from compromised wallets
// ============================================================

// NFT ABI — minimal interface for transfer operations
const ERC721_ABI = [
  'function safeTransferFrom(address from, address to, uint256 tokenId) external',
  'function balanceOf(address owner) external view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
  'function tokenURI(uint256 tokenId) external view returns (string)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
]

const ERC1155_ABI = [
  'function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data) external',
  'function balanceOf(address account, uint256 id) external view returns (uint256)',
  'function uri(uint256 id) external view returns (string)',
  'event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 indexed id, uint256 value)',
  'event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values)'
]

// Transfer event topic (ERC-721 and ERC-20 share the same signature)
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
// ERC-1155 TransferSingle topic
const TRANSFER_SINGLE_TOPIC = '0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62'
// ERC-1155 TransferBatch topic
const TRANSFER_BATCH_TOPIC = '0x4a39dc06d4c0dbc64b70af90fd698a233a51805f7d3a3de0e5e0f2d2b4c6e7f2'

export interface NFTItem {
  contractAddress: string
  tokenId: string
  tokenType: 'ERC-721' | 'ERC-1155'
  name: string
  symbol: string
  collection: string
  tokenURI?: string
  image?: string
  amount?: string // For ERC-1155, the balance held
  chainId: number
  chainName: string
}

export interface NFTTransferTx {
  to: string
  data: string
  value: bigint
  gasLimit: bigint
  nft: NFTItem
}

// Block range limits per chain (same as fundRecovery)
const CHAIN_BLOCK_RANGES: Record<number, number> = {
  1: 2000,
  8453: 5000,
  56: 5000,
  42161: 10000,
  137: 5000,
  10: 5000,
  43114: 5000,
  250: 5000,
  81457: 5000,
  324: 5000,
  59144: 5000,
  5000: 5000,
  534352: 5000,
  100: 5000,
  7000: 5000,
  80094: 5000,
  57073: 5000,
  1868: 5000,
  1329: 5000,
  1116: 5000,
  1625: 5000,
  25: 5000,
  1101: 5000,
  169: 5000,
  34443: 5000,
  196: 5000,
  43111: 5000,
  8217: 5000,
  2818: 5000,
  1923: 5000,
  10143: 5000,
  7777777: 5000,
}

// ============================================================
// SCAN NFTs owned by address on a specific chain
// Uses Transfer event logs to discover NFT contracts, then verifies ownership
// ============================================================
export async function scanNFTs(
  address: string,
  chainId: number
): Promise<NFTItem[]> {
  const chain = CHAINS[chainId]
  if (!chain) return []

  const provider = new ethers.JsonRpcProvider(chain.rpc)
  const nfts: NFTItem[] = []
  const processedContracts = new Set<string>()

  try {
    const currentBlock = await provider.getBlockNumber()
    const maxBlockRange = CHAIN_BLOCK_RANGES[chainId] || 5000
    const scanBlocks = Math.min(maxBlockRange * 2, 50000)
    const fromBlock = Math.max(0, currentBlock - scanBlocks)

    const walletTopic = ethers.zeroPadValue(address, 32)

    // ── Step 1: Discover ERC-721 contracts via Transfer events TO this wallet ──
    // ERC-721 Transfer has 3 topics: signature, from, to (tokenId is data/indexed as topic[3])
    // But ERC-721 Transfer event has tokenId as the 3rd indexed param
    // Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
    // topics: [TRANSFER_TOPIC, from, to, tokenId]
    // We want: to = address, and check if it's ERC-721 (3 indexed topics)
    const erc721LogsTo = await provider.getLogs({
      fromBlock,
      toBlock: currentBlock,
      topics: [TRANSFER_TOPIC, null, walletTopic]
    }).catch(() => [])

    // Discover unique contract addresses
    for (const log of erc721LogsTo) {
      const contractAddr = log.address.toLowerCase()
      if (!processedContracts.has(contractAddr) && log.topics.length === 4) {
        processedContracts.add(contractAddr)
      }
    }

    // Also check FROM this wallet
    const erc721LogsFrom = await provider.getLogs({
      fromBlock,
      toBlock: currentBlock,
      topics: [TRANSFER_TOPIC, walletTopic, null]
    }).catch(() => [])

    for (const log of erc721LogsFrom) {
      const contractAddr = log.address.toLowerCase()
      if (!processedContracts.has(contractAddr) && log.topics.length === 4) {
        processedContracts.add(contractAddr)
      }
    }

    // ── Step 2: Discover ERC-1155 contracts via TransferSingle events ──
    const erc1155SingleLogs = await provider.getLogs({
      fromBlock,
      toBlock: currentBlock,
      topics: [TRANSFER_SINGLE_TOPIC, null, null, walletTopic]
    }).catch(() => [])

    for (const log of erc1155SingleLogs) {
      processedContracts.add(log.address.toLowerCase())
    }

    // Also check FROM for ERC-1155
    const erc1155SingleLogsFrom = await provider.getLogs({
      fromBlock,
      toBlock: currentBlock,
      topics: [TRANSFER_SINGLE_TOPIC, null, walletTopic, null]
    }).catch(() => [])

    for (const log of erc1155SingleLogsFrom) {
      processedContracts.add(log.address.toLowerCase())
    }

    // ── Step 3: Discover ERC-1155 contracts via TransferBatch events ──
    const erc1155BatchLogs = await provider.getLogs({
      fromBlock,
      toBlock: currentBlock,
      topics: [TRANSFER_BATCH_TOPIC, null, null, walletTopic]
    }).catch(() => [])

    for (const log of erc1155BatchLogs) {
      processedContracts.add(log.address.toLowerCase())
    }

    // ── Step 4: For each discovered contract, check if it's ERC-721 or ERC-1155 ──
    for (const contractAddr of processedContracts) {
      try {
        // Try ERC-721 first
        const erc721Contract = new ethers.Contract(contractAddr, ERC721_ABI, provider)
        const balance = await erc721Contract.balanceOf(address).catch(() => null)

        if (balance !== null && balance > BigInt(0)) {
          // It's ERC-721
          let collectionName = 'Unknown Collection'
          let collectionSymbol = ''
          try {
            collectionName = await erc721Contract.name()
            collectionSymbol = await erc721Contract.symbol()
          } catch { /* keep defaults */ }

          const tokenIdCount = Number(balance)
          const maxTokensToScan = Math.min(tokenIdCount, 100) // Cap at 100 per collection

          for (let i = 0; i < maxTokensToScan; i++) {
            try {
              const tokenId = await erc721Contract.tokenOfOwnerByIndex(address, i)
              let tokenURI: string | undefined
              let image: string | undefined

              try {
                tokenURI = await erc721Contract.tokenURI(tokenId)
                image = await resolveNFTImage(tokenURI)
              } catch { /* tokenURI may not exist */ }

              nfts.push({
                contractAddress: contractAddr,
                tokenId: tokenId.toString(),
                tokenType: 'ERC-721',
                name: `#${tokenId.toString()}`,
                symbol: collectionSymbol,
                collection: collectionName,
                tokenURI,
                image,
                chainId,
                chainName: chain.name
              })
            } catch {
              // tokenOfOwnerByIndex may not be supported
              // Fall back: check if ownerOf works for known tokenIds from Transfer logs
            }
          }

          // If tokenOfOwnerByIndex failed, try extracting tokenIds from Transfer logs
          if (nfts.filter(n => n.contractAddress === contractAddr).length === 0) {
            const tokenIds = extractTokenIdsFromLogs(erc721LogsTo, contractAddr, address)
            for (const tokenId of tokenIds) {
              try {
                const owner = await erc721Contract.ownerOf(tokenId)
                if (owner.toLowerCase() === address.toLowerCase()) {
                  let tokenURI: string | undefined
                  let image: string | undefined
                  try {
                    tokenURI = await erc721Contract.tokenURI(tokenId)
                    image = await resolveNFTImage(tokenURI)
                  } catch { /* ok */ }

                  nfts.push({
                    contractAddress: contractAddr,
                    tokenId: tokenId.toString(),
                    tokenType: 'ERC-721',
                    name: `#${tokenId.toString()}`,
                    symbol: collectionSymbol,
                    collection: collectionName,
                    tokenURI,
                    image,
                    chainId,
                    chainName: chain.name
                  })
                }
              } catch { /* skip */ }
            }
          }

          continue // Already processed as ERC-721
        }

        // Try ERC-1155
        const erc1155Contract = new ethers.Contract(contractAddr, ERC1155_ABI, provider)
        const tokenIds = extractERC1155TokenIds(
          [...erc1155SingleLogs, ...erc1155BatchLogs],
          contractAddr,
          address
        )

        let collectionUri = ''
        try {
          collectionUri = await erc1155Contract.uri(0)
        } catch { /* ok */ }

        for (const tokenId of tokenIds) {
          try {
            const bal = await erc1155Contract.balanceOf(address, tokenId)
            if (bal > BigInt(0)) {
              let image: string | undefined
              try {
                const uri = await erc1155Contract.uri(tokenId)
                image = await resolveNFTImage(uri.replace('{id}', tokenId.toString(16).padStart(64, '0')))
              } catch { /* ok */ }

              nfts.push({
                contractAddress: contractAddr,
                tokenId: tokenId.toString(),
                tokenType: 'ERC-1155',
                name: `#${tokenId.toString()}`,
                symbol: '',
                collection: collectionUri || 'ERC-1155 Collection',
                tokenURI: collectionUri,
                image,
                amount: bal.toString(),
                chainId,
                chainName: chain.name
              })
            }
          } catch { /* skip */ }
        }
      } catch {
        // Not a valid NFT contract, skip
      }
    }
  } catch (err) {
    console.log(`⚠️ NFT scan failed on chain ${chainId}: ${err}`)
  }

  return nfts
}

// ============================================================
// Extract token IDs from Transfer logs for a specific contract + recipient
// ============================================================
function extractTokenIdsFromLogs(
  logs: ethers.Log[],
  contractAddress: string,
  recipientAddress: string
): bigint[] {
  const tokenIds = new Set<string>()
  const addrLower = contractAddress.toLowerCase()

  for (const log of logs) {
    if (log.address.toLowerCase() === addrLower && log.topics.length === 4) {
      const to = '0x' + log.topics[2].slice(26)
      if (to.toLowerCase() === recipientAddress.toLowerCase()) {
        tokenIds.add(BigInt(log.topics[3]).toString())
      }
    }
  }

  return Array.from(tokenIds).map(id => BigInt(id))
}

// ============================================================
// Extract ERC-1155 token IDs from TransferSingle/TransferBatch logs
// ============================================================
function extractERC1155TokenIds(
  logs: ethers.Log[],
  contractAddress: string,
  address: string
): bigint[] {
  const tokenIds = new Set<string>()
  const addrLower = contractAddress.toLowerCase()
  const addrPadded = ethers.zeroPadValue(address, 32).toLowerCase()

  for (const log of logs) {
    if (log.address.toLowerCase() !== addrLower) continue

    if (log.topics[0] === TRANSFER_SINGLE_TOPIC && log.topics.length >= 4) {
      // TransferSingle: operator, from, to, id
      const from = log.topics[2]
      const to = log.topics[3]
      if (from.toLowerCase() === addrPadded || to.toLowerCase() === addrPadded) {
        // tokenId is in the data (not topics) for TransferSingle
        // Actually tokenId is topics[3], value is in data
        // Wait — let me re-check. TransferSingle signature:
        // event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 indexed id, uint256 value)
        // So topics = [sig, operator, from, to], and id+value are in data
        // But we have 4 topics (sig + 3 indexed), so id might be topic[3] or in data
        // Standard ERC-1155: id is NOT indexed, it's in data
        // Let me handle both cases
        try {
          const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
            ['uint256', 'uint256'],
            log.data
          )
          tokenIds.add(decoded[0].toString())
        } catch {
          // If data decoding fails, try topic[3]
          if (log.topics.length > 3) {
            tokenIds.add(BigInt(log.topics[3]).toString())
          }
        }
      }
    } else if (log.topics[0] === TRANSFER_BATCH_TOPIC && log.topics.length >= 4) {
      // TransferBatch: operator, from, to, ids[], values[]
      const from = log.topics[2]
      const to = log.topics[3]
      if (from.toLowerCase() === addrPadded || to.toLowerCase() === addrPadded) {
        try {
          const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
            ['uint256[]', 'uint256[]'],
            log.data
          )
          for (const id of decoded[0]) {
            tokenIds.add(id.toString())
          }
        } catch { /* skip */ }
      }
    }
  }

  return Array.from(tokenIds).map(id => BigInt(id))
}

// ============================================================
// Resolve NFT image from token URI
// Supports: IPFS, Arweave, HTTP(S), and base64 data URIs
// ============================================================
async function resolveNFTImage(tokenURI: string): Promise<string | undefined> {
  if (!tokenURI) return undefined

  try {
    // IPFS
    if (tokenURI.startsWith('ipfs://')) {
      const ipfsHash = tokenURI.replace('ipfs://', '')
      return `https://ipfs.io/ipfs/${ipfsHash}`
    }

    // Arweave
    if (tokenURI.startsWith('ar://')) {
      const arId = tokenURI.replace('ar://', '')
      return `https://arweave.net/${arId}`
    }

    // Base64 encoded metadata
    if (tokenURI.startsWith('data:application/json;base64,')) {
      const base64 = tokenURI.split(',')[1]
      const json = JSON.parse(Buffer.from(base64, 'base64').toString())
      return resolveImageUrl(json.image)
    }

    // HTTP(S) — fetch metadata and extract image
    if (tokenURI.startsWith('http')) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      try {
        const res = await fetch(tokenURI, { signal: controller.signal })
        clearTimeout(timeout)
        const json = await res.json()
        return resolveImageUrl(json.image)
      } catch {
        clearTimeout(timeout)
        return undefined
      }
    }

    return undefined
  } catch {
    return undefined
  }
}

function resolveImageUrl(image: string | undefined): string | undefined {
  if (!image) return undefined
  if (image.startsWith('ipfs://')) {
    return `https://ipfs.io/ipfs/${image.replace('ipfs://', '')}`
  }
  if (image.startsWith('ar://')) {
    return `https://arweave.net/${image.replace('ar://', '')}`
  }
  return image
}

// ============================================================
// CREATE NFT TRANSFER TRANSACTION
// ============================================================
export function createNFTTransferTx(
  nft: NFTItem,
  from: string,
  to: string,
  nonce: number,
  gasParams: { maxFeePerGas?: bigint; maxPriorityFeePerGas?: bigint; gasPrice?: bigint; type: number }
): NFTTransferTx {
  const baseTxParams = {
    chainId: nft.chainId,
    nonce,
    ...(gasParams.type === 2
      ? { type: 2, maxFeePerGas: gasParams.maxFeePerGas, maxPriorityFeePerGas: gasParams.maxPriorityFeePerGas }
      : { gasPrice: gasParams.gasPrice })
  }

  if (nft.tokenType === 'ERC-721') {
    const iface = new ethers.Interface(ERC721_ABI)
    const data = iface.encodeFunctionData('safeTransferFrom', [from, to, BigInt(nft.tokenId)])
    return {
      to: nft.contractAddress,
      data,
      value: 0n,
      gasLimit: 150000n,
      nft
    }
  } else {
    // ERC-1155
    const iface = new ethers.Interface(ERC1155_ABI)
    const amount = nft.amount ? BigInt(nft.amount) : 1n
    const data = iface.encodeFunctionData('safeTransferFrom', [from, to, BigInt(nft.tokenId), amount, '0x'])
    return {
      to: nft.contractAddress,
      data,
      value: 0n,
      gasLimit: 150000n,
      nft
    }
  }
}

// ============================================================
// BATCH NFT TRANSFER — Create transactions for multiple NFTs
// ============================================================
export function batchNFTTransfer(
  nfts: NFTItem[],
  from: string,
  to: string,
  startNonce: number,
  gasParams: { maxFeePerGas?: bigint; maxPriorityFeePerGas?: bigint; gasPrice?: bigint; type: number }
): NFTTransferTx[] {
  const txs: NFTTransferTx[] = []
  let nonce = startNonce

  for (const nft of nfts) {
    try {
      const tx = createNFTTransferTx(nft, from, to, nonce++, gasParams)
      txs.push(tx)
    } catch (err) {
      console.log(`⚠️ Failed to create transfer TX for NFT ${nft.contractAddress} #${nft.tokenId}: ${err}`)
    }
  }

  return txs
}

// ============================================================
// SCAN NFTs ACROSS ALL CHAINS
// ============================================================
export async function scanNFTsAllChains(
  address: string,
  chainIds?: number[]
): Promise<{ nfts: NFTItem[]; failedChains: number[] }> {
  const chains = chainIds || Object.keys(CHAINS).map(Number).filter(id => id !== 0 && id !== 10143) // Exclude 0G and Monad testnet
  const allNfts: NFTItem[] = []
  const failedChains: number[] = []

  const results = await Promise.allSettled(
    chains.map(async (chainId) => {
      try {
        const nfts = await scanNFTs(address, chainId)
        return { chainId, nfts }
      } catch {
        return { chainId, nfts: [] as NFTItem[], failed: true }
      }
    })
  )

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { nfts } = result.value
      allNfts.push(...nfts)
      if ('failed' in result.value && result.value.failed) {
        failedChains.push(result.value.chainId)
      }
    } else {
      failedChains.push(-1)
    }
  }

  return { nfts: allNfts, failedChains }
}

// ============================================================
// GET GAS PARAMS (shared helper)
// ============================================================
export async function getNFTGasParams(
  provider: ethers.JsonRpcProvider,
  chainId: number
): Promise<{
  maxFeePerGas?: bigint
  maxPriorityFeePerGas?: bigint
  gasPrice?: bigint
  type: number
}> {
  const feeData = await provider.getFeeData()
  const eip1559Chains = new Set([1, 8453, 42161, 137, 10, 43114, 81457, 324, 59144, 534352, 7777777, 57073, 1868])

  if (eip1559Chains.has(chainId) && feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
    return {
      maxFeePerGas: feeData.maxFeePerGas,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
      type: 2
    }
  }

  return {
    gasPrice: feeData.gasPrice || feeData.maxFeePerGas || ethers.parseUnits('30', 'gwei'),
    type: 0
  }
}

// ============================================================
// ESTIMATE GAS for NFT transfers
// ============================================================
export async function estimateNFTTransferGas(
  provider: ethers.JsonRpcProvider,
  nft: NFTItem,
  from: string,
  to: string
): Promise<bigint> {
  try {
    if (nft.tokenType === 'ERC-721') {
      const contract = new ethers.Contract(nft.contractAddress, ERC721_ABI, provider)
      return await contract.safeTransferFrom.estimateGas(from, to, BigInt(nft.tokenId))
    } else {
      const contract = new ethers.Contract(nft.contractAddress, ERC1155_ABI, provider)
      const amount = nft.amount ? BigInt(nft.amount) : 1n
      return await contract.safeTransferFrom.estimateGas(from, to, BigInt(nft.tokenId), amount, '0x')
    }
  } catch {
    return nft.tokenType === 'ERC-721' ? 150000n : 200000n
  }
}
