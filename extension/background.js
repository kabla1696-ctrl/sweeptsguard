// SweepGuard Background v3.2 — Wallet Address Derivation
importScripts('https://cdn.ethers.io/lib/ethers-5.7.umd.min.js');

// Get wallets and derive address from private key
async function getWallets() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['wallets'], (result) => {
      const wallets = result.wallets || {};
      resolve(wallets);
    });
  });
}

// Derive address from private key
function getAddressFromKey(privateKey) {
  try {
    if (!privateKey || !privateKey.startsWith('0x')) return null;
    const wallet = new ethers.Wallet(privateKey);
    return wallet.address;
  } catch (e) {
    console.error('[SweepGuard] Key derivation error:', e.message);
    return null;
  }
}

// Badge updater
async function updateBadge() {
  try {
    const wallets = await getWallets();
    const hasWallets = wallets.hackedKey && wallets.safeWallet;
    chrome.action.setBadgeText({ text: hasWallets ? 'ON' : '' });
    chrome.action.setBadgeBackgroundColor({ 
      color: hasWallets ? '#10b981' : '#ef4444' 
    });
  } catch (e) {}
}

// Message handler
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_WALLETS') {
    getWallets().then(wallets => {
      if (wallets.hackedKey) {
        const address = getAddressFromKey(wallets.hackedKey);
        sendResponse({
          address: address,
          safeWallet: wallets.safeWallet || null,
          sponsorKey: wallets.sponsorKey || null,
          hackedKey: wallets.hackedKey
        });
      } else {
        sendResponse({ address: null, safeWallet: null });
      }
    }).catch(err => {
      sendResponse({ address: null, error: err.message });
    });
    return true; // async
  }
  
  if (msg.type === 'OPEN_POPUP') {
    chrome.action.openPopup().catch(() => {});
    sendResponse({ ok: true });
  }
  
  if (msg.type === 'CLAIM_PAGE') {
    chrome.action.setBadgeText({ text: '🎯' });
    chrome.action.setBadgeBackgroundColor({ color: '#8b5cf6' });
    sendResponse({ ok: true });
  }
  
  if (msg.type === 'WALLET_MODAL') {
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' });
    sendResponse({ ok: true });
  }
});

// On install
chrome.runtime.onInstalled.addListener(() => {
  updateBadge();
  console.log('[SweepGuard] Extension installed');
});

// On startup
chrome.runtime.onStartup.addListener(() => {
  updateBadge();
});

// Periodic badge update
setInterval(updateBadge, 5000);
