// SweepGuard v5.0 — Background Service Worker
// EIP-7702 Antidrain-style rescue
// Key NEVER leaves browser — only signs EIP-7702 authorization locally
// Same system as zun's Antidrain, but fee goes to OUR wallet

import { encrypt, decrypt } from './crypto.js'
import {
  SWEEPGUARD_RESCUER, PLATFORM_FEE_WALLET, RPC_URLS,
  EXPLORER_URLS, RESCUER_ABI, CHAIN_NAMES,
  SOLANA_CONFIG, isPhantomAvailable, isValidSolanaAddress
} from './constants.js'

// Encryption password — derived from extension install ID
let ENCRYPTION_PASSWORD = null

// Active rescue lock — prevents duplicate submissions
let activeRescue = false

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
// ETHEREUM PROVIDER HANDLER
// Handles requests from content script (via page)
// ═══════════════════════════════════════════════════════

async function handleProviderRequest(method, params, tabId) {
  const wallets = await getWallets()

  switch (method) {
    // ── ACCOUNT REQUESTS ──────────────────────────────
    // BUG #6 FIX: Always show confirmation popup before revealing account
    case 'eth_requestAccounts':
    case 'eth_accounts': {
      if (!wallets.hackedKey) {
        throw new Error('No wallet configured. Open SweepGuard extension popup → Wallets tab.')
      }

      // Show confirmation popup
      const confirmed = await showConfirmationPopup({
        title: 'Connect Wallet',
        message: `A website wants to connect to your wallet.\n\nAddress: ${wallets.hackedAddress || '(deriving...)'}`,
      })
      if (!confirmed) {
        throw new Error('User rejected connection request')
      }

      if (wallets.hackedAddress) {
        return [wallets.hackedAddress]
      }
      // Derive from private key
      const { ethers } = await importEthers()
      const wallet = new ethers.Wallet(wallets.hackedKey)
      await saveWallets({ ...wallets, hackedAddress: wallet.address })
      return [wallet.address]
    }

    // ── CHAIN ─────────────────────────────────────────
    case 'eth_chainId': {
      const { chainId } = await chrome.storage.local.get('chainId')
      const id = chainId || 8453
      return '0x' + id.toString(16)
    }

    // BUG #13 FIX: Validate chain ID
    case 'wallet_switchEthereumChain': {
      const requestedChainId = parseInt(params[0].chainId, 16)
      if (!SWEEPGUARD_RESCUER[requestedChainId] && !CHAIN_NAMES[requestedChainId]) {
        throw new Error(`Chain ${requestedChainId} is not supported by SweepGuard`)
      }
      await chrome.storage.local.set({ chainId: requestedChainId })
      return null
    }

    // ── TRANSACTION ───────────────────────────────────
    case 'eth_sendTransaction':
      return await handleSendTransaction(params[0], tabId)

    // ── SIGNING ───────────────────────────────────────
    // BUG #2 FIX: Block eth_sign entirely (raw hash signing = extremely dangerous)
    case 'eth_sign':
      throw new Error('eth_sign is blocked for security. Use personal_sign instead.')

    // BUG #1 FIX: personal_sign requires popup confirmation — NEVER auto-sign
    case 'personal_sign':
      return await handleSignMessage(params, wallets)

    default:
      throw new Error(`Unsupported method: ${method}`)
  }
}

// ═══════════════════════════════════════════════════════
// SIGN MESSAGE — WITH POPUP CONFIRMATION
// BUG #1 FIX: Never auto-sign. Always ask user first.
// ═══════════════════════════════════════════════════════

async function handleSignMessage(params, wallets) {
  if (!wallets.hackedKey) {
    throw new Error('No wallet configured. Open SweepGuard extension.')
  }

  const { ethers } = await importEthers()
  // personal_sign: params can be [message, address] or [address, message]
  // Detect which is the address and use the other as message
  let message = params[0]
  try {
    const { ethers: e } = await importEthers()
    // If params[0] is a valid address, message is params[1]
    e.getAddress(params[0])
    message = params[1]
  } catch {
    // params[0] is not an address, use it as message
    message = params[0]
  }

  // Decode message for display
  let displayMessage = message
  try {
    displayMessage = ethers.toUtf8String(message)
  } catch {
    displayMessage = message
  }

  // Show confirmation popup
  const confirmed = await showConfirmationPopup({
    title: 'Sign Message',
    message: `A website wants you to sign a message.\n\nMessage: ${displayMessage.slice(0, 200)}${displayMessage.length > 200 ? '...' : ''}\n\n⚠️ Only sign if you trust this site!`,
  })
  if (!confirmed) {
    throw new Error('User rejected signing request')
  }

  const wallet = new ethers.Wallet(wallets.hackedKey)
  // BUG #19 FIX: getBytes can crash on non-hex messages
  let messageBytes
  try {
    messageBytes = ethers.getBytes(message)
  } catch {
    messageBytes = ethers.toUtf8Bytes(message)
  }
  return await wallet.signMessage(messageBytes)
}

// ═══════════════════════════════════════════════════════
// SEND TRANSACTION — INTERCEPT CLAIM TXs
// BUG #3 FIX: Proper confirmation flow via popup
// BUG #11 FIX: Duplicate submission lock
// ═══════════════════════════════════════════════════════

async function handleSendTransaction(txParams, tabId) {
  const wallets = await getWallets()
  if (!wallets.hackedKey) {
    throw new Error('No wallet configured. Open SweepGuard extension.')
  }

  // BUG #18 FIX: Validate txParams.to
  if (!txParams.to) {
    throw new Error('Transaction missing "to" address')
  }
  try {
    const { ethers: e } = await importEthers()
    e.getAddress(txParams.to)
  } catch {
    throw new Error(`Invalid "to" address: ${txParams.to}`)
  }

  // BUG #11 FIX: Prevent duplicate submissions
  if (activeRescue) {
    throw new Error('A rescue is already in progress. Please wait for it to complete.')
  }

  // BUG #16 FIX: Show full TX details in confirmation
  const { chainId: confirmChainId } = await chrome.storage.local.get('chainId')
  const confirmChainId2 = confirmChainId || 8453
  const chainName = CHAIN_NAMES[confirmChainId2] || `Chain ${confirmChainId2}`

  const confirmed = await showConfirmationPopup({
    title: 'Confirm Transaction',
    message: `Chain: ${chainName}\nTo: ${txParams.to}\nValue: ${txParams.value || '0x0'}\n\n🛡️ EIP-7702 Rescue:\n1. Compromised wallet delegates to SweepGuardRescuer\n2. Contract claims airdrop\n3. 80% → safe wallet, 20% → platform fee\n\n⚠️ Only confirm if you trust this website!`,
  })
  if (!confirmed) {
    throw new Error('User rejected transaction')
  }

  // BUG #11 FIX: Set lock
  activeRescue = true

  try {
    // BUG #8 FIX: Get chain ID from storage, not from unconfirmed message
    const { chainId: storedChainId } = await chrome.storage.local.get('chainId')
    const chainId = storedChainId || 8453

    const result = await executeEIP7702Rescue({
      chainId,
      hackedKey: wallets.hackedKey,
      safeWallet: wallets.safeWallet,
      sponsorKey: wallets.sponsorKey,
      airdropContract: txParams.to,
      tokenAddress: '',
      claimData: txParams.data || '0x',
      claimableRaw: '0',
      hackedAddress: wallets.hackedAddress,
    })

    return result.txHash
  } finally {
    // BUG #11 FIX: Always release lock
    activeRescue = false
  }
}

// ═══════════════════════════════════════════════════════
// CONFIRMATION POPUP
// Shows a confirmation dialog via chrome.windows API
// Returns true if user confirms, false if rejects
// ═══════════════════════════════════════════════════════

async function showConfirmationPopup({ title, message }) {
  // Use chrome.notifications as confirmation mechanism
  // In production, this should open a dedicated popup window
  return new Promise((resolve) => {
    // Store pending confirmation
    // BUG #17 FIX: Use crypto.randomUUID() to prevent collision
    const confirmId = 'confirm_' + crypto.randomUUID()
    chrome.storage.local.set({
      [confirmId]: { title, message, resolve: true }
    })

    // Open popup window for confirmation
    chrome.windows.create({
      url: `confirm.html?title=${encodeURIComponent(title)}&message=${encodeURIComponent(message)}&id=${confirmId}`,
      type: 'popup',
      width: 400,
      height: 350,
      focused: true,
    })

    // Listen for confirmation response
    const listener = (changes) => {
      if (changes[confirmId]) {
        const val = changes[confirmId].newValue
        if (val?.confirmed !== undefined) {
          chrome.storage.onChanged.removeListener(listener)
          chrome.storage.local.remove(confirmId)
          resolve(val.confirmed)
        }
      }
    }
    chrome.storage.onChanged.addListener(listener)

    // Timeout after 5 minutes
    setTimeout(() => {
      chrome.storage.onChanged.removeListener(listener)
      chrome.storage.local.remove(confirmId)
      resolve(false)
    }, 300000)
  })
}

// ═══════════════════════════════════════════════════════
// ETHERS.JS LOADER
// ═══════════════════════════════════════════════════════

let ethersModule = null

async function importEthers() {
  if (ethersModule) return ethersModule
  ethersModule = await import('./ethers.min.js')
  return ethersModule
}

// ═══════════════════════════════════════════════════════
// MESSAGE HANDLER
// ═══════════════════════════════════════════════════════

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handler = async () => {
    switch (message.type) {
      case 'SAVE_WALLETS': {
        // BUG #4 FIX: Validate addresses before saving
        const { ethers } = await importEthers()
        const { hackedKey, safeWallet, sponsorKey } = message.wallets

        // Validate safe wallet address
        if (safeWallet) {
          try { ethers.getAddress(safeWallet) } catch {
            throw new Error('Invalid safe wallet address')
          }
        }

        // Derive addresses for validation
        let hackedAddress = ''
        if (hackedKey) {
          const hw = new ethers.Wallet(hackedKey)
          hackedAddress = hw.address
          // BUG #4 FIX: safeWallet ≠ hackedAddress
          if (safeWallet && ethers.getAddress(safeWallet) === ethers.getAddress(hackedAddress)) {
            throw new Error('Safe wallet CANNOT be the same as hacked wallet!')
          }
        }

        let sponsorWallet = ''
        if (sponsorKey) {
          const sw = new ethers.Wallet(sponsorKey)
          sponsorWallet = sw.address
          // BUG #4 FIX: safeWallet ≠ sponsorWallet
          if (safeWallet && ethers.getAddress(safeWallet) === ethers.getAddress(sponsorWallet)) {
            throw new Error('Safe wallet CANNOT be the same as sponsor wallet!')
          }
          // BUG #4 FIX: hackedKey ≠ sponsorKey
          if (hackedKey && sponsorKey === hackedKey) {
            throw new Error('Sponsor key CANNOT be the same as hacked key!')
          }
        }

        await saveWallets({
          ...message.wallets,
          hackedAddress,
          sponsorWallet,
        })
        return { success: true }
      }

      case 'GET_WALLETS': {
        const wallets = await getWallets()
        // BUG #7 FIX: Never return decrypted private keys to popup
        // Return addresses only — popup doesn't need raw keys
        return {
          hackedKey: wallets.hackedKey ? '••••••••' : '',
          safeWallet: wallets.safeWallet,
          sponsorKey: wallets.sponsorKey ? '••••••••' : '',
          sponsorWallet: wallets.sponsorWallet,
          hackedAddress: wallets.hackedAddress,
          hasHackedKey: !!wallets.hackedKey,
          hasSponsorKey: !!wallets.sponsorKey,
        }
      }

      case 'GET_WALLETS_RAW': {
        // Only for internal use (rescue execution)
        return await getWallets()
      }

      case 'CLEAR_WALLETS':
        await clearWallets()
        return { success: true }

      case 'GET_STATUS': {
        const wallets = await getWallets()
        const { chainId } = await chrome.storage.local.get('chainId')
        const effectiveChainId = chainId || 8453
        const hasWallet = !!wallets.hackedKey
        const hasSponsor = !!wallets.sponsorKey
        const rescuerDeployed = !!SWEEPGUARD_RESCUER[effectiveChainId]
        return { hasWallet, hasSponsor, chainId: effectiveChainId, rescuerDeployed }
      }

      case 'EXECUTE_RESCUE': {
        // BUG #11 FIX: Prevent duplicate submissions
        if (activeRescue) {
          return { error: 'A rescue is already in progress. Please wait.' }
        }
        activeRescue = true
        try {
          const result = await executeEIP7702Rescue(message.params)
          return result
        } catch (err) {
          return { error: err.message }
        } finally {
          activeRescue = false
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

      case 'CONFIRM_RESPONSE': {
        // Handle confirmation popup response
        const { confirmId, confirmed } = message
        await chrome.storage.local.set({ [confirmId]: { confirmed } })
        return { success: true }
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
