// SweepGuard Extension - Background Service Worker
// Monitors for airdrop claim pages and handles background tasks

const API_BASE = 'https://sweeptsguard.vercel.app';
const FEE_WALLET = '0x7A3725154a2E6468F9549334394802e9E2822C2A';

// Known airdrop claim page patterns
const CLAIM_PATTERNS = [
  'claim',
  'airdrop',
  'merkle',
  'distribution',
  'rewards',
  'vesting',
  'unlock'
];

// Known claim contract function signatures
const CLAIM_SIGNATURES = {
  '0x2e7ba6ef': 'claim()',
  '0x379607f5': 'claim(uint256)',
  '0x48c54b9d': 'claim(address)',
  '0xa578a715': 'claim(address,uint256,bytes32[])',
  '0x4e4244c9': 'claimTo(address)',
};

// Monitor tab updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    await checkPage(tabId, tab.url, tab.title);
  }
});

// Monitor tab activation
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (tab.url) {
    await checkPage(tab.id, tab.url, tab.title);
  }
});

// Check if page is a claim page
async function checkPage(tabId, url, title) {
  const lowerUrl = url.toLowerCase();
  const lowerTitle = (title || '').toLowerCase();
  
  const isClaimPage = CLAIM_PATTERNS.some(pattern => 
    lowerUrl.includes(pattern) || lowerTitle.includes(pattern)
  );
  
  if (isClaimPage) {
    // Update badge
    chrome.action.setBadgeText({ text: '!', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#10b981', tabId });
    
    // Store detection
    await chrome.storage.local.set({
      [`claim_${tabId}`]: {
        url,
        title,
        detected: Date.now(),
        contract: await detectContract(tabId)
      }
    });
    
    // Show notification if enabled
    const settings = await chrome.storage.local.get(['settings']);
    if (settings.settings?.notifications !== false) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'SweepGuard - Claim Page Detected!',
        message: `Found: ${title || url}`
      });
    }
  } else {
    chrome.action.setBadgeText({ text: '', tabId });
  }
}

// Detect contract address from page
async function detectContract(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const text = document.body.innerText;
        const addressRegex = /0x[a-fA-F0-9]{40}/g;
        const addresses = text.match(addressRegex) || [];
        return addresses[0] || null;
      }
    });
    
    return results?.[0]?.result || null;
  } catch (e) {
    return null;
  }
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CLAIM_DETECTED') {
    handleClaimDetected(message.data, sender.tab?.id);
    sendResponse({ success: true });
  }
  
  if (message.type === 'GET_CONFIG') {
    getConfig().then(sendResponse);
    return true; // Keep message channel open for async response
  }
});

// Handle claim detection from content script
async function handleClaimDetected(data, tabId) {
  await chrome.storage.local.set({
    [`claim_${tabId}`]: {
      ...data,
      detected: Date.now()
    }
  });
  
  chrome.action.setBadgeText({ text: '!', tabId });
  chrome.action.setBadgeBackgroundColor({ color: '#10b981', tabId });
}

// Get saved configuration
async function getConfig() {
  const result = await chrome.storage.local.get(['wallets', 'settings']);
  return {
    wallets: result.wallets || {},
    settings: result.settings || {}
  };
}

// Handle extension install/update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Set default settings
    chrome.storage.local.set({
      settings: {
        autoDetect: true,
        stealth: true,
        notifications: true,
        autoClaim: false,
        flashbots: true
      }
    });
    
    // Open welcome page
    chrome.tabs.create({
      url: 'https://sweeptsguard.vercel.app'
    });
  }
});

// Clean up old detections
setInterval(async () => {
  const data = await chrome.storage.local.get(null);
  const now = Date.now();
  const toRemove = [];
  
  for (const key of Object.keys(data)) {
    if (key.startsWith('claim_') && data[key].detected) {
      // Remove detections older than 1 hour
      if (now - data[key].detected > 3600000) {
        toRemove.push(key);
      }
    }
  }
  
  if (toRemove.length > 0) {
    await chrome.storage.local.remove(toRemove);
  }
}, 300000); // Check every 5 minutes
