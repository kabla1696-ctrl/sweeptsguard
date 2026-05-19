// SweepGuard Extension - Popup Script
const API_BASE = 'https://sweeptsguard.vercel.app'

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'))
    tab.classList.add('active')
    document.getElementById(`${tab.dataset.tab}-tab`).classList.remove('hidden')
  })
})

// Toggle private key visibility
document.getElementById('toggle-key').addEventListener('click', () => {
  const input = document.getElementById('private-key')
  const btn = document.getElementById('toggle-key')
  if (input.type === 'password') {
    input.type = 'text'
    btn.textContent = 'Hide'
  } else {
    input.type = 'password'
    btn.textContent = 'Show'
  }
})

// Scan wallet
document.getElementById('scan-btn').addEventListener('click', async () => {
  const address = document.getElementById('scan-address').value.trim()
  if (!address || !address.startsWith('0x')) {
    showScanAlert('danger', 'Please enter a valid wallet address')
    return
  }

  const btn = document.getElementById('scan-btn')
  btn.textContent = '⏳ Scanning...'
  btn.disabled = true

  try {
    const res = await fetch(`${API_BASE}/api/scan?address=${address}`)
    const data = await res.json()

    document.getElementById('scan-result').classList.remove('hidden')

    if (data.delegation) {
      showScanAlert('danger', `🚨 EIP-7702 Delegation Detected!\nContract: ${data.delegation.slice(0, 10)}...`)
    } else {
      showScanAlert('success', '✅ No delegation detected')
    }

    if (data.totalValue > 0) {
      const existing = document.getElementById('scan-alerts').innerHTML
      document.getElementById('scan-alerts').innerHTML = existing +
        `<div class="alert alert-warning">💰 Assets found: $${data.totalValue.toLocaleString()}</div>`
    }
  } catch (err) {
    showScanAlert('danger', 'Scan failed. Please try again.')
  } finally {
    btn.textContent = '🔍 Scan All Chains'
    btn.disabled = false
  }
})

function showScanAlert(type, message) {
  const container = document.getElementById('scan-alerts')
  container.innerHTML = `<div class="alert alert-${type}">${message}</div>`
}

// Start protection
document.getElementById('protect-btn').addEventListener('click', async () => {
  const safeAddress = document.getElementById('safe-address').value.trim()
  const privateKey = document.getElementById('private-key').value.trim()
  const tgToken = document.getElementById('tg-token').value.trim()
  const tgChat = document.getElementById('tg-chat').value.trim()

  if (!safeAddress || !privateKey) {
    alert('Please enter safe wallet address and private key')
    return
  }

  // Save to storage
  await chrome.storage.local.set({
    safeAddress,
    privateKey,
    tgToken,
    tgChat,
    monitoring: true
  })

  // Start monitoring via background script
  chrome.runtime.sendMessage({
    action: 'startMonitoring',
    safeAddress,
    privateKey,
    tgToken,
    tgChat
  })

  document.getElementById('protect-status').classList.remove('hidden')
  document.getElementById('protect-btn').textContent = '✅ Protection Active'
  document.getElementById('protect-btn').disabled = true
})

// Claim airdrop
document.getElementById('claim-btn').addEventListener('click', async () => {
  const contract = document.getElementById('airdrop-contract').value.trim()
  const chainId = document.getElementById('airdrop-chain').value
  const recipient = document.getElementById('airdrop-recipient').value.trim()

  if (!contract || !recipient) {
    showClaimAlert('danger', 'Please fill all fields')
    return
  }

  const btn = document.getElementById('claim-btn')
  btn.textContent = '⏳ Claiming...'
  btn.disabled = true

  // Get private key from storage
  const { privateKey, safeAddress } = await chrome.storage.local.get(['privateKey', 'safeAddress'])

  if (!privateKey) {
    showClaimAlert('danger', 'Please set up protection first (Protect tab)')
    btn.textContent = '🎯 Claim with Gas Sponsor'
    btn.disabled = false
    return
  }

  try {
    const res = await fetch(`${API_BASE}/api/airdrop/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contractAddress: contract,
        chainId: parseInt(chainId),
        claimMethod: 'claimSimple',
        recipientAddress: recipient || safeAddress,
        privateKey
      })
    })
    const data = await res.json()

    if (data.results && data.results[0]?.success) {
      showClaimAlert('success', `✅ Claimed! TX: ${data.results[0].txHash?.slice(0, 12)}...`)
    } else {
      showClaimAlert('danger', `❌ Failed: ${data.error || data.results?.[0]?.error}`)
    }
  } catch (err) {
    showClaimAlert('danger', 'Claim failed. Please try again.')
  } finally {
    btn.textContent = '🎯 Claim with Gas Sponsor'
    btn.disabled = false
  }
})

function showClaimAlert(type, message) {
  const container = document.getElementById('claim-result')
  const alert = document.getElementById('claim-alert')
  container.classList.remove('hidden')
  alert.className = `alert alert-${type}`
  alert.textContent = message
}

// Load saved state
chrome.storage.local.get(['monitoring', 'safeAddress'], (data) => {
  if (data.monitoring) {
    document.getElementById('protect-status').classList.remove('hidden')
    document.getElementById('protect-btn').textContent = '✅ Protection Active'
    document.getElementById('protect-btn').disabled = true
  }
  if (data.safeAddress) {
    document.getElementById('safe-address').value = data.safeAddress
    document.getElementById('airdrop-recipient').value = data.safeAddress
  }
})
