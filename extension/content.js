// SweepGuard Extension - Content Script
// Runs on every page to detect claim pages and wallet connections

(function() {
  'use strict';
  
  // Prevent multiple injections
  if (window.__sweeptsguard_loaded) return;
  window.__sweeptsguard_loaded = true;
  
  console.log('[SweepGuard] Content script loaded on:', window.location.href);
  
  // Claim page detection patterns
  const CLAIM_PATTERNS = [
    'claim', 'airdrop', 'merkle', 'distribution', 'rewards',
    'vesting', 'unlock', 'token-claim', 'airdrop-claim'
  ];
  
  // Known claim function selectors
  const CLAIM_SELECTORS = [
    'button[class*="claim"]', 'button[class*="Claim"]',
    '[id*="claim"]', '[class*="airdrop"]',
    'a[href*="claim"]', 'button:contains("Claim")',
    'button:contains("claim")', 'button:contains("Mint")',
    'button:contains("mint")', 'button:contains("Collect")'
  ];
  
  // Detect if this is a claim page
  function isClaimPage() {
    const url = window.location.href.toLowerCase();
    const title = document.title.toLowerCase();
    const bodyText = document.body?.innerText?.toLowerCase() || '';
    
    return CLAIM_PATTERNS.some(pattern => 
      url.includes(pattern) || 
      title.includes(pattern) || 
      bodyText.includes(pattern)
    );
  }
  
  // Find claim button on page
  function findClaimButton() {
    for (const selector of CLAIM_SELECTORS) {
      try {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          const text = el.innerText?.toLowerCase() || '';
          if (text.includes('claim') || text.includes('airdrop') || 
              text.includes('mint') || text.includes('collect')) {
            return el;
          }
        }
      } catch (e) {}
    }
    return null;
  }
  
  // Find contract address on page
  function findContractAddress() {
    const text = document.body?.innerText || '';
    const addressRegex = /0x[a-fA-F0-9]{40}/g;
    const addresses = text.match(addressRegex) || [];
    return addresses[0] || null;
  }
  
  // Detect wallet connect button
  function findWalletConnect() {
    const selectors = [
      'button[class*="connect"]', 'button[class*="Connect"]',
      '[id*="connect"]', '[class*="wallet"]',
      'button:contains("Connect")', 'button:contains("connect")',
      'button:contains("Wallet")', 'button:contains("wallet")',
      'button:contains("MetaMask")', 'button:contains("metamask")',
      'button:contains("Connect Wallet")', '[data-testid*="connect"]',
      '[data-testid*="wallet"]', '.web3-modal', '.wallet-modal',
      '#web3-modal', '#wallet-modal', '[class*="web3"]'
    ];
    
    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          const text = el.innerText?.toLowerCase() || '';
          const style = window.getComputedStyle(el);
          
          // Check if visible
          if (style.display !== 'none' && style.visibility !== 'hidden') {
            if (text.includes('connect') || text.includes('wallet') || 
                text.includes('metamask') || text.includes('web3')) {
              return el;
            }
          }
        }
      } catch (e) {}
    }
    return null;
  }
  
  // Monitor for wallet connect modal
  function watchForWalletModal() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node;
            const text = element.innerText?.toLowerCase() || '';
            
            // Check if this is a wallet modal
            if (text.includes('connect wallet') || text.includes('choose wallet') ||
                text.includes('select wallet') || text.includes('metamask') ||
                text.includes('walletconnect') || text.includes('coinbase')) {
              
              console.log('[SweepGuard] Wallet modal detected!');
              notifyBackground('WALLET_MODAL_DETECTED', {
                url: window.location.href,
                title: document.title
              });
              
              // Add SweepGuard indicator
              addSweepGuardIndicator();
            }
          }
        }
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  // Add SweepGuard floating indicator
  function addSweepGuardIndicator() {
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
        border: 2px solid rgba(255,255,255,0.2);
      " id="sweeptsguard-btn">
        🛡️ <span>SweepGuard Active</span>
        <span style="
          background: rgba(255,255,255,0.2);
          padding: 2px 6px;
          border-radius: 6px;
          font-size: 10px;
        ">CLICK TO CLAIM</span>
      </div>
    `;
    
    indicator.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 999999;';
    document.body.appendChild(indicator);
    
    // Click handler
    document.getElementById('sweeptsguard-btn')?.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
    });
    
    // Make draggable
    makeDraggable(indicator);
  }
  
  // Make element draggable
  function makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    element.onmousedown = dragMouseDown;
    
    function dragMouseDown(e) {
      e = e || window.event;
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    }
    
    function elementDrag(e) {
      e = e || window.event;
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      element.style.top = (element.offsetTop - pos2) + "px";
      element.style.left = (element.offsetLeft - pos1) + "px";
    }
    
    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }
  
  // Notify background script
  function notifyBackground(type, data) {
    try {
      chrome.runtime.sendMessage({ type, data });
    } catch (e) {
      console.log('[SweepGuard] Could not notify background:', e);
    }
  }
  
  // Intercept Web3 provider if available
  function interceptWeb3() {
    if (window.ethereum) {
      console.log('[SweepGuard] Ethereum provider detected');
      
      // Store original request
      const originalRequest = window.ethereum.request.bind(window.ethereum);
      
      // Override request
      window.ethereum.request = async function(args) {
        console.log('[SweepGuard] Web3 request:', args.method);
        
        // Detect sendTransaction
        if (args.method === 'eth_sendTransaction') {
          const tx = args.params?.[0];
          if (tx?.data) {
            const selector = tx.data.slice(0, 10);
            console.log('[SweepGuard] Transaction selector:', selector);
            
            // Notify about transaction
            notifyBackground('TRANSACTION_DETECTED', {
              to: tx.to,
              selector: selector,
              value: tx.value,
              url: window.location.href
            });
          }
        }
        
        // Detect connect request
        if (args.method === 'eth_requestAccounts') {
          console.log('[SweepGuard] Wallet connect requested');
          notifyBackground('WALLET_CONNECT_REQUEST', {
            url: window.location.href,
            title: document.title
          });
        }
        
        return originalRequest(args);
      };
      
      // Mark provider as intercepted
      window.ethereum._sweeptsguard = true;
      window.ethereum._sweeptsguardVersion = '2.1.0';
    }
  }
  
  // Initialize
  function init() {
    console.log('[SweepGuard] Initializing...');
    
    // Check if claim page
    if (isClaimPage()) {
      console.log('[SweepGuard] Claim page detected!');
      
      // Add indicator
      addSweepGuardIndicator();
      
      // Notify background
      notifyBackground('CLAIM_PAGE_DETECTED', {
        url: window.location.href,
        title: document.title,
        contract: findContractAddress(),
        hasClaimButton: !!findClaimButton()
      });
    }
    
    // Watch for wallet modal
    watchForWalletModal();
    
    // Try to intercept Web3
    interceptWeb3();
    
    // Also try after a delay (some sites load provider late)
    setTimeout(interceptWeb3, 1000);
    setTimeout(interceptWeb3, 3000);
    
    // Monitor for dynamic changes
    const bodyObserver = new MutationObserver(() => {
      // Check if claim page now
      if (isClaimPage() && !document.getElementById('sweeptsguard-indicator')) {
        addSweepGuardIndicator();
      }
      
      // Try to intercept Web3 again
      if (window.ethereum && !window.ethereum._sweeptsguard) {
        interceptWeb3();
      }
    });
    
    if (document.body) {
      bodyObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }
  
  // Run when ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // Also run on page navigation (SPA)
  let lastUrl = window.location.href;
  setInterval(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      console.log('[SweepGuard] Page navigation detected');
      init();
    }
  }, 1000);
  
})();
