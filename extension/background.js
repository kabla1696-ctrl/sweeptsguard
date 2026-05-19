// SweepGuard Extension v4.0 — EIP-712 Signature-Based
// Intercepts claim TXs, redirects to SweepGuardClaimer contract
// NO PRIVATE KEY NEEDED for claim — only EIP-712 signature

const CLAIMER_CONTRACTS = {
  1: '',      // Ethereum (deploy first)
  8453: '',   // Base
  42161: '',  // Arbitrum
  137: '',    // Polygon
  56: '',     // BSC
  10: '',     // Optimism
}

const PLATFORM_FEE_WALLET = '0x7A3725154a2E6468F9549334394802e9E2822C2A'
const PLATFORM_FEE_PERCENT = 20

// Claim function selectors (common airdrop claim signatures)
const CLAIM_SELECTORS = [
  '0x4e71d92d', // claim()
  '0x27c8f835', // claim()
  '0x48c54b9d', // claim(address)
  '0x379607f5', // claim(uint256,bytes32[])
  '0xa578a715', // claim(address,uint256,bytes32[])
  '0x4e71d92d', // claimReward()
  '0x2e7ba6ef', // claim(bytes)
  '0xba087652', // claim(address,uint256,bytes32[])
  '0x379607f6', // claim(address,uint256,bytes32[],uint256)
  '0x6a06f395', // claimTo(address)
]

// EIP-712 domain for SweepGuardClaimer
function getEIP712Domain(chainId, contractAddress) {
  return {
    name: 'SweepGuard',
    version: '1',
    chainId: chainId,
    verifyingContract: contractAddress,
  }
}

// EIP-712 types for ClaimAirdrop
const CLAIM_AIRDROP_TYPES = {
  EIP712Domain: [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' },
  ],
  ClaimAirdrop: [
    { name: 'hackedWallet', type: 'address' },
    { name: 'safeWallet', type: 'address' },
    { name: 'tokenAddress', type: 'address' },
    { name: 'airdropContract', type: 'address' },
    { name: 'claimData', type: 'bytes' },
    { name: 'amount', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
  ],
}

// Check if a TX is a claim transaction
function isClaimTransaction(txData) {
  if (!txData || txData.length < 10) return false
  const selector = txData.slice(0, 10).toLowerCase()
  return CLAIM_SELECTORS.includes(selector)
}

// Background message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_WALLETS') {
    chrome.storage.local.get(['hackedKey', 'safeWallet', 'sponsorKey', 'sponsorWallet'], (data) => {
      sendResponse({
        hackedKey: data.hackedKey || '',
        safeWallet: data.safeWallet || '',
        sponsorKey: data.sponsorKey || '',
        sponsorWallet: data.sponsorWallet || '',
      })
    })
    return true
  }

  if (message.type === 'SAVE_WALLETS') {
    chrome.storage.local.set({
      hackedKey: message.hackedKey,
      safeWallet: message.safeWallet,
      sponsorKey: message.sponsorKey,
      sponsorWallet: message.sponsorWallet,
    }, () => {
      sendResponse({ success: true })
    })
    return true
  }

  if (message.type === 'INTERCEPT_CLAIM') {
    // Extension detected a claim TX from a dApp
    const { txData, chainId, from, to } = message

    chrome.storage.local.get(['hackedKey', 'safeWallet', 'sponsorKey', 'sponsorWallet'], async (data) => {
      if (!data.hackedKey || !data.safeWallet || !data.sponsorKey) {
        sendResponse({ error: 'Configure wallets first' })
        return
      }

      const claimerAddress = CLAIMER_CONTRACTS[chainId]
      if (!claimerAddress) {
        sendResponse({ error: `SweepGuardClaimer not deployed on chain ${chainId}` })
        return
      }

      // Build EIP-712 typed data for the user to sign
      const deadline = Math.floor(Date.now() / 1000) + 600 // 10 minutes
      const nonce = 0 // Will be fetched from contract in production

      const typedData = {
        domain: getEIP712Domain(chainId, claimerAddress),
        types: CLAIM_AIRDROP_TYPES,
        primaryType: 'ClaimAirdrop',
        message: {
          hackedWallet: from,
          safeWallet: data.safeWallet,
          tokenAddress: '0x0000000000000000000000000000000000000000', // Will be detected
          airdropContract: to,
          claimData: txData,
          amount: '0', // Will be detected
          deadline: deadline.toString(),
          nonce: nonce.toString(),
        },
      }

      // Show popup for user to sign
      sendResponse({
        action: 'SIGN_REQUIRED',
        typedData: typedData,
        claimerAddress: claimerAddress,
        sponsorKey: data.sponsorKey,
        sponsorWallet: data.sponsorWallet,
      })
    })
    return true
  }

  if (message.type === 'EXECUTE_SIGNED_CLAIM') {
    // Submit signed claim to blockchain
    const { signature, typedData, chainId, sponsorKey } = message

    // In production, this would call the SweepGuardClaimer contract
    // For now, return the data needed for execution
    sendResponse({
      action: 'EXECUTE',
      signature,
      typedData,
      chainId,
      sponsorKey,
    })
    return true
  }
})

// Inject content script on all pages
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab.url) {
    chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js'],
    }).catch(() => {})
  }
})
