// SweepGuard Wallet — Popup Script
// Handles: password setup, wallet import, rescue, token management, history

const API_BASE = 'https://sweeptsguard.vercel.app';
let currentImportType = null;
let previewData = null;
let currentStatus = null;

// ── Visibility Toggle ─────────────────────────────────────────────────
function toggleVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🔒';
  } else {
    input.type = 'password';
    btn.textContent = '👁️';
  }
}

// ── Initialize ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const status = await sendMessage({ type: 'GET_STATUS' });
  currentStatus = status;

  if (!status.hasPassword) {
    showScreen('password-screen');
  } else if (!status.unlocked) {
    showScreen('unlock-screen');
  } else {
    showScreen('main-screen');
    initMainScreen(status);
  }

  // Handle Enter key on unlock screen
  document.getElementById('unlockPassword').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') unlockWallet();
  });

  // Handle Enter key on password screen
  document.getElementById('confirmPassword').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') setPassword();
  });
});

// ── Screen Management ─────────────────────────────────────────────────
function showScreen(id) {
  ['password-screen', 'unlock-screen', 'main-screen'].forEach(s => {
    document.getElementById(s).className = 'hidden';
  });
  document.getElementById(id).className = 'content';
}

// ── Password Setup ────────────────────────────────────────────────────
async function setPassword() {
  const password = document.getElementById('newPassword').value;
  const confirm = document.getElementById('confirmPassword').value;

  if (!password || password.length < 8) {
    alert('Password must be at least 8 characters');
    return;
  }
  if (password !== confirm) {
    alert('Passwords do not match');
    return;
  }

  const result = await sendMessage({ type: 'SET_PASSWORD', password });
  if (result.success) {
    showScreen('main-screen');
    const status = await sendMessage({ type: 'GET_STATUS' });
    currentStatus = status;
    initMainScreen(status);
  } else {
    alert(result.error || 'Failed to set password');
  }
}

// ── Unlock ────────────────────────────────────────────────────────────
async function unlockWallet() {
  const password = document.getElementById('unlockPassword').value;
  if (!password) return;

  const result = await sendMessage({ type: 'UNLOCK', password });
  if (result.success) {
    showScreen('main-screen');
    const status = await sendMessage({ type: 'GET_STATUS' });
    currentStatus = status;
    initMainScreen(status);
  } else {
    document.getElementById('unlock-error').className = '';
    document.getElementById('unlock-error-msg').textContent = result.error || 'Wrong password';
  }
}

// ── Lock ──────────────────────────────────────────────────────────────
async function lockWallet() {
  await sendMessage({ type: 'LOCK' });
  showScreen('unlock-screen');
  document.getElementById('unlockPassword').value = '';
}

// ── Main Screen Init ──────────────────────────────────────────────────
async function initMainScreen(status) {
  // Populate chain selector
  const select = document.getElementById('chainSelect');
  select.innerHTML = '';
  status.supportedChains.forEach(chain => {
    const option = document.createElement('option');
    option.value = '0x' + chain.id.toString(16);
    option.textContent = `${chain.active ? '✅' : '⏳'} ${chain.name} (${chain.symbol})`;
    if (!chain.active) option.disabled = true;
    if (chain.id === status.chainId) option.selected = true;
    select.appendChild(option);
  });

  // Set safe recipient
  if (status.safeRecipient) {
    document.getElementById('safeRecipient').value = status.safeRecipient;
  }

  // Update wallet cards
  updateWalletCards();
  updateChainStatus();
  loadHistory();

  // Save safe recipient on change
  document.getElementById('safeRecipient').addEventListener('change', (e) => {
    const addr = e.target.value.trim();
    if (addr && addr.startsWith('0x') && addr.length === 42) {
      chrome.runtime.sendMessage({ type: 'SET_SAFE_RECIPIENT', address: addr });
    }
  });
}

// ── Wallet Cards ──────────────────────────────────────────────────────
async function updateWalletCards() {
  const status = await sendMessage({ type: 'GET_STATUS' });

  const compromisedAddr = document.getElementById('compromised-addr');
  const compromisedStatus = document.getElementById('compromised-status');
  if (status.hasCompromised) {
    compromisedAddr.textContent = '✅ Imported';
    compromisedStatus.textContent = '✅';
    compromisedStatus.style.color = '#22c55e';
  } else {
    compromisedAddr.textContent = 'Not imported';
    compromisedStatus.textContent = '❌';
    compromisedStatus.style.color = '#ef4444';
  }

  const sponsorAddr = document.getElementById('sponsor-addr');
  const sponsorStatus = document.getElementById('sponsor-status');
  if (status.hasSponsor) {
    sponsorAddr.textContent = '✅ Imported';
    sponsorStatus.textContent = '✅';
    sponsorStatus.style.color = '#22c55e';
  } else {
    sponsorAddr.textContent = 'Not imported';
    sponsorStatus.textContent = '❌';
    sponsorStatus.style.color = '#ef4444';
  }
}

// ── Chain Status ──────────────────────────────────────────────────────
async function updateChainStatus() {
  const status = await sendMessage({ type: 'GET_STATUS' });
  const statusEl = document.getElementById('chain-status');
  const textEl = document.getElementById('chain-status-text');

  if (status.isActive) {
    statusEl.innerHTML = '<span class="dot"></span><span>SweepGuardRescuer deployed on ' +
      status.chainName + ': 0xDB67...400F</span>';
  } else {
    statusEl.innerHTML = '<span class="dot dot-off"></span><span>' +
      status.chainName + ' — Smart contract coming soon</span>';
  }
}

// ── Chain Change ──────────────────────────────────────────────────────
async function onChainChange() {
  const select = document.getElementById('chainSelect');
  const chainId = select.value;
  await sendMessage({ type: 'SET_CHAIN', chainId });
  updateChainStatus();
}

// ── Import Modal ──────────────────────────────────────────────────────
function showImportModal(type) {
  currentImportType = type;
  document.getElementById('import-modal').className = '';
  document.getElementById('import-title').textContent =
    type === 'compromised' ? 'Import Compromised Wallet' : 'Import Sponsor Wallet';
  document.getElementById('import-icon').textContent =
    type === 'compromised' ? '⚠️' : '⛽';
  document.getElementById('importPrivateKey').value = '';
  document.getElementById('importPrivateKey').focus();
}

function closeImportModal() {
  document.getElementById('import-modal').className = 'hidden';
  currentImportType = null;
}

async function confirmImport() {
  const privateKey = document.getElementById('importPrivateKey').value.trim();
  if (!privateKey || !privateKey.startsWith('0x')) {
    alert('Invalid private key format');
    return;
  }

  const type = currentImportType;
  closeImportModal();

  const result = await sendMessage({
    type: type === 'compromised' ? 'IMPORT_COMPROMISED_WALLET' : 'IMPORT_SPONSOR_WALLET',
    privateKey,
  });

  if (result.success) {
    updateWalletCards();
  } else {
    alert(result.error || 'Import failed');
  }
}

// ── Tab Switching ─────────────────────────────────────────────────────
function switchTab(tab) {
  ['rescue', 'tokens', 'history'].forEach(t => {
    document.getElementById(`${t}-tab`).className = t === tab ? 'content' : 'hidden';
    document.getElementById(`tab-${t}`).className = t === tab ? 'tab active' : 'tab';
  });

  if (tab === 'tokens') refreshBalances();
  if (tab === 'history') loadHistory();
}

// ── Preview Rescue ────────────────────────────────────────────────────
async function previewRescue() {
  const contractAddress = document.getElementById('contractAddress').value.trim();
  const safeRecipient = document.getElementById('safeRecipient').value.trim();
  const chainId = document.getElementById('chainSelect').value;
  const tokenAmount = document.getElementById('tokenAmount').value.trim();
  const claimData = document.getElementById('claimData').value.trim();
  const merkleProof = document.getElementById('merkleProof').value.trim();

  if (!contractAddress) {
    alert('Contract address is required');
    return;
  }
  if (!safeRecipient || !safeRecipient.startsWith('0x')) {
    alert('Safe recipient address is required');
    return;
  }

  // Get compromised wallet address
  const status = await sendMessage({ type: 'GET_STATUS' });
  if (!status.hasCompromised) {
    alert('Please import compromised wallet first');
    return;
  }

  // Ask for hacked wallet address
  const hackedAddress = prompt('Enter the HACKED wallet address (0x...):');
  if (!hackedAddress || !hackedAddress.startsWith('0x')) {
    alert('Hacked wallet address required');
    return;
  }

  // Save safe recipient
  chrome.runtime.sendMessage({ type: 'SET_SAFE_RECIPIENT', address: safeRecipient });

  // Show preview section
  document.getElementById('preview-results').className = '';
  document.getElementById('preview-loading').className = '';
  document.getElementById('preview-content').className = 'hidden';
  document.getElementById('preview-error').className = 'hidden';

  try {
    const chainIdNum = parseInt(chainId, 16);
    const result = await sendMessage({
      type: 'PREVIEW_RESCUE',
      params: {
        contractAddress,
        chainId: chainIdNum,
        safeWallet: safeRecipient,
        walletAddress: hackedAddress,
        tokenAmount: tokenAmount || undefined,
        claimData: claimData || undefined,
        merkleProof: merkleProof || undefined,
      },
    });

    document.getElementById('preview-loading').className = 'hidden';

    if (result.error) {
      document.getElementById('preview-error').className = '';
      document.getElementById('error-message').textContent = result.error;
      return;
    }

    // Show preview content
    document.getElementById('preview-content').className = '';

    // Token info
    document.getElementById('token-name').textContent =
      `${result.tokenSymbol || 'Unknown'} (${(result.tokenAddress || '').slice(0, 10)}...)`;
    document.getElementById('claimable-amount').textContent =
      `${result.claimableAmount || '?'} ${result.tokenSymbol || ''}`;
    document.getElementById('fee-amount').textContent =
      `${result.platformFeeAmount || '?'} ${result.tokenSymbol || ''}`;
    document.getElementById('safe-amount').textContent =
      `${result.safeWalletAmount || '?'} ${result.tokenSymbol || ''}`;

    // Eligibility
    const badge = document.getElementById('eligible-badge');
    if (result.alreadyClaimed) {
      badge.className = 'badge badge-red';
      badge.textContent = '❌ Already Claimed';
    } else if (result.eligible === true) {
      badge.className = 'badge badge-green';
      badge.textContent = '✅ Eligible';
    } else if (result.eligible === null) {
      badge.className = 'badge badge-yellow';
      badge.textContent = '⚠️ Unknown';
    } else {
      badge.className = 'badge badge-red';
      badge.textContent = '❌ Not Eligible';
    }

    // Gas info
    document.getElementById('sponsor-balance').textContent =
      `${result.sponsorBalance || '?'} ${result.sponsorGasToken || 'ETH'}`;
    document.getElementById('gas-cost').textContent =
      `~${result.estimatedGasCost || '?'} ${result.sponsorGasToken || 'ETH'}`;
    const gasBadge = document.getElementById('gas-badge');
    if (result.sponsorHasGas) {
      gasBadge.className = 'badge badge-green';
      gasBadge.textContent = '✅ Sufficient';
    } else {
      gasBadge.className = 'badge badge-red';
      gasBadge.textContent = '❌ Insufficient';
    }

    // Execution info
    const execInfo = document.getElementById('execution-info');
    execInfo.textContent = result.executionDescription || 'Standard claim flow';
    execInfo.className = `info-box ${result.riskLevel === 'high' ? 'warning' : 'info'}`;

    // Contract warnings
    const warningsDiv = document.getElementById('contract-warnings');
    warningsDiv.innerHTML = '';
    if (result.contractWarnings?.length) {
      result.contractWarnings.forEach(w => {
        const div = document.createElement('div');
        div.className = 'info-box warning';
        div.textContent = w;
        warningsDiv.appendChild(div);
      });
    }

    // Enable/disable claim button
    const claimBtn = document.getElementById('claimBtn');
    if (result.alreadyClaimed || result.eligible === false) {
      claimBtn.disabled = true;
      claimBtn.textContent = '❌ Cannot Claim';
    } else if (!result.sponsorHasGas) {
      claimBtn.disabled = true;
      claimBtn.textContent = '❌ Insufficient Gas';
    } else {
      claimBtn.disabled = false;
      claimBtn.textContent = '🚀 Rescue Funds';
    }

    // Store preview data
    previewData = {
      contractAddress,
      chainId: chainIdNum,
      safeWallet: safeRecipient,
      walletAddress: hackedAddress,
      claimableRaw: result.claimableRaw,
      tokenAddress: result.tokenAddress,
      tokenAmount: tokenAmount || undefined,
      claimData: claimData || undefined,
      merkleProof: merkleProof || undefined,
    };

  } catch (err) {
    document.getElementById('preview-loading').className = 'hidden';
    document.getElementById('preview-error').className = '';
    document.getElementById('error-message').textContent = `Error: ${err.message}`;
  }
}

// ── Cancel Preview ────────────────────────────────────────────────────
function cancelPreview() {
  document.getElementById('preview-results').className = 'hidden';
  document.getElementById('rescue-result').className = 'hidden';
  previewData = null;
}

// ── Execute Rescue ────────────────────────────────────────────────────
async function executeRescue() {
  if (!previewData) {
    alert('No preview data');
    return;
  }

  document.getElementById('rescue-result').className = '';
  document.getElementById('result-loading').className = '';
  document.getElementById('result-success').className = 'hidden';
  document.getElementById('result-error').className = 'hidden';

  try {
    const result = await sendMessage({
      type: 'EXECUTE_RESCUE',
      params: previewData,
    });

    document.getElementById('result-loading').className = 'hidden';

    if (result.error) {
      document.getElementById('result-error').className = '';
      document.getElementById('result-error-msg').textContent = result.error;
      return;
    }

    document.getElementById('result-success').className = '';
    document.getElementById('result-tx').textContent =
      result.claimTxHash || result.bundleHash || '—';
    document.getElementById('result-block').textContent =
      result.blockNumber || '—';
    document.getElementById('result-method').textContent =
      result.executionMethod || '—';

    loadHistory();
  } catch (err) {
    document.getElementById('result-loading').className = 'hidden';
    document.getElementById('result-error').className = '';
    document.getElementById('result-error-msg').textContent = err.message;
  }
}

// ── Reset Rescue ──────────────────────────────────────────────────────
function resetRescue() {
  document.getElementById('contractAddress').value = '';
  document.getElementById('tokenAmount').value = '';
  document.getElementById('claimData').value = '';
  document.getElementById('merkleProof').value = '';
  document.getElementById('preview-results').className = 'hidden';
  document.getElementById('rescue-result').className = 'hidden';
  previewData = null;
}

// ── Rescue Tokens ─────────────────────────────────────────────────────
async function rescueTokens() {
  const tokenAddress = document.getElementById('rescueTokenAddress').value.trim();
  if (!tokenAddress || !tokenAddress.startsWith('0x')) {
    alert('Enter a valid token contract address');
    return;
  }

  const status = await sendMessage({ type: 'GET_STATUS' });
  if (!status.hasCompromised || !status.hasSponsor) {
    alert('Import both compromised and sponsor wallets first');
    return;
  }
  if (!status.safeRecipient) {
    alert('Set a safe recipient address first');
    return;
  }

  if (!confirm(`Rescue ERC-20 tokens from compromised wallet to ${status.safeRecipient}?`)) {
    return;
  }

  const result = await sendMessage({
    type: 'RESCUE_TOKENS',
    params: { tokenAddress },
  });

  if (result.error) {
    alert(`Error: ${result.error}`);
  } else {
    alert(`✅ Tokens rescued! TX: ${result.txHash || 'Check history'}`);
    loadHistory();
  }
}

// ── Rescue Native ─────────────────────────────────────────────────────
async function rescueNative() {
  const status = await sendMessage({ type: 'GET_STATUS' });
  if (!status.hasCompromised || !status.hasSponsor) {
    alert('Import both compromised and sponsor wallets first');
    return;
  }
  if (!status.safeRecipient) {
    alert('Set a safe recipient address first');
    return;
  }

  if (!confirm(`Rescue native ${status.chainSymbol} from compromised wallet to ${status.safeRecipient}?`)) {
    return;
  }

  const result = await sendMessage({ type: 'RESCUE_NATIVE' });

  if (result.error) {
    alert(`Error: ${result.error}`);
  } else {
    alert(`✅ Native tokens rescued! TX: ${result.txHash || 'Check history'}`);
    loadHistory();
  }
}

// ── Refresh Balances ──────────────────────────────────────────────────
async function refreshBalances() {
  document.getElementById('balances-loading').className = 'loading';
  document.getElementById('balances-content').className = 'hidden';

  try {
    const balances = await sendMessage({ type: 'GET_BALANCES' });
    const status = await sendMessage({ type: 'GET_STATUS' });
    const content = document.getElementById('balances-content');
    content.innerHTML = '';

    if (balances.compromised) {
      const ethValue = parseInt(balances.compromised, 16) / 1e18;
      content.innerHTML += `
        <div class="card">
          <div class="card-header">
            <span class="card-title">⚠️ Compromised</span>
            <span class="card-value">${ethValue.toFixed(6)} ${status.chainSymbol}</span>
          </div>
        </div>`;
    }

    if (balances.sponsor) {
      const ethValue = parseInt(balances.sponsor, 16) / 1e18;
      content.innerHTML += `
        <div class="card">
          <div class="card-header">
            <span class="card-title">⛽ Sponsor</span>
            <span class="card-value">${ethValue.toFixed(6)} ${status.chainSymbol}</span>
          </div>
        </div>`;
    }

    if (!balances.compromised && !balances.sponsor) {
      content.innerHTML = '<div class="info-box info">Import wallets to see balances</div>';
    }

    document.getElementById('balances-loading').className = 'hidden';
    content.className = '';
  } catch (err) {
    document.getElementById('balances-loading').className = 'hidden';
    document.getElementById('balances-content').className = '';
    document.getElementById('balances-content').innerHTML =
      `<div class="info-box danger">Error: ${err.message}</div>`;
  }
}

// ── Load History ──────────────────────────────────────────────────────
async function loadHistory() {
  const history = await sendMessage({ type: 'GET_TRANSACTION_HISTORY' });
  const content = document.getElementById('history-content');

  if (!history || history.length === 0) {
    content.innerHTML = '<div class="info-box info">No transactions yet</div>';
    return;
  }

  content.innerHTML = history.map(tx => `
    <div class="history-item">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span style="color:rgba(255,255,255,0.6);">${tx.type === 'rescue' ? '🛡️ Rescue' : '🪙 Token'}</span>
        <span class="history-time">${new Date(tx.timestamp).toLocaleString()}</span>
      </div>
      <div class="history-hash">${tx.txHash || 'Pending'}</div>
      <div style="color:rgba(255,255,255,0.3);margin-top:2px;">${tx.status || 'success'}</div>
    </div>
  `).join('');
}

// ── Message Helper ────────────────────────────────────────────────────
function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      resolve(response || {});
    });
  });
}
