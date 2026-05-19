// SweepGuard Extension - Background Service Worker v2.2
// Handles messages from content scripts and manages state

const API_BASE = 'https://sweeptsguard.vercel.app';
const FEE_WALLET = '0x7A3725154a2E6468F9549334394802e9E2822C2A';

// Store page detections
const pageDetections = new Map();

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[SweepGuard Background] Message:', message.type);
  
  switch (message.type) {
    case 'CLAIM_PAGE_DETECTED':
      handleClaimPageDetected(message.data, sender.tab?.id);
      sendResponse({ success: true });
      break;
      
    case 'WALLET_MODAL_DETECTED':
      handleWalletModalDetected(message.data, sender.tab?.id);
      sendResponse({ success: true });
      break;
      
    case 'WALLET_CONNECT_REQUEST':
      handleWalletConnectRequest(message.data, sender.tab?.id);
      sendResponse({ success: true });
      break;
      
    case 'TRANSACTION_DETECTED':
      handleTransactionDetected(message.data, sender.tab?.id);
      sendResponse({ success: true });
      break;
      
    case 'GET_PAGE_INFO':
      const info = pageDetections.get(sender.tab?.id) || {};
      sendResponse(info);
      break;
      
    case 'GET_WALLETS':
      // Return saved wallets to injected provider
      chrome.storage.local.get(['wallets'], (result) => {
        sendResponse(result.wallets || {});
      });
      return true; // Keep message channel open for async response
      
    case 'OPEN_POPUP':
      // Open popup programmatically
      chrome.action.openPopup();
      sendResponse({ success: true });
      break;
      
    case 'PROVIDER_INJECTED':
      console.log('[SweepGuard Background] Provider injected on:', message.data?.url);
      sendResponse({ success: true });
      break;
      
    default:
      sendResponse({ error: 'Unknown message type' });
  }
  
  return true;
});

// Handle claim page detection
function handleClaimPageDetected(data, tabId) {
  console.log('[SweepGuard Background] Claim page detected:', data.url);
  
  pageDetections.set(tabId, {
    ...data,
    isClaimPage: true,
    detectedAt: Date.now()
  });
  
  // Update badge
  chrome.action.setBadgeText({ text: '🎯', tabId });
  chrome.action.setBadgeBackgroundColor({ color: '#10b981', tabId });
  
  // Show notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'SweepGuard - Claim Page Detected!',
    message: `Found: ${data.title || data.url}`
  });
}

// Handle wallet modal detection
function handleWalletModalDetected(data, tabId) {
  console.log('[SweepGuard Background] Wallet modal detected:', data.url);
  
  const existing = pageDetections.get(tabId) || {};
  pageDetections.set(tabId, {
    ...existing,
    hasWalletModal: true,
    walletModalDetectedAt: Date.now()
  });
  
  // Update badge
  chrome.action.setBadgeText({ text: '🔗', tabId });
  chrome.action.setBadgeBackgroundColor({ color: '#8b5cf6', tabId });
}

// Handle wallet connect request
function handleWalletConnectRequest(data, tabId) {
  console.log('[SweepGuard Background] Wallet connect request:', data.url);
  
  const existing = pageDetections.get(tabId) || {};
  pageDetections.set(tabId, {
    ...existing,
    walletConnectRequested: true,
    walletConnectAt: Date.now()
  });
}

// Handle transaction detection
function handleTransactionDetected(data, tabId) {
  console.log('[SweepGuard Background] Transaction detected:', data);
  
  const claimSelectors = ['0x2e7ba6ef', '0x379607f5', '0x48c54b9d', '0xa578a715'];
  if (data.selector && claimSelectors.includes(data.selector)) {
    console.log('[SweepGuard Background] Claim transaction detected!');
    
    chrome.action.setBadgeText({ text: '✅', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#10b981', tabId });
  }
}

// Monitor tab updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    pageDetections.delete(tabId);
    chrome.action.setBadgeText({ text: '', tabId });
  }
});

// Clean up old detections periodically
setInterval(() => {
  const now = Date.now();
  const maxAge = 3600000; // 1 hour
  
  for (const [tabId, data] of pageDetections.entries()) {
    if (data.detectedAt && now - data.detectedAt > maxAge) {
      pageDetections.delete(tabId);
    }
  }
}, 300000);

// Extension install handler
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
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

console.log('[SweepGuard Background] Service worker loaded v2.2');
