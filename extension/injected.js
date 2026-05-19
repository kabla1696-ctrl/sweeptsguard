// SweepGuard Extension - Injected Script
// Injects into page context to intercept Web3 provider

(function() {
  'use strict';
  
  const FEE_WALLET = '0x7A3725154a2E6468F9549334394802e9E2822C2A';
  
  // Store original provider
  let originalProvider = null;
  let originalRequest = null;
  
  // Claim function signatures
  const CLAIM_SIGNATURES = {
    '0x2e7ba6ef': 'claim()',
    '0x379607f5': 'claim(uint256)',
    '0x48c54b9d': 'claim(address)',
    '0xa578a715': 'claim(address,uint256,bytes32[])',
    '0x4e4244c9': 'claimTo(address)',
  };
  
  // Intercept ethereum provider
  function interceptProvider() {
    if (!window.ethereum) return;
    
    originalProvider = window.ethereum;
    originalRequest = window.ethereum.request;
    
    // Override request method
    window.ethereum.request = async function(args) {
      // Intercept transactions
      if (args.method === 'eth_sendTransaction') {
        const tx = args.params?.[0];
        
        if (tx?.data) {
          const selector = tx.data.slice(0, 10);
          
          // Check if it's a claim transaction
          if (CLAIM_SIGNATURES[selector]) {
            console.log('%c[SweepGuard] 🎯 Claim transaction detected!', 'color: #10b981; font-weight: bold;');
            console.log('%c[SweepGuard] Method:', 'color: #8b5cf6;', CLAIM_SIGNATURES[selector]);
            console.log('%c[SweepGuard] Contract:', 'color: #8b5cf6;', tx.to);
            
            // Dispatch custom event for content script
            window.dispatchEvent(new CustomEvent('sweeptsguard:claim', {
              detail: {
                contract: tx.to,
                selector: selector,
                method: CLAIM_SIGNATURES[selector],
                data: tx.data
              }
            }));
          }
        }
      }
      
      // Call original method
      return originalRequest.apply(this, args);
    };
    
    // Add SweepGuard identifier
    window.ethereum._sweeptsguard = true;
    window.ethereum._sweeptsguardVersion = '2.0.0';
    
    console.log('%c[SweepGuard] 🛡️ Provider intercepted', 'color: #10b981; font-weight: bold;');
  }
  
  // Listen for provider injection
  const providerInterval = setInterval(() => {
    if (window.ethereum) {
      clearInterval(providerInterval);
      interceptProvider();
    }
  }, 100);
  
  // Stop checking after 10 seconds
  setTimeout(() => clearInterval(providerInterval), 10000);
  
  // Expose API for content script
  window.__sweeptsguard = {
    isClaimPage: () => {
      const text = document.body.innerText.toLowerCase();
      const url = window.location.href.toLowerCase();
      const patterns = ['claim', 'airdrop', 'merkle', 'distribution'];
      return patterns.some(p => text.includes(p) || url.includes(p));
    },
    getAddresses: () => {
      return document.body.innerText.match(/0x[a-fA-F0-9]{40}/g) || [];
    },
    hasProvider: () => !!window.ethereum,
    providerVersion: () => window.ethereum?._sweeptsguardVersion || null
  };
})();
