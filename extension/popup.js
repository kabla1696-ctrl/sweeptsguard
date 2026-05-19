// SweepGuard Extension v4.0 — Popup Script
// EIP-712 Signature-Based Claim System

const CLAIMER_CONTRACTS = {
  1: '',      // Ethereum (deploy first)
  8453: '',   // Base
  42161: '',  // Arbitrum
  137: '',    // Polygon
  56: '',     // BSC
  10: '',     // Optimism
}

let selectedChain = 1
let signature = null

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
    document.querySelectorAll('.content').forEach(c => c.classList.add('hidden'))
    tab.classList.add('active')
    document.getElementById(tab.dataset.tab).classList.remove('hidden')
  })
})

// Chain selection
document.querySelectorAll('.chain-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.chain-btn').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    selectedChain = parseInt(btn.dataset.chain)
  })
})

// Load saved wallets
chrome.runtime.sendMessage({ type: 'GET_WALLETS' }, (data) => {
  if (data) {
    document.getElementById('hackedKey').value = data.hackedKey || ''
    document.getElementById('safeWallet').value = data.safeWallet || ''
    document.getElementById('sponsorKey').value = data.sponsorKey || ''
    document.getElementById('sponsorWallet').value = data.sponsorWallet || ''
  }
})

// Save wallets
document.getElementById('saveWallets').addEventListener('click', () => {
  const hackedKey = document.getElementById('hackedKey').value
  const safeWallet = document.getElementById('safeWallet').value
  const sponsorKey = document.getElementById('sponsorKey').value
  const sponsorWallet = document.getElementById('sponsorWallet').value

  if (!hackedKey || !safeWallet || !sponsorKey || !sponsorWallet) {
    showStatus('saveStatus', 'Please fill all fields', 'red')
    return
  }

  chrome.runtime.sendMessage({
    type: 'SAVE_WALLETS',
    hackedKey,
    safeWallet,
    sponsorKey,
    sponsorWallet,
  }, (response) => {
    if (response?.success) {
      showStatus('saveStatus', '✅ Wallets saved securely', 'green')
    }
  })
})

// Sign & Claim (EIP-712)
document.getElementById('signClaim').addEventListener('click', async () => {
  const airdropContract = document.getElementById('airdropContract').value
  if (!airdropContract) {
    showStatus('claimStatus', 'Enter airdrop contract address', 'red')
    return
  }

  const claimerAddress = CLAIMER_CONTRACTS[selectedChain]
  if (!claimerAddress) {
    showStatus('claimStatus', `SweepGuardClaimer not deployed on chain ${selectedChain}`, 'red')
    return
  }

  showStatus('claimStatus', '✍️ Check MetaMask for signature request...', 'blue')

  // Get wallets
  chrome.runtime.sendMessage({ type: 'GET_WALLETS' }, async (data) => {
    if (!data?.hackedKey || !data?.safeWallet) {
      showStatus('claimStatus', 'Configure wallets first', 'red')
      return
    }

    try {
      // Derive hacked wallet address from private key
      // In production, this would use ethers.js
      const hackedAddress = '0x...' // TODO: derive from private key

      // Build EIP-712 typed data
      const deadline = Math.floor(Date.now() / 1000) + 600
      const typedData = {
        types: {
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
        },
        primaryType: 'ClaimAirdrop',
        domain: {
          name: 'SweepGuard',
          version: '1',
          chainId: selectedChain,
          verifyingContract: claimerAddress,
        },
        message: {
          hackedWallet: hackedAddress,
          safeWallet: data.safeWallet,
          tokenAddress: '0x0000000000000000000000000000000000000000',
          airdropContract: airdropContract,
          claimData: '0x',
          amount: '0',
          deadline: deadline.toString(),
          nonce: '0',
        },
      }

      // Request MetaMask signature
      if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' })
        if (accounts.length === 0) {
          await window.ethereum.request({ method: 'eth_requestAccounts' })
        }

        const sig = await window.ethereum.request({
          method: 'eth_signTypedData_v4',
          params: [hackedAddress, JSON.stringify(typedData)],
        })

        signature = sig
        showStatus('claimStatus', '✅ Signature ready! Click "Execute Claim"', 'green')
        document.getElementById('executeClaim').classList.remove('hidden')
        document.getElementById('signClaim').classList.add('hidden')
      } else {
        showStatus('claimStatus', 'MetaMask not found', 'red')
      }
    } catch (err) {
      showStatus('claimStatus', `Error: ${err.message}`, 'red')
    }
  })
})

// Execute Claim
document.getElementById('executeClaim').addEventListener('click', async () => {
  if (!signature) {
    showStatus('claimStatus', 'Sign first', 'red')
    return
  }

  showStatus('claimStatus', '⏳ Submitting claim...', 'blue')

  // In production, this would call the SweepGuardClaimer contract
  // with the signature and sponsor wallet
  chrome.runtime.sendMessage({
    type: 'EXECUTE_SIGNED_CLAIM',
    signature,
    chainId: selectedChain,
  }, (response) => {
    if (response?.action === 'EXECUTE') {
      showStatus('claimStatus', '✅ Claim submitted! Check transaction.', 'green')
    } else {
      showStatus('claimStatus', '❌ Execution failed', 'red')
    }
  })
})

function showStatus(elementId, message, color) {
  const el = document.getElementById(elementId)
  el.textContent = message
  el.className = `status status-${color}`
  el.classList.remove('hidden')
}
