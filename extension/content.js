// SweepGuard Extension - Content Script v2.2
// Injects custom wallet provider and detects claim pages

(function() {
  'use strict';
  
  // Prevent multiple injections
  if (window.__sweeptsguard_loaded) return;
  window.__sweeptsguard_loaded = true;
  
  console.log('[SweepGuard] Content script loaded on:', window.location.href);
  
  // ===== INJECT CUSTOM PROVIDER =====
  // This must be injected into the main world to intercept window.ethereum
  function injectProvider() {
    try {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('injected.js');
      script.onload = () => {
        console.log('[SweepGuard] Provider injected successfully');
        script.remove();
      };
      (document.head || document.documentElement).appendChild(script);
    } catch (e) {
      console.log('[SweepGuard] Provider injection failed:', e);
    }
  }
  
  // Inject immediately
  injectProvider();
  
  // Also try after page load (some sites load ethereum late)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectProvider);
  }
  window.addEventListener('load', injectProvider);
  
  // ===== CLAIM PAGE DETECTION =====
  const CLAIM_PATTERNS = [
    'claim', 'airdrop', 'merkle', 'distribution', 'rewards',
    'vesting', 'unlock', 'token-claim', 'airdrop-claim',
    'collect', 'mint', 'free-mint'
  ];
  
  const CLAIM_SELECTORS = [
    'button[class*="claim"]', 'button[class*="Claim"]',
    '[id*="claim"]', '[class*="airdrop"]',
    'a[href*="claim"]', 'button:contains("Claim")',
    'button:contains("claim")', 'button:contains("Mint")',
    'button:contains("Collect")', 'button:contains("Free")'
  ];
  
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
  
  function findContractAddress() {
    const text = document.body?.innerText || '';
    const addressRegex = /0x[a-fA-F0-9]{40}/g;
    const addresses = text.match(addressRegex) || [];
    return addresses[0] || null;
  }
  
  // ===== WALLET CONNECT DETECTION =====
  function findWalletConnectButton() {
    const selectors = [
      'button[class*="connect"]', 'button[class*="Connect"]',
      '[id*="connect"]', '[class*="wallet"]',
      'button:contains("Connect")', 'button:contains("connect")',
      'button:contains("Wallet")', 'button:contains("wallet")',
      'button:contains("MetaMask")', 'button:contains("metamask")',
      'button:contains("Connect Wallet")', '[data-testid*="connect"]',
      '[data-testid*="wallet"]', '.web3-modal', '.wallet-modal',
      '#web3-modal', '#wallet-modal', '[class*="web3"]',
      '[class*="Web3"]', '[class*="WEB3"]',
      'button[data-testid="wallet-connect"]',
      'button[data-testid="connect-button"]',
      '.connect-btn', '.wallet-btn', '.btn-connect',
      '#connect-btn', '#wallet-btn'
    ];
    
    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          const text = el.innerText?.toLowerCase() || '';
          const style = window.getComputedStyle(el);
          
          if (style.display !== 'none' && style.visibility !== 'hidden') {
            if (text.includes('connect') || text.includes('wallet') || 
                text.includes('metamask') || text.includes('web3') ||
                text.includes('link')) {
              return el;
            }
          }
        }
      } catch (e) {}
    }
    return null;
  }
  
  // ===== WALLET MODAL DETECTION =====
  function watchForWalletModal() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node;
            const text = element.innerText?.toLowerCase() || '';
            const className = element.className?.toLowerCase() || '';
            const id = element.id?.toLowerCase() || '';
            
            // Check if this is a wallet modal
            if (text.includes('connect wallet') || text.includes('choose wallet') ||
                text.includes('select wallet') || text.includes('metamask') ||
                text.includes('walletconnect') || text.includes('coinbase') ||
                className.includes('wallet-modal') || className.includes('web3-modal') ||
                id.includes('wallet-modal') || id.includes('web3-modal')) {
              
              console.log('[SweepGuard] Wallet modal detected!');
              notifyBackground('WALLET_MODAL_DETECTED', {
                url: window.location.href,
                title: document.title
              });
            }
          }
        }
      }
    });
    
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }
  
  // ===== SWEEPTSGUARD INDICATOR =====
  function addSweepGuardIndicator() {
    if (document.getElementById('sweeptsguard-indicator')) return;
    
    const indicator = document.createElement('div');
    indicator.id = 'sweeptsguard-indicator';
    indicator.innerHTML = `
      <div id="sweeptsguard-btn" style="
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
        user-select: none;
      ">
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
      try {
        chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
      } catch (e) {
        console.log('[SweepGuard] Could not open popup');
      }
    });
    
    // Make draggable
    makeDraggable(indicator);
  }
  
  function makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    const btn = element.firstElementChild;
    
    btn.onmousedown = dragMouseDown;
    
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
      element.style.bottom = 'auto';
      element.style.right = 'auto';
    }
    
    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }
  
  // ===== MESSAGE HANDLING =====
  function notifyBackground(type, data) {
    try {
      chrome.runtime.sendMessage({ type, data });
    } catch (e) {
      console.log('[SweepGuard] Could not notify background:', e);
    }
  }
  
  // Listen for messages from popup/background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case 'GET_PAGE_INFO':
        sendResponse({
          url: window.location.href,
          title: document.title,
          isClaimPage: isClaimPage(),
          contract: findContractAddress(),
          hasClaimButton: !!findClaimButton(),
          hasWalletButton: !!findWalletConnectButton(),
          hostname: window.location.hostname
        });
        break;
        
      case 'CONNECT_WALLET':
        // Trigger wallet connect
        const walletBtn = findWalletConnectButton();
        if (walletBtn) {
          walletBtn.click();
          sendResponse({ success: true, method: 'clicked_button' });
        } else if (window.ethereum) {
          window.ethereum.request({ method: 'eth_requestAccounts' })
            .then(accounts => sendResponse({ success: true, accounts }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        } else {
          sendResponse({ success: false, error: 'No wallet button found' });
        }
        return true;
        
      case 'INJECT_PROVIDER':
        injectProvider();
        sendResponse({ success: true });
        break;
    }
  });
  
  // ===== DYNAMIC ELEMENT DETECTION =====
  const bodyObserver = new MutationObserver(() => {
    // Check if claim page now
    if (isClaimPage() && !document.getElementById('sweeptsguard-indicator')) {
      addSweepGuardIndicator();
    }
  });
  
  if (document.body) {
    bodyObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  // ===== INITIALIZE =====
  function init() {
    console.log('[SweepGuard] Initializing...');
    
    // Check if claim page
    if (isClaimPage()) {
      console.log('[SweepGuard] Claim page detected!');
      addSweepGuardIndicator();
      notifyBackground('CLAIM_PAGE_DETECTED', {
        url: window.location.href,
        title: document.title,
        contract: findContractAddress(),
        hasClaimButton: !!findClaimButton()
      });
    }
    
    // Watch for wallet modal
    watchForWalletModal();
  }
  
  // Run when ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // Monitor page navigation (SPA)
  let lastUrl = window.location.href;
  setInterval(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      console.log('[SweepGuard] Page navigation detected');
      init();
    }
  }, 1000);
  
})();
