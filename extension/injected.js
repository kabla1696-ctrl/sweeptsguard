// SweepGuard Extension - Injected Provider v2.1
// Intercepts MetaMask and shows SweepGuard wallet connect popup

(function() {
  'use strict';
  
  // Only inject once
  if (window.__sweeptsguard_provider) return;
  
  console.log('[SweepGuard Provider] Injecting custom wallet provider...');
  
  // Store original ethereum provider
  const originalProvider = window.ethereum;
  if (!originalProvider) {
    console.log('[SweepGuard Provider] No ethereum provider found');
    return;
  }
  
  // Create SweepGuard popup
  function createWalletPopup(requestId) {
    return new Promise((resolve, reject) => {
      // Remove existing popup
      const existing = document.getElementById('sweeptsguard-wallet-popup');
      if (existing) existing.remove();
      
      // Create popup overlay
      const overlay = document.createElement('div');
      overlay.id = 'sweeptsguard-wallet-popup';
      overlay.innerHTML = `
        <div style="
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          z-index: 999999;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          animation: fadeIn 0.2s ease;
        " id="sweeptsguard-overlay">
          <div style="
            background: linear-gradient(135deg, #1a1a2e, #16213e);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            padding: 0;
            width: 380px;
            max-height: 90vh;
            overflow: hidden;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
            animation: slideUp 0.3s ease;
          ">
            <!-- Header -->
            <div style="
              padding: 20px 24px;
              background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(139, 92, 246, 0.1));
              border-bottom: 1px solid rgba(255, 255, 255, 0.06);
              display: flex;
              align-items: center;
              justify-content: space-between;
            ">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="
                  width: 40px;
                  height: 40px;
                  background: linear-gradient(135deg, #10b981, #8b5cf6);
                  border-radius: 12px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 20px;
                ">🛡️</div>
                <div>
                  <div style="color: white; font-size: 18px; font-weight: 700;">SweepGuard</div>
                  <div style="color: rgba(255,255,255,0.5); font-size: 12px;">Wallet Connect</div>
                </div>
              </div>
              <button id="sweeptsguard-close" style="
                background: rgba(255,255,255,0.1);
                border: none;
                color: white;
                width: 32px;
                height: 32px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 18px;
                display: flex;
                align-items: center;
                justify-content: center;
              ">✕</button>
            </div>
            
            <!-- Website Info -->
            <div style="padding: 16px 24px; border-bottom: 1px solid rgba(255,255,255,0.06);">
              <div style="color: rgba(255,255,255,0.5); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                Connecting to
              </div>
              <div style="
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px 12px;
                background: rgba(255,255,255,0.03);
                border-radius: 10px;
                border: 1px solid rgba(255,255,255,0.06);
              ">
                <div style="
                  width: 32px;
                  height: 32px;
                  background: rgba(59, 130, 246, 0.2);
                  border-radius: 8px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 16px;
                ">🌐</div>
                <div>
                  <div style="color: white; font-size: 14px; font-weight: 600;">${window.location.hostname}</div>
                  <div style="color: rgba(255,255,255,0.4); font-size: 11px; font-family: monospace;">${window.location.href.slice(0, 50)}...</div>
                </div>
              </div>
            </div>
            
            <!-- Wallet Selection -->
            <div style="padding: 16px 24px;">
              <div style="color: rgba(255,255,255,0.5); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
                Select Wallet
              </div>
              
              <!-- SweepGuard Wallet Option -->
              <button id="sweeptsguard-connect" style="
                width: 100%;
                padding: 16px;
                background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(139, 92, 246, 0.1));
                border: 2px solid rgba(16, 185, 129, 0.3);
                border-radius: 12px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 14px;
                margin-bottom: 10px;
                transition: all 0.2s;
              ">
                <div style="
                  width: 44px;
                  height: 44px;
                  background: linear-gradient(135deg, #10b981, #059669);
                  border-radius: 12px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 22px;
                ">🛡️</div>
                <div style="text-align: left;">
                  <div style="color: white; font-size: 15px; font-weight: 600;">SweepGuard Wallet</div>
                  <div style="color: rgba(255,255,255,0.5); font-size: 12px;">Protected EVM Wallet</div>
                </div>
                <div style="
                  margin-left: auto;
                  color: #10b981;
                  font-size: 20px;
                ">→</div>
              </button>
              
              <!-- MetaMask Option -->
              <button id="sweeptsguard-metamask" style="
                width: 100%;
                padding: 16px;
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.06);
                border-radius: 12px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 14px;
                margin-bottom: 10px;
                transition: all 0.2s;
              ">
                <div style="
                  width: 44px;
                  height: 44px;
                  background: rgba(245, 158, 11, 0.2);
                  border-radius: 12px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 22px;
                ">🦊</div>
                <div style="text-align: left;">
                  <div style="color: white; font-size: 15px; font-weight: 600;">MetaMask</div>
                  <div style="color: rgba(255,255,255,0.5); font-size: 12px;">Original MetaMask</div>
                </div>
              </button>
              
              <!-- WalletConnect Option -->
              <button id="sweeptsguard-walletconnect" style="
                width: 100%;
                padding: 16px;
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.06);
                border-radius: 12px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 14px;
                transition: all 0.2s;
              ">
                <div style="
                  width: 44px;
                  height: 44px;
                  background: rgba(59, 130, 246, 0.2);
                  border-radius: 12px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 22px;
                ">🔗</div>
                <div style="text-align: left;">
                  <div style="color: white; font-size: 15px; font-weight: 600;">WalletConnect</div>
                  <div style="color: rgba(255,255,255,0.5); font-size: 12px;">Scan with mobile wallet</div>
                </div>
              </button>
            </div>
            
            <!-- Footer -->
            <div style="
              padding: 12px 24px 16px;
              text-align: center;
              border-top: 1px solid rgba(255,255,255,0.06);
            ">
              <div style="color: rgba(255,255,255,0.3); font-size: 11px;">
                🛡️ Protected by SweepGuard • sweeptsguard.vercel.app
              </div>
            </div>
          </div>
        </div>
        
        <style>
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          #sweeptsguard-connect:hover {
            border-color: #10b981 !important;
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(139, 92, 246, 0.2)) !important;
          }
          #sweeptsguard-metamask:hover,
          #sweeptsguard-walletconnect:hover {
            border-color: rgba(255,255,255,0.15) !important;
            background: rgba(255,255,255,0.05) !important;
          }
          #sweeptsguard-close:hover {
            background: rgba(255,255,255,0.2) !important;
          }
        </style>
      `;
      
      document.body.appendChild(overlay);
      
      // Close button
      document.getElementById('sweeptsguard-close').addEventListener('click', () => {
        overlay.remove();
        reject(new Error('User rejected request'));
      });
      
      // Click overlay to close
      document.getElementById('sweeptsguard-overlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
          overlay.remove();
          reject(new Error('User rejected request'));
        }
      });
      
      // SweepGuard Connect
      document.getElementById('sweeptsguard-connect').addEventListener('click', async () => {
        // Get wallet from storage
        try {
          const response = await chrome.runtime.sendMessage({ type: 'GET_WALLETS' });
          if (response && response.hackedKey) {
            // Derive address from private key
            const { ethers } = await import('https://cdn.ethers.io/lib/ethers-5.7.umd.min.js');
            const wallet = new ethers.Wallet(response.hackedKey);
            overlay.remove();
            resolve([wallet.address]);
          } else {
            // No wallet configured, open popup
            overlay.remove();
            chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
            reject(new Error('Please configure wallet in SweepGuard extension'));
          }
        } catch (e) {
          overlay.remove();
          reject(e);
        }
      });
      
      // MetaMask Original
      document.getElementById('sweeptsguard-metamask').addEventListener('click', async () => {
        overlay.remove();
        try {
          const accounts = await originalProvider.request({ 
            method: 'eth_requestAccounts',
            params: []
          });
          resolve(accounts);
        } catch (e) {
          reject(e);
        }
      });
      
      // WalletConnect
      document.getElementById('sweeptsguard-walletconnect').addEventListener('click', () => {
        overlay.remove();
        reject(new Error('WalletConnect not implemented yet'));
      });
    });
  }
  
  // Create custom provider that intercepts requests
  const sweeptsguardProvider = new Proxy(originalProvider, {
    get(target, prop) {
      if (prop === 'isSweepGuard') return true;
      if (prop === 'isMetaMask') return true; // Websites check this
      if (prop === '_sweeptsguard') return true;
      if (prop === '_sweeptsguardVersion') return '2.1.0';
      
      if (prop === 'request') {
        return async function(args) {
          console.log('[SweepGuard Provider] Request:', args.method);
          
          // Intercept wallet connection requests
          if (args.method === 'eth_requestAccounts' || 
              args.method === 'wallet_requestPermissions') {
            console.log('[SweepGuard Provider] Intercepting wallet connect!');
            
            try {
              const accounts = await createWalletPopup();
              return accounts;
            } catch (e) {
              throw new Error('User rejected the request.');
            }
          }
          
          // Intercept sendTransaction to add protection
          if (args.method === 'eth_sendTransaction') {
            const tx = args.params?.[0];
            if (tx) {
              console.log('[SweepGuard Provider] Transaction intercepted:', tx);
              
              // Notify background
              try {
                chrome.runtime.sendMessage({
                  type: 'TRANSACTION_DETECTED',
                  data: {
                    to: tx.to,
                    value: tx.value,
                    data: tx.data,
                    url: window.location.href
                  }
                });
              } catch (e) {}
            }
          }
          
          // Pass through to original provider
          return target.request(args);
        };
      }
      
      // Return bound method for other properties
      if (typeof target[prop] === 'function') {
        return target[prop].bind(target);
      }
      
      return target[prop];
    }
  });
  
  // Replace the provider
  window.ethereum = sweeptsguardProvider;
  
  // Also handle EIP-6963 providers
  window.addEventListener('eip6963:announceProvider', (event) => {
    console.log('[SweepGuard Provider] EIP-6963 provider announced');
  });
  
  // Dispatch our own provider announcement
  const announceEvent = new CustomEvent('eip6963:announceProvider', {
    detail: {
      info: {
        uuid: 'sweeptsguard-' + Math.random().toString(36).substr(2, 9),
        name: 'SweepGuard',
        icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjggMTI4Ij48Y2lyY2xlIGN4PSI2NCIgY3k9IjY0IiByPSI2MCIgZmlsbD0iIzEwYjk4MSIvPjxwYXRoIGQ9Ik02NCAyMCBMNDAgNDUgTDQwIDgwIEw2NCA5NSBMODggODAgTDg4IDQ1IFoiIGZpbGw9IndoaXRlIiBvcGFjaXR5PSIwLjkiLz48L3N2Zz4=',
        rdns: 'com.sweeptsguard.wallet'
      },
      provider: sweeptsguardProvider
    }
  });
  window.dispatchEvent(announceEvent);
  
  // Mark as loaded
  window.__sweeptsguard_provider = true;
  
  console.log('[SweepGuard Provider] ✅ Custom provider injected successfully!');
  
  // Notify content script
  try {
    chrome.runtime.sendMessage({ 
      type: 'PROVIDER_INJECTED',
      data: { url: window.location.href }
    });
  } catch (e) {}
  
})();
