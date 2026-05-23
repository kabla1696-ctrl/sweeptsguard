import { ethers } from 'ethers'
import { CHAINS } from './chains'

// ============================================================
// NFT RESCUE SYSTEM
// Scan and rescue ERC-721 and ERC-1155 tokens from compromised wallets
// Uses Explorer APIs for discovery (full history) + RPC for verification
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

export interface NFTItem {
  contractAddress: string
  tokenId: string
  tokenType: 'ERC-721' | 'ERC-1155'
  name: string
  symbol: string
  collection: string
  tokenURI?: string
  image?: string
  amount?: string
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

// Popular NFT contracts per chain — always check these
const POPULAR_NFTS: Record<number, string[]> = {
  1: [
    '0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d', // BAYC
    '0x60e4d786628fea6478f785a6d7e704777c86a7c6', // MAYC
    '0xed5af388653567af2f388e6224dc7c4b3241c544', // Azuki
    '0x49cf6f5d44e70224e2e23fdcdd2c053f30ada28b', // CloneX
    '0x34d85c9cdeb23fa97cb08333b511ac86e1c4e258', // Otherdeed
    '0x23581767a106ae21c074b2276d25e5c3e136a68b', // Moonbirds
    '0x8a90cab2b38dba80c64b7734e58ee1db38b8992e', // Doodles
    '0x1a92f7381b9f03921564a437210bb9396471050c', // Cool Cats
    '0xbd3531da5cf5857e7cfaa92426877b022e612cf8', // Pudgy Penguins
    '0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb', // CryptoPunks
    '0x42069abfe407c60cf4ae4112bedaea3a18d66c38', // Art Blocks
    '0x059edd72cd0db4a4b32d37e3b57b292269348216', // Art Blocks Curated
    '0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270', // Art Blocks Flex
    '0x9c8ff314c9bc7f6e59a9d9225fb22946401cfdf1', // Autoglyphs
    '0x6ba6f2207e343923ba692e5aed68f0a98b083894', // Meebits
    '0x348fc118bcc65a92dc033a951af153d14d945312', // CloneX v2
    '0xe785e82358879f061bc3dcac6f0444462d8b5ce6', // World of Women
    '0x524cab2ec69124574082676e6f654a18df49a048', // Loot
    '0x7bd29408f11d2bfc23c34f18275bbf23ce28d2c4', // Mfers
    '0x2ee6af0dff301b00e837fd8cc7c68f1330938c08', // DeGods
    '0x1d20a51f088492a0f1c57f94f2862b2edf27efb4', // Rug Radio
    '0x5af0d9827e0c53e4799bb226655a1de152a425a5', // Milady
    '0x8821bee2ba0df28761aff835bb1c2a18e4f280d8', // Remilio Babies
    '0x39ee2c7b3cb8f0500f6765585990628f7e69b31f', // Redacted Remilio Babies
  ],
  8453: [
    '0x9d771b00e30e3b596eb4a1f32b2e98c3e6e2d2e6', // Base NFTs
    '0x31b1650e390a4bc30509af396021ac71a6440404', // Base Ape
    '0x2c1c6134a2b7e8db398a5ff9c4c0c0b46e21ea4e', // OKX NFT
  ],
  56: [
    '0x0a803ee0a40f1e00616050d0d1fa04005918b5e0', // BSC NFTs
    '0x196d609b08604e41d24e8804b8b4b8c822e02e04', // Pancake Squad
    '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82', // PancakeSwap
  ],
  42161: [
    '0xf1d1f5da2e6e44e3a36e1a5e7d61a2c8f0a1f8c4', // Arbitrum NFTs
  ],
  137: [
    '0x2953399124f0cbb46d2cbacd8a89cf0599974963', // OpenSea Polygon
    '0x3c9e7f3b8a1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f', // Polygon NFTs
  ],
}

// ============================================================
// METHOD 1: Use Explorer API to discover NFTs (best — full history)
// ============================================================
async function scanViaExplorer(
  address: string,
  chainId: number
): Promise<{ contracts: Set<string>; tokenIds: Map<string, Set<string>> }> {
  const chain = CHAINS[chainId]
  if (!chain) return { contracts: new Set(), tokenIds: new Map() }

  const contracts = new Set<string>()
  const tokenIds = new Map<string, Set<string>>()

  // Try explorer API (most chains have Etherscan-compatible APIs)
  const apiKey = process.env.ETHERSCAN_API_KEY || process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY || ''
  const baseUrl = chain.explorerApi

  if (!baseUrl) return { contracts, tokenIds }

  try {
    // Get ERC-721 transfers
    const erc721Url = `${baseUrl}?module=account&action=tokennfttx&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`
    const erc721Res = await fetch(erc721Url, { signal: AbortSignal.timeout(15000) })
    const erc721Data = await erc721Res.json()

    if (erc721Data.status === '1' && Array.isArray(erc721Data.result)) {
      for (const tx of erc721Data.result) {
        const contract = tx.contractAddress?.toLowerCase()
        if (contract) {
          contracts.add(contract)
          if (!tokenIds.has(contract)) tokenIds.set(contract, new Set())
          // Only add tokenIds where this address is the current owner (received, not sent)
          if (tx.to?.toLowerCase() === address.toLowerCase()) {
            tokenIds.get(contract)!.add(tx.tokenID)
          }
        }
      }
    }

    // Get ERC-1155 transfers
    const erc1155Url = `${baseUrl}?module=account&action=token1155tx&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`
    const erc1155Res = await fetch(erc1155Url, { signal: AbortSignal.timeout(15000) })
    const erc1155Data = await erc1155Res.json()

    if (erc1155Data.status === '1' && Array.isArray(erc1155Data.result)) {
      for (const tx of erc1155Data.result) {
        const contract = tx.contractAddress?.toLowerCase()
        if (contract) {
          contracts.add(contract)
          if (!tokenIds.has(contract)) tokenIds.set(contract, new Set())
          if (tx.to?.toLowerCase() === address.toLowerCase()) {
            tokenIds.get(contract)!.add(tx.tokenID)
          }
        }
      }
    }
  } catch (err) {
    console.log(`⚠️ Explorer API failed for chain ${chainId}: ${err}`)
  }

  return { contracts, tokenIds }
}

// ============================================================
// METHOD 2: Use RPC getLogs to discover NFTs (fallback — recent blocks only)
// ============================================================
async function scanViaRPC(
  address: string,
  chainId: number,
  provider: ethers.JsonRpcProvider
): Promise<{ contracts: Set<string>; tokenIds: Map<string, Set<string>> }> {
  const contracts = new Set<string>()
  const tokenIds = new Map<string, Set<string>>()

  const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
  const TRANSFER_SINGLE_TOPIC = '0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62'

  try {
    const currentBlock = await provider.getBlockNumber()
    // Scan last 100k blocks (~2 weeks on ETH, more on L2s)
    const fromBlock = Math.max(0, currentBlock - 100000)
    const walletTopic = ethers.zeroPadValue(address, 32)

    // ERC-721 Transfer events TO this wallet
    const logs = await provider.getLogs({
      fromBlock,
      toBlock: currentBlock,
      topics: [TRANSFER_TOPIC, null, walletTopic]
    }).catch(() => [])

    for (const log of logs) {
      if (log.topics.length === 4) {
        const contract = log.address.toLowerCase()
        contracts.add(contract)
        if (!tokenIds.has(contract)) tokenIds.set(contract, new Set())
        tokenIds.get(contract)!.add(BigInt(log.topics[3]).toString())
      }
    }

    // ERC-1155 TransferSingle events TO this wallet
    const singleLogs = await provider.getLogs({
      fromBlock,
      toBlock: currentBlock,
      topics: [TRANSFER_SINGLE_TOPIC, null, null, walletTopic]
    }).catch(() => [])

    for (const log of singleLogs) {
      const contract = log.address.toLowerCase()
      contracts.add(contract)
      if (!tokenIds.has(contract)) tokenIds.set(contract, new Set())
      try {
        const decoded = ethers.AbiCoder.defaultAbiCoder().decode(['uint256', 'uint256'], log.data)
        tokenIds.get(contract)!.add(decoded[0].toString())
      } catch { /* skip */ }
    }
  } catch (err) {
    console.log(`⚠️ RPC scan failed for chain ${chainId}: ${err}`)
  }

  return { contracts, tokenIds }
}

// ============================================================
// SCAN NFTs owned by address on a specific chain
// Tries Explorer API first, falls back to RPC
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
    // ── Step 1: Discover contracts via Explorer API (full history) ──
    const explorerResult = await scanViaExplorer(address, chainId)
    for (const contract of explorerResult.contracts) {
      processedContracts.add(contract)
    }

    // ── Step 2: Also try RPC discovery (recent blocks) ──
    const rpcResult = await scanViaRPC(address, chainId, provider)
    for (const contract of rpcResult.contracts) {
      processedContracts.add(contract)
    }

    // ── Step 3: Add popular NFT contracts ──
    const popular = POPULAR_NFTS[chainId] || []
    for (const contract of popular) {
      processedContracts.add(contract.toLowerCase())
    }

    // ── Step 4: For each discovered contract, check ownership ──
    for (const contractAddr of processedContracts) {
      try {
        // Try ERC-721 first
        const erc721Contract = new ethers.Contract(contractAddr, ERC721_ABI, provider)
        const balance = await erc721Contract.balanceOf(address).catch(() => null)

        if (balance !== null && balance > BigInt(0)) {
          // It's ERC-721 with tokens
          let collectionName = 'Unknown Collection'
          let collectionSymbol = ''
          try {
            collectionName = await erc721Contract.name()
            collectionSymbol = await erc721Contract.symbol()
          } catch { /* keep defaults */ }

          // Get token IDs — try multiple methods
          const ownedTokenIds: string[] = []

          // Method A: tokenOfOwnerByIndex (ERC-721 Enumerable)
          try {
            const count = Number(balance)
            const max = Math.min(count, 100)
            for (let i = 0; i < max; i++) {
              try {
                const tokenId = await erc721Contract.tokenOfOwnerByIndex(address, i)
                ownedTokenIds.push(tokenId.toString())
              } catch { break } // Not enumerable
            }
          } catch { /* not enumerable */ }

          // Method B: Use known token IDs from explorer/RPC discovery
          if (ownedTokenIds.length === 0) {
            const explorerIds = explorerResult.tokenIds.get(contractAddr) || new Set()
            const rpcIds = rpcResult.tokenIds.get(contractAddr) || new Set()
            const allKnownIds = new Set([...explorerIds, ...rpcIds])

            for (const tokenId of allKnownIds) {
              try {
                const owner = await erc721Contract.ownerOf(tokenId)
                if (owner.toLowerCase() === address.toLowerCase()) {
                  ownedTokenIds.push(tokenId)
                }
              } catch { /* skip */ }
            }
          }

          // Build NFT items
          for (const tokenId of ownedTokenIds) {
            let tokenURI: string | undefined
            let image: string | undefined
            try {
              tokenURI = await erc721Contract.tokenURI(tokenId)
              if (tokenURI) image = await resolveNFTImage(tokenURI)
            } catch { /* ok */ }

            nfts.push({
              contractAddress: contractAddr,
              tokenId,
              tokenType: 'ERC-721',
              name: `#${tokenId}`,
              symbol: collectionSymbol,
              collection: collectionName,
              tokenURI,
              image,
              chainId,
              chainName: chain.name
            })
          }

          continue
        }

        // Try ERC-1155
        const erc1155Contract = new ethers.Contract(contractAddr, ERC1155_ABI, provider)
        const explorerIds = explorerResult.tokenIds.get(contractAddr) || new Set()
        const rpcIds = rpcResult.tokenIds.get(contractAddr) || new Set()
        const allTokenIds = new Set([...explorerIds, ...rpcIds])

        // If we have no known token IDs, try common ones (0, 1, 2, etc.)
        if (allTokenIds.size === 0) {
          for (let i = 0; i < 10; i++) {
            allTokenIds.add(String(i))
          }
        }

        let collectionUri = ''
        try {
          collectionUri = await erc1155Contract.uri(0)
        } catch { /* ok */ }

        for (const tokenId of allTokenIds) {
          try {
            const bal = await erc1155Contract.balanceOf(address, tokenId)
            if (bal > BigInt(0)) {
              let image: string | undefined
              try {
                const uri = await erc1155Contract.uri(tokenId)
                image = await resolveNFTImage(uri.replace('{id}', BigInt(tokenId).toString(16).padStart(64, '0')))
              } catch { /* ok */ }

              nfts.push({
                contractAddress: contractAddr,
                tokenId,
                tokenType: 'ERC-1155',
                name: `#${tokenId}`,
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
// Resolve NFT image from token URI
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

    // HTTP(S)
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
// BATCH NFT TRANSFER
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
  const chains = chainIds || Object.keys(CHAINS).map(Number).filter(id => id !== 0 && id !== 10143)
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
// GET GAS PARAMS
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
