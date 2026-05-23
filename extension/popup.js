// SweepGuard v5.0 — Popup Script
// EIP-7702 Antidrain-style rescue

import {
  SWEEPGUARD_RESCUER, CHAIN_NAMES, EXPLORER_URLS,
  PRIVATE_SEQUENCER_CHAINS, RPC_URLS
} from './constants.js'

let selectedChain = 8453 // Default Base

// ═══════════════════════════════════════════════════════
// TAB SWITCHING
// ═══════════════════════════════════════════════════════

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
    document.querySelectorAll('.content').forEach(c => c.classList.add('hidden'))
    tab.classList.add('active')
    document.getElementById(tab.dataset.tab).classList.remove('hidden')
  })
})

// ═══════════════════════════════════════════════════════
// CHAIN SELECTOR
// ═══════════════════════════════════════════════════════

const chainGrid = document.getElementById('chainGrid')
const chains = Object.entries(CHAIN_NAMES).map(([id, name]) => ({
  id: parseInt(id),
  name,
  deployed: !!SWEEPGUARD_RESCUER[parseInt(id)],
}))

chainGrid.innerHTML = chains.map(chain => `
  <div class="chain-btn ${chain.id === selectedChain ? 'active' : ''} ${!chain.deployed ? 'disabled' : ''}"
       data-chain="${chain.id}"
       title="${chain.deployed ? '✅ Contract deployed' : '⏳ Coming soon'}">
    ${chain.name} ${chain.deployed ? '✅' : ''}
  </div>
`).join('')

chainGrid.addEventListener('click', (e) => {
  const btn = e.target.closest('.chain-btn')
  if (!btn || btn.classList.contains('disabled')) return

  selectedChain = parseInt(btn.dataset.chain)
  chainGrid.querySelectorAll('.chain-btn').forEach(b => b.classList.remove('active'))
  btn.classList.add('active')
  updateStatus()
})

// ═══════════════════════════════════════════════════════
// WALLET MANAGEMENT
// BUG #7 FIX: Never show decrypted private keys in input fields
// ═══════════════════════════════════════════════════════

async function loadWallets() {
  const response = await chrome.runtime.sendMessage({ type: 'GET_WALLETS' })
  if (response) {
    // BUG #7 FIX: Show status only, never any representation of the key
    document.getElementById('hackedKey').value = response.hasHackedKey ? '(saved)' : ''
    document.getElementById('safeWallet').value = response.safeWallet || ''
    document.getElementById('sponsorKey').value = response.hasSponsorKey ? '(saved)' : ''

    if (response.hackedAddress) {
      document.getElementById('savedHacked').textContent = response.hackedAddress
      document.getElementById('savedSafe').textContent = response.safeWallet || '--'
      document.getElementById('savedInfo').classList.remove('hidden')
    }
  }
}

document.getElementById('saveWallets').addEventListener('click', async () => {
  const hackedKey = document.getElementById('hackedKey').value.trim()
  const safeWallet = document.getElementById('safeWallet').value.trim()
  const sponsorKey = document.getElementById('sponsorKey').value.trim()

  // Skip if user didn't enter new keys (just placeholders)
  if (hackedKey === '(saved)' || sponsorKey === '(saved)') {
    showStatus('saveStatus', 'Enter actual private keys if you want to change them', 'yellow')
    return
  }

  if (!hackedKey || !safeWallet || !sponsorKey) {
    showStatus('saveStatus', 'Please fill all fields', 'red')
    return
  }

  // Validate addresses
  try {
    const { ethers } = await import('./ethers.min.js')
    ethers.getAddress(safeWallet)
  } catch {
    showStatus('saveStatus', 'Invalid safe wallet address', 'red')
    return
  }

  const response = await chrome.runtime.sendMessage({
    type: 'SAVE_WALLETS',
    wallets: { hackedKey, safeWallet, sponsorKey },
  })

  if (response?.error) {
    showStatus('saveStatus', `❌ ${response.error}`, 'red')
  } else if (response?.success) {
    showStatus('saveStatus', '✅ Wallets saved & encrypted', 'green')
    loadWallets()
  }
})

document.getElementById('clearWallets').addEventListener('click', async () => {
  const confirmed = confirm('Delete all saved wallets? This cannot be undone.')
  if (!confirmed) return

  const response = await chrome.runtime.sendMessage({ type: 'CLEAR_WALLETS' })
  if (response?.success) {
    document.getElementById('hackedKey').value = ''
    document.getElementById('safeWallet').value = ''
    document.getElementById('sponsorKey').value = ''
    document.getElementById('savedInfo').classList.add('hidden')
    showStatus('saveStatus', '🗑️ All wallets cleared', 'yellow')
  }
})

// ═══════════════════════════════════════════════════════
// RESCUE FUNCTIONALITY
// ═══════════════════════════════════════════════════════

document.getElementById('previewBtn').addEventListener('click', async () => {
  const contract = document.getElementById('airdropContract').value.trim()
  if (!contract) {
    showRescueStatus('Enter airdrop contract address', 'red')
    return
  }

  // Validate contract address
  try {
    const { ethers } = await import('./ethers.min.js')
    ethers.getAddress(contract)
  } catch {
    showRescueStatus('Invalid contract address', 'red')
    return
  }

  showRescueStatus('🔍 Checking contract...', 'blue')

  try {
    const wallets = await chrome.runtime.sendMessage({ type: 'GET_WALLETS' })
    if (!wallets?.hackedAddress) {
      showRescueStatus('Configure wallets first', 'red')
      return
    }

    const rpcUrl = RPC_URLS[selectedChain]
    if (!rpcUrl) {
      showRescueStatus(`No RPC for chain ${selectedChain}`, 'red')
      return
    }

    const res = await fetch('https://sweeptsguard.vercel.app/api/airdrop/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'preview',
        contractAddress: contract,
        chainId: selectedChain,
        safeWallet: wallets.safeWallet,
        walletAddress: wallets.hackedAddress,
        sponsorAddress: wallets.sponsorWallet,
      }),
    })
    const data = await res.json()

    if (data.error) {
      showRescueStatus(data.error, 'red')
      return
    }

    if (data.claimableAmount && data.claimableAmount !== '0') {
      document.getElementById('safeAmount').textContent = `${data.safeWalletAmount} ${data.tokenSymbol}`
      document.getElementById('feeAmount').textContent = `${data.platformFeeAmount} ${data.tokenSymbol}`
      document.getElementById('splitPreview').classList.remove('hidden')
    }

    showRescueStatus(
      `✅ ${data.tokenSymbol}: ${data.claimableAmount} | Gas: ${data.estimatedGasCost} ${data.sponsorGasToken}`,
      data.sponsorHasGas ? 'green' : 'yellow'
    )
  } catch (err) {
    showRescueStatus(`Preview failed: ${err.message}`, 'red')
  }
})

document.getElementById('rescueBtn').addEventListener('click', async () => {
  const contract = document.getElementById('airdropContract').value.trim()
  if (!contract) {
    showRescueStatus('Enter airdrop contract address', 'red')
    return
  }

  // Validate contract address
  try {
    const { ethers } = await import('./ethers.min.js')
    ethers.getAddress(contract)
  } catch {
    showRescueStatus('Invalid contract address', 'red')
    return
  }

  // BUG #7 FIX: Use GET_WALLETS_RAW to get actual keys for rescue
  const wallets = await chrome.runtime.sendMessage({ type: 'GET_WALLETS_RAW' })
  if (!wallets?.hackedKey || !wallets?.sponsorKey || !wallets?.safeWallet) {
    showRescueStatus('Configure wallets first (hacked key, safe wallet, sponsor key)', 'red')
    return
  }

  // Check if contract deployed on this chain
  if (!SWEEPGUARD_RESCUER[selectedChain]) {
    showRescueStatus(`SweepGuardRescuer not deployed on ${CHAIN_NAMES[selectedChain]}. Coming soon!`, 'red')
    return
  }

  // Confirm
  const confirmed = confirm(
    `🚀 EIP-7702 Rescue\n\n` +
    `Chain: ${CHAIN_NAMES[selectedChain]}\n` +
    `Contract: ${contract.slice(0, 20)}...\n` +
    `Safe: ${wallets.safeWallet.slice(0, 20)}...\n\n` +
    `The compromised wallet's private key will sign an EIP-7702 authorization LOCALLY. ` +
    `Key is NEVER sent to any server.\n\n` +
    `Proceed?`
  )
  if (!confirmed) return

  // Show progress
  document.getElementById('rescueProgress').classList.remove('hidden')
  document.getElementById('rescueResult').classList.add('hidden')
  document.getElementById('rescueBtn').disabled = true

  try {
    updateProgress('Signing EIP-7702 authorization...')

    const result = await chrome.runtime.sendMessage({
      type: 'EXECUTE_RESCUE',
      params: {
        chainId: selectedChain,
        hackedKey: wallets.hackedKey,
        safeWallet: wallets.safeWallet,
        sponsorKey: wallets.sponsorKey,
        airdropContract: contract,
        tokenAddress: document.getElementById('tokenAddress').value.trim() || '',
        hackedAddress: wallets.hackedAddress,
      },
    })

    if (result?.error) {
      showRescueStatus(`❌ ${result.error}`, 'red')
    } else if (result?.success) {
      document.getElementById('rescueResultText').innerHTML =
        `✅ <strong>Rescue successful!</strong><br>` +
        `TX: ${result.txHash.slice(0, 20)}...`

      const explorer = result.explorer || 'https://basescan.org'
      const link = document.getElementById('rescueTxLink')
      link.href = `${explorer}/tx/${result.txHash}`
      link.textContent = `View on Explorer: ${result.txHash.slice(0, 30)}...`

      document.getElementById('rescueResult').classList.remove('hidden')
      showRescueStatus('🎉 Airdrop rescued! 80% → safe wallet, 20% → platform fee.', 'green')
    }
  } catch (err) {
    showRescueStatus(`❌ ${err.message}`, 'red')
  } finally {
    document.getElementById('rescueProgress').classList.add('hidden')
    document.getElementById('rescueBtn').disabled = false
  }
})

// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════

function showStatus(elementId, message, color) {
  const el = document.getElementById(elementId)
  el.textContent = message
  el.className = `status status-${color}`
  el.classList.remove('hidden')
}

function showRescueStatus(message, color) {
  showStatus('rescueStatus', message, color)
}

function updateProgress(text) {
  document.getElementById('rescueProgressText').textContent = text
}

function updateStatus() {
  const chain = CHAIN_NAMES[selectedChain]
  const deployed = !!SWEEPGUARD_RESCUER[selectedChain]
  if (!deployed) {
    showRescueStatus(`⏳ ${chain}: Contract coming soon`, 'yellow')
  }
}

// ═══════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════

loadWallets()
updateStatus()
