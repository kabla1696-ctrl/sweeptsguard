// SweepGuard v5.0 — Background Service Worker
// EIP-7702 Antidrain-style rescue
// Key NEVER leaves browser — only signs EIP-7702 authorization locally
// Same system as zun's Antidrain, but fee goes to OUR wallet

import { encrypt, decrypt } from './crypto.js'
import {
  SWEEPGUARD_RESCUER, PLATFORM_FEE_WALLET, RPC_URLS,
  EXPLORER_URLS, RESCUER_ABI, CHAIN_NAMES
} from './constants.js'

// Encryption password — derived from extension install ID
let ENCRYPTION_PASSWORD = null

// Initialize encryption password
async function initEncryption() {
  if (ENCRYPTION_PASSWORD) return
  const { installId } = await chrome.storage.local.get('installId')
  if (installId) {
    ENCRYPTION_PASSWORD = installId
  } else {
    const newId = crypto.randomUUID()
    await chrome.storage.local.set({ installId: newId })
    ENCRYPTION_PASSWORD = newId
  }
}

// ═══════════════════════════════════════════════════════
// WALLET STORAGE — Encrypted with PBKDF2 + AES-256-GCM
// ═══════════════════════════════════════════════════════

async function saveWallets(wallets) {
  await initEncryption()

  const encrypted = {}
  if (wallets.hackedKey) encrypted.hackedKey = await encrypt(wallets.hackedKey, ENCRYPTION_PASSWORD)
  if (wallets.sponsorKey) encrypted.sponsorKey = await encrypt(wallets.sponsorKey, ENCRYPTION_PASSWORD)
  if (wallets.safeWallet) encrypted.safeWallet = wallets.safeWallet
  if (wallets.sponsorWallet) encrypted.sponsorWallet = wallets.sponsorWallet
  if (wallets.hackedAddress) encrypted.hackedAddress = wallets.hackedAddress

  await chrome.storage.local.set(encrypted)
}

async function getWallets() {
  await initEncryption()

  const data = await chrome.storage.local.get([
    'hackedKey', 'sponsorKey', 'safeWallet', 'sponsorWallet', 'hackedAddress'
  ])

  const result = {}
  if (data.hackedKey) {
    try { result.hackedKey = await decrypt(data.hackedKey, ENCRYPTION_PASSWORD) } catch { result.hackedKey = '' }
  }
  if (data.sponsorKey) {
    try { result.sponsorKey = await decrypt(data.sponsorKey, ENCRYPTION_PASSWORD) } catch { result.sponsorKey = '' }
  }
  result.safeWallet = data.safeWallet || ''
  result.sponsorWallet = data.sponsorWallet || ''
  result.hackedAddress = data.hackedAddress || ''

  return result
}

async function clearWallets() {
  await chrome.storage.local.remove([
    'hackedKey', 'sponsorKey', 'safeWallet', 'sponsorWallet', 'hackedAddress'
  ])
}

// ═══════════════════════════════════════════════════════
// EIP-7702 AUTHORIZATION SIGNING
// Same as zun's Antidrain — compromised wallet delegates
// to SweepGuardRescuer contract
// ═══════════════════════════════════════════════════════

async function signEIP7702Authorization(privateKey, chainId, contractAddress, nonce) {
  // Import ethers.js from CDN (loaded in background)
  // EIP-7702 authorization = keccak256(0x05 || rlp([chainId, address, nonce]))
  const { ethers } = await importEthers()

  const wallet = new ethers.Wallet(privateKey)

  const authPayload = ethers.concat([
    '0x05',
    ethers.encodeRlp([
      ethers.toBeHex(chainId),
      contractAddress.toLowerCase(),
      ethers.toBeHex(nonce),
    ]),
  ])
  const authHash = ethers.keccak256(authPayload)
  const sig = wallet.signingKey.sign(authHash)

  return {
    chainId,
    address: contractAddress,
    nonce,
    yParity: sig.v - 27,
    r: sig.r,
    s: sig.s,
    walletAddress: wallet.address,
  }
}

// ═══════════════════════════════════════════════════════
// AIRDROP CLAIM EXECUTION
// EIP-7702 rescue: compromised wallet delegates to contract,
// sponsor pays gas, contract claims + splits atomically
// ═══════════════════════════════════════════════════════

async function executeEIP7702Rescue(params) {
  const { ethers } = await importEthers()

  const {
    chainId,
    hackedKey,
    safeWallet,
    sponsorKey,
    airdropContract,
    tokenAddress,
    claimData,
    claimableRaw,
  } = params

  const rescuerAddress = SWEEPGUARD_RESCUER[chainId]
  if (!rescuerAddress) {
    throw new Error(`SweepGuardRescuer not deployed on ${CHAIN_NAMES[chainId] || chainId}`)
  }

  // Setup providers and wallets
  const rpcUrl = RPC_URLS[chainId]
  if (!rpcUrl) throw new Error(`No RPC for chain ${chainId}`)

  const provider = new ethers.JsonRpcProvider(rpcUrl)
  const compromisedWallet = new ethers.Wallet(hackedKey, provider)
  const sponsorWallet = new ethers.Wallet(sponsorKey, provider)

  // Verify addresses match
  if (compromisedWallet.address.toLowerCase() !== params.hackedAddress.toLowerCase()) {
    throw new Error('Private key does not match hacked wallet address')
  }

  // Validate safe wallet
  if (ethers.getAddress(safeWallet) === ethers.getAddress(compromisedWallet.address)) {
    throw new Error('Safe wallet CANNOT be the compromised wallet!')
  }
  if (ethers.getAddress(safeWallet) === ethers.getAddress(sponsorWallet.address)) {
    throw new Error('Safe wallet CANNOT be the sponsor wallet!')
  }

  // Get current nonce for EIP-7702 authorization
  const nonce = await provider.getTransactionCount(compromisedWallet.address)

  // Sign EIP-7702 authorization locally
  const auth = await signEIP7702Authorization(hackedKey, chainId, rescuerAddress, nonce)

  // Build claim calldata
  let finalClaimData = claimData || '0x'

  // Build executeRescue calldata
  const rescuerIface = new ethers.Interface(RESCUER_ABI)
  const rescueCalldata = rescuerIface.encodeFunctionData('executeRescue', [
    safeWallet,
    tokenAddress ? [tokenAddress] : [],
    airdropContract,
    finalClaimData,
    PLATFORM_FEE_WALLET,
  ])

  // Get gas parameters
  const [feeData, sponsorBalance, sponsorNonce] = await Promise.all([
    provider.getFeeData(),
    provider.getBalance(sponsorWallet.address),
    provider.getTransactionCount(sponsorWallet.address, 'latest'),
  ])

  const maxFeePerGas = feeData.maxFeePerGas || feeData.gasPrice || ethers.parseUnits('20', 'gwei')
  const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || ethers.parseUnits('2', 'gwei')
  const gasNeeded = maxFeePerGas * 600000n

  if (sponsorBalance < gasNeeded) {
    throw new Error(`Sponsor needs ${ethers.formatEther(gasNeeded)} ETH for gas. Has: ${ethers.formatEther(sponsorBalance)}`)
  }

  // Simulate first
  try {
    await provider.call({
      to: rescuerAddress,
      data: rescueCalldata,
      from: sponsorWallet.address,
      value: 0n,
    })
  } catch (simErr) {
    throw new Error(`Simulation failed: ${simErr.message?.slice(0, 200) || 'Unknown error'}`)
  }

  // Construct EIP-7702 TX (Type 4)
  const eip7702Tx = {
    to: rescuerAddress,
    data: rescueCalldata,
    value: 0n,
    gasLimit: 600000n,
    maxFeePerGas,
    maxPriorityFeePerGas,
    nonce: sponsorNonce,
    chainId: BigInt(chainId),
    type: 4,
    authorizationList: [{
      chainId: BigInt(auth.chainId),
      address: auth.address,
      nonce: BigInt(auth.nonce),
      yParity: auth.yParity,
      r: auth.r,
      s: auth.s,
    }],
  }

  // Submit TX
  const txResponse = await sponsorWallet.sendTransaction(eip7702Tx)
  const receipt = await txResponse.wait(1, 300000)

  if (!receipt || receipt.status !== 1) {
    throw new Error(`Transaction reverted. TX: ${txResponse.hash}`)
  }

  return {
    success: true,
    txHash: txResponse.hash,
    chainId,
    explorer: EXPLORER_URLS[chainId] || 'https://etherscan.io',
    message: 'Rescued via EIP-7702 — key never left browser!',
  }
}

// ═══════════════════════════════════════════════════════
// ETHEREUM PROVIDER INJECTION (like MetaMask)
// Content script injects this as window.ethereum
// Websites think MetaMask is connected
// ═══════════════════════════════════════════════════════

async function handleProviderRequest(method, params, tabId) {
  const wallets = await getWallets()

  switch (method) {
    case 'eth_requestAccounts':
    case 'eth_accounts':
      if (wallets.hackedAddress) {
        return [wallets.hackedAddress]
      }
      // Derive from private key
      if (wallets.hackedKey) {
        const { ethers } = await importEthers()
        const wallet = new ethers.Wallet(wallets.hackedKey)
        await saveWallets({ ...wallets, hackedAddress: wallet.address })
        return [wallet.address]
      }
      throw new Error('No wallet configured. Open SweepGuard extension.')

    case 'eth_chainId': {
      const { chainId } = await chrome.storage.local.get('chainId')
      return chainId || '0x2105' // Default Base (8453)
    }

    case 'wallet_switchEthereumChain':
      await chrome.storage.local.set({ chainId: params[0].chainId })
      return null

    case 'eth_sendTransaction':
      // Intercept TX — check if it's a claim TX
      return await handleSendTransaction(params[0], tabId)

    case 'personal_sign':
    case 'eth_sign':
      // Sign message locally
      return await handleSignMessage(params, wallets)

    default:
      throw new Error(`Unsupported method: ${method}`)
  }
}

// Intercept claim transactions
async function handleSendTransaction(txParams, tabId) {
  const wallets = await getWallets()
  if (!wallets.hackedKey) {
    throw new Error('No wallet configured. Open SweepGuard extension.')
  }

  // Show confirmation popup
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      type: 'CONFIRM_TX',
      txParams,
      tabId,
    }, async (response) => {
      if (response?.confirmed) {
        try {
          const result = await executeEIP7702Rescue({
            chainId: parseInt(response.chainId),
            hackedKey: wallets.hackedKey,
            safeWallet: wallets.safeWallet,
            sponsorKey: wallets.sponsorKey,
            airdropContract: txParams.to,
            tokenAddress: response.tokenAddress,
            claimData: txParams.data,
            claimableRaw: response.claimableRaw || '0',
            hackedAddress: wallets.hackedAddress,
          })
          resolve(result.txHash)
        } catch (err) {
          reject(err)
        }
      } else {
        reject(new Error('User rejected transaction'))
      }
    })
  })
}

// Sign message locally (for personal_sign, eth_sign)
async function handleSignMessage(params, wallets) {
  const { ethers } = await importEthers()
  const wallet = new ethers.Wallet(wallets.hackedKey)
  const message = params[1] || params[0]
  return await wallet.signMessage(ethers.getBytes(message))
}

// ═══════════════════════════════════════════════════════
// ETHERS.JS LOADER
// Import from CDN in service worker context
// ═══════════════════════════════════════════════════════

let ethersModule = null

async function importEthers() {
  if (ethersModule) return ethersModule
  // In extension context, ethers is loaded via importScripts or bundled
  // For now, we use a minimal implementation
  ethersModule = await import('./ethers.min.js')
  return ethersModule
}

// ═══════════════════════════════════════════════════════
// MESSAGE HANDLER
// ═══════════════════════════════════════════════════════

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handler = async () => {
    switch (message.type) {
      case 'SAVE_WALLETS':
        await saveWallets(message.wallets)
        return { success: true }

      case 'GET_WALLETS':
        return await getWallets()

      case 'CLEAR_WALLETS':
        await clearWallets()
        return { success: true }

      case 'GET_STATUS': {
        const wallets = await getWallets()
        const chainId = (await chrome.storage.local.get('chainId')).chainId || 8453
        const hasWallet = !!wallets.hackedKey
        const hasSponsor = !!wallets.sponsorKey
        const rescuerDeployed = !!SWEEPGUARD_RESCUER[chainId]
        return { hasWallet, hasSponsor, chainId, rescuerDeployed }
      }

      case 'EXECUTE_RESCUE': {
        try {
          const result = await executeEIP7702Rescue(message.params)
          return result
        } catch (err) {
          return { error: err.message }
        }
      }

      case 'PROVIDER_REQUEST': {
        try {
          const result = await handleProviderRequest(
            message.method,
            message.params,
            sender.tab?.id
          )
          return { result }
        } catch (err) {
          return { error: err.message }
        }
      }

      default:
        return { error: `Unknown message type: ${message.type}` }
    }
  }

  handler().then(sendResponse).catch(err => sendResponse({ error: err.message }))
  return true // Keep message channel open for async
})

// ═══════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════

chrome.runtime.onInstalled.addListener(async () => {
  console.log('SweepGuard v5.0 installed')
  await initEncryption()
})
