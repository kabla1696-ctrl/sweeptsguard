// SweepGuard Extension - Injected Provider v3.0
// Complete wallet intercept with claim detection

(function() {
  'use strict';
  
  if (window.__sweeptsguard_provider) return;
  window.__sweeptsguard_provider = true;
  
  console.log('[SweepGuard] Provider v3.0 injecting...');
  
  const originalProvider = window.ethereum;
  if (!originalProvider) return;
  
  // ===== WALLET CONNECT POPUP =====
  function showConnectPopup() {
    return new Promise((resolve, reject) => {
      const existing = document.getElementById('sg-popup-overlay');
      if (existing) existing.remove();
      
      const overlay = document.createElement('div');
      overlay.id = 'sg-popup-overlay';
      overlay.innerHTML = `
        <div id="sg-overlay-bg" style="
          position:fixed;top:0;left:0;right:0;bottom:0;
          background:rgba(0,0,0,0.75);backdrop-filter:blur(10px);
          z-index:999999;display:flex;align-items:center;justify-content:center;
          font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
          animation:sgFadeIn 0.2s ease;
        ">
          <div style="
            background:linear-gradient(145deg,#0f0f1a,#1a1a2e);
            border:1px solid rgba(255,255,255,0.08);
            border-radius:24px;width:400px;max-height:85vh;overflow:hidden;
            box-shadow:0 30px 60px rgba(0,0,0,0.6);
            animation:sgSlideUp 0.3s ease;
          ">
            <!-- Header -->
            <div style="padding:20px 24px;display:flex;align-items:center;justify-content:space-between;
              background:linear-gradient(135deg,rgba(16,185,129,0.08),rgba(139,92,246,0.08));
              border-bottom:1px solid rgba(255,255,255,0.06);">
              <div style="display:flex;align-items:center;gap:12px;">
                <div style="width:40px;height:40px;background:linear-gradient(135deg,#10b981,#8b5cf6);
                  border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;">🛡️</div>
                <div>
                  <div style="color:#fff;font-size:18px;font-weight:700;">SweepGuard</div>
                  <div style="color:rgba(255,255,255,0.4);font-size:11px;">Protected Wallet Connect</div>
                </div>
              </div>
              <button id="sg-close" style="background:rgba(255,255,255,0.08);border:none;color:#fff;
                width:32px;height:32px;border-radius:8px;cursor:pointer;font-size:16px;">✕</button>
            </div>
            
            <!-- Site Info -->
            <div style="padding:16px 24px;border-bottom:1px solid rgba(255,255,255,0.06);">
              <div style="color:rgba(255,255,255,0.4);font-size:10px;text-transform:uppercase;
                letter-spacing:1px;margin-bottom:8px;">Connecting to</div>
              <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;
                background:rgba(255,255,255,0.03);border-radius:12px;border:1px solid rgba(255,255,255,0.06);">
                <div style="width:36px;height:36px;background:rgba(59,130,246,0.15);
                  border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;">🌐</div>
                <div>
                  <div style="color:#fff;font-size:15px;font-weight:600;">${window.location.hostname}</div>
                  <div style="color:rgba(255,255,255,0.35);font-size:10px;font-family:monospace;">${window.location.pathname.slice(0,40)}</div>
                </div>
              </div>
            </div>
            
            <!-- Wallet Options -->
            <div style="padding:16px 24px;">
              <div style="color:rgba(255,255,255,0.4);font-size:10px;text-transform:uppercase;
                letter-spacing:1px;margin-bottom:12px;">Choose Wallet</div>
              
              <!-- SweepGuard -->
              <button id="sg-connect-sg" style="width:100%;padding:14px 16px;
                background:linear-gradient(135deg,rgba(16,185,129,0.12),rgba(139,92,246,0.12));
                border:2px solid rgba(16,185,129,0.3);border-radius:14px;cursor:pointer;
                display:flex;align-items:center;gap:14px;margin-bottom:10px;transition:all 0.2s;">
                <div style="width:44px;height:44px;background:linear-gradient(135deg,#10b981,#059669);
                  border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;">🛡️</div>
                <div style="text-align:left;flex:1;">
                  <div style="color:#fff;font-size:15px;font-weight:600;">SweepGuard Wallet</div>
                  <div style="color:rgba(255,255,255,0.4);font-size:11px;">Protected • Auto-claim enabled</div>
                </div>
                <div style="color:#10b981;font-size:11px;font-weight:600;">RECOMMENDED</div>
              </button>
              
              <!-- MetaMask -->
              <button id="sg-connect-mm" style="width:100%;padding:14px 16px;
                background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);
                border-radius:14px;cursor:pointer;display:flex;align-items:center;gap:14px;
                margin-bottom:10px;transition:all 0.2s;">
                <div style="width:44px;height:44px;background:rgba(245,158,11,0.15);
                  border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;">🦊</div>
                <div style="text-align:left;">
                  <div style="color:#fff;font-size:15px;font-weight:600;">MetaMask</div>
                  <div style="color:rgba(255,255,255,0.4);font-size:11px;">Original MetaMask wallet</div>
                </div>
              </button>
              
              <!-- WalletConnect -->
              <button id="sg-connect-wc" style="width:100%;padding:14px 16px;
                background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);
                border-radius:14px;cursor:pointer;display:flex;align-items:center;gap:14px;
                transition:all 0.2s;">
                <div style="width:44px;height:44px;background:rgba(59,130,246,0.15);
                  border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;">🔗</div>
                <div style="text-align:left;">
                  <div style="color:#fff;font-size:15px;font-weight:600;">WalletConnect</div>
                  <div style="color:rgba(255,255,255,0.4);font-size:11px;">Scan with mobile wallet</div>
                </div>
              </button>
            </div>
            
            <!-- Footer -->
            <div style="padding:12px 24px;text-align:center;border-top:1px solid rgba(255,255,255,0.06);">
              <div style="color:rgba(255,255,255,0.25);font-size:10px;">
                🛡️ Protected by SweepGuard • 80/20 Split • Flashbots Atomic
              </div>
            </div>
          </div>
        </div>
        <style>
          @keyframes sgFadeIn{from{opacity:0}to{opacity:1}}
          @keyframes sgSlideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
          #sg-connect-sg:hover{border-color:#10b981!important;background:linear-gradient(135deg,rgba(16,185,129,0.2),rgba(139,92,246,0.2))!important}
          #sg-connect-mm:hover,#sg-connect-wc:hover{border-color:rgba(255,255,255,0.15)!important;background:rgba(255,255,255,0.06)!important}
        </style>
      `;
      
      document.body.appendChild(overlay);
      
      const close = (result) => { overlay.remove(); return result; };
      
      document.getElementById('sg-close').onclick = () => { overlay.remove(); reject(new Error('User rejected')); };
      document.getElementById('sg-overlay-bg').onclick = (e) => { if(e.target===e.currentTarget){overlay.remove();reject(new Error('User rejected'));} };
      
      document.getElementById('sg-connect-sg').onclick = async () => {
        try {
          const resp = await chrome.runtime.sendMessage({type:'GET_WALLETS'});
          if(resp?.hackedKey){
            const {ethers} = await import('https://cdn.ethers.io/lib/ethers-5.7.umd.min.js');
            const wallet = new ethers.Wallet(resp.hackedKey);
            close([wallet.address]);
          } else {
            close();
            chrome.runtime.sendMessage({type:'OPEN_POPUP'});
            reject(new Error('Configure wallets in SweepGuard first'));
          }
        } catch(e){ close(); reject(e); }
      };
      
      document.getElementById('sg-connect-mm').onclick = async () => {
        close();
        try { resolve(await originalProvider.request({method:'eth_requestAccounts'})); }
        catch(e){ reject(e); }
      };
      
      document.getElementById('sg-connect-wc').onclick = () => { close(); reject(new Error('WalletConnect not available')); };
    });
  }
  
  // ===== CLAIM CONFIRMATION POPUP =====
  function showClaimConfirmPopup(details) {
    return new Promise((resolve, reject) => {
      const existing = document.getElementById('sg-popup-overlay');
      if (existing) existing.remove();
      
      const {chainName, chainId, tokenAmount, tokenSymbol, tokenName, claimContract, feeMode, gasCost, feeAmount, userAmount} = details;
      
      const overlay = document.createElement('div');
      overlay.id = 'sg-popup-overlay';
      overlay.innerHTML = `
        <div id="sg-overlay-bg" style="
          position:fixed;top:0;left:0;right:0;bottom:0;
          background:rgba(0,0,0,0.8);backdrop-filter:blur(12px);
          z-index:999999;display:flex;align-items:center;justify-content:center;
          font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
          animation:sgFadeIn 0.2s ease;
        ">
          <div style="
            background:linear-gradient(145deg,#0a0a14,#12121f);
            border:1px solid rgba(255,255,255,0.08);
            border-radius:24px;width:420px;overflow:hidden;
            box-shadow:0 30px 60px rgba(0,0,0,0.7);
            animation:sgSlideUp 0.3s ease;
          ">
            <!-- Header -->
            <div style="padding:20px 24px;display:flex;align-items:center;justify-content:space-between;
              background:linear-gradient(135deg,rgba(16,185,129,0.1),rgba(139,92,246,0.1));
              border-bottom:1px solid rgba(255,255,255,0.06);">
              <div style="display:flex;align-items:center;gap:12px;">
                <div style="width:44px;height:44px;background:linear-gradient(135deg,#10b981,#8b5cf6);
                  border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:24px;">🎯</div>
                <div>
                  <div style="color:#fff;font-size:20px;font-weight:700;">Claim Airdrop</div>
                  <div style="color:rgba(255,255,255,0.4);font-size:12px;">Confirm to execute atomic transaction</div>
                </div>
              </div>
              <button id="sg-close" style="background:rgba(255,255,255,0.08);border:none;color:#fff;
                width:32px;height:32px;border-radius:8px;cursor:pointer;font-size:16px;">✕</button>
            </div>
            
            <!-- Chain Info -->
            <div style="padding:16px 24px;border-bottom:1px solid rgba(255,255,255,0.06);">
              <div style="display:flex;align-items:center;gap:10px;padding:12px 16px;
                background:linear-gradient(135deg,rgba(16,185,129,0.06),rgba(139,92,246,0.06));
                border-radius:14px;border:1px solid rgba(255,255,255,0.06);">
                <div style="font-size:28px;">${getChainIcon(chainId)}</div>
                <div style="flex:1;">
                  <div style="color:#fff;font-size:16px;font-weight:600;">${chainName}</div>
                  <div style="color:rgba(255,255,255,0.4);font-size:11px;">Chain ID: ${chainId}</div>
                </div>
                <div style="background:rgba(16,185,129,0.15);padding:4px 10px;border-radius:8px;
                  color:#10b981;font-size:11px;font-weight:600;">AUTO-DETECTED</div>
              </div>
            </div>
            
            <!-- Token Info -->
            <div style="padding:16px 24px;border-bottom:1px solid rgba(255,255,255,0.06);">
              <div style="color:rgba(255,255,255,0.4);font-size:10px;text-transform:uppercase;
                letter-spacing:1px;margin-bottom:12px;">Token Details</div>
              
              <div style="text-align:center;padding:16px;background:rgba(255,255,255,0.02);
                border-radius:14px;border:1px solid rgba(255,255,255,0.06);">
                <div style="color:#fff;font-size:36px;font-weight:700;">${tokenAmount}</div>
                <div style="color:rgba(255,255,255,0.5);font-size:14px;margin-top:4px;">${tokenSymbol || tokenName || 'Tokens'}</div>
              </div>
            </div>
            
            <!-- Split Info -->
            <div style="padding:16px 24px;border-bottom:1px solid rgba(255,255,255,0.06);">
              <div style="color:rgba(255,255,255,0.4);font-size:10px;text-transform:uppercase;
                letter-spacing:1px;margin-bottom:12px;">Token Distribution</div>
              
              <!-- 80% to user -->
              <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;
                background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.15);
                border-radius:12px;margin-bottom:8px;">
                <div style="width:36px;height:36px;background:rgba(16,185,129,0.15);
                  border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;">🟢</div>
                <div style="flex:1;">
                  <div style="color:#10b981;font-size:13px;font-weight:600;">80% → Safe Wallet</div>
                  <div style="color:rgba(255,255,255,0.35);font-size:10px;font-family:monospace;" id="sg-safe-addr">Loading...</div>
                </div>
                <div style="color:#10b981;font-size:16px;font-weight:700;">${userAmount}</div>
              </div>
              
              <!-- 20% fee -->
              <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;
                background:rgba(139,92,246,0.06);border:1px solid rgba(139,92,246,0.15);
                border-radius:12px;">
                <div style="width:36px;height:36px;background:rgba(139,92,246,0.15);
                  border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;">🟣</div>
                <div style="flex:1;">
                  <div style="color:#8b5cf6;font-size:13px;font-weight:600;">20% → Platform Fee</div>
                  <div style="color:rgba(255,255,255,0.35);font-size:10px;font-family:monospace;">0x7A37...2C2A</div>
                </div>
                <div style="color:#8b5cf6;font-size:16px;font-weight:700;">${feeAmount}</div>
              </div>
            </div>
            
            <!-- Gas Info -->
            <div style="padding:16px 24px;border-bottom:1px solid rgba(255,255,255,0.06);">
              <div style="display:flex;justify-content:space-between;padding:8px 0;">
                <span style="color:rgba(255,255,255,0.4);font-size:12px;">⛽ Gas (Sponsored)</span>
                <span style="color:#10b981;font-size:12px;font-weight:600;">${gasCost}</span>
              </div>
              <div style="display:flex;justify-content:space-between;padding:8px 0;">
                <span style="color:rgba(255,255,255,0.4);font-size:12px;">⚡ Fee Mode</span>
                <span style="color:#f59e0b;font-size:12px;font-weight:600;">${feeMode}</span>
              </div>
              <div style="display:flex;justify-content:space-between;padding:8px 0;">
                <span style="color:rgba(255,255,255,0.4);font-size:12px;">🔒 Method</span>
                <span style="color:rgba(255,255,255,0.6);font-size:12px;">Flashbots Atomic Bundle</span>
              </div>
            </div>
            
            <!-- Confirm Button -->
            <div style="padding:20px 24px;">
              <button id="sg-confirm" style="
                width:100%;padding:16px;background:linear-gradient(135deg,#10b981,#059669);
                border:none;border-radius:14px;color:#fff;font-size:16px;font-weight:700;
                cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;
                box-shadow:0 8px 24px rgba(16,185,129,0.3);transition:all 0.2s;
              ">
                <span style="font-size:20px;">🚀</span>
                Confirm & Execute
              </button>
              <div style="text-align:center;margin-top:10px;color:rgba(255,255,255,0.25);font-size:10px;">
                1 transaction • Claim + Split • Atomic • All in same block
              </div>
            </div>
          </div>
        </div>
        <style>
          @keyframes sgFadeIn{from{opacity:0}to{opacity:1}}
          @keyframes sgSlideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
          #sg-confirm:hover{transform:translateY(-2px);box-shadow:0 12px 32px rgba(16,185,129,0.4)!important}
        </style>
      `;
      
      document.body.appendChild(overlay);
      
      // Load safe wallet address
      chrome.runtime.sendMessage({type:'GET_WALLETS'}).then(wallets => {
        const safeEl = document.getElementById('sg-safe-addr');
        if(safeEl && wallets?.safeWallet) {
          safeEl.textContent = wallets.safeWallet.slice(0,10) + '...' + wallets.safeWallet.slice(-8);
        }
      });
      
      document.getElementById('sg-close').onclick = () => { overlay.remove(); reject(new Error('User cancelled')); };
      document.getElementById('sg-overlay-bg').onclick = (e) => { if(e.target===e.currentTarget){overlay.remove();reject(new Error('User cancelled'));} };
      document.getElementById('sg-confirm').onclick = () => { overlay.remove(); resolve(true); };
    });
  }
  
  // Helper: Chain icon
  function getChainIcon(chainId) {
    const icons = {
      1:'⟠', 8453:'🔵', 56:'🟡', 42161:'🔷', 137:'🟣', 10:'🔴',
      43114:'🔺', 250:'👻', 81457:'💥', 324:'🔷', 59144:'🟢',
      25:'🐊', 7777777:'⭕', 1101:'🟣', 169:'🌊', 11155111:'🧪'
    };
    return icons[chainId] || '🔗';
  }
  
  // Helper: Chain name
  function getChainName(chainId) {
    const names = {
      1:'Ethereum', 8453:'Base', 56:'BNB Chain', 42161:'Arbitrum',
      137:'Polygon', 10:'Optimism', 43114:'Avalanche', 250:'Fantom',
      81457:'Blast', 324:'zkSync Era', 59144:'Linea', 25:'Cronos',
      7777777:'Zora', 1101:'Polygon zkEVM', 169:'Manta Pacific',
      11155111:'Sepolia Testnet'
    };
    return names[chainId] || `Chain ${chainId}`;
  }
  
  // ===== DETECT CLAIM PAGE =====
  function detectClaimInfo() {
    const text = document.body?.innerText || '';
    const url = window.location.href.toLowerCase();
    
    // Detect chain from various sources
    let detectedChainId = null;
    
    // Check for chain ID in page
    const chainMatch = text.match(/chain\s*id[:\s]*(\d+)/i) || 
                       text.match(/network[:\s]*(\d+)/i) ||
                       url.match(/chain[=:]?(\d+)/i);
    if(chainMatch) detectedChainId = parseInt(chainMatch[1]);
    
    // Check for known chain names
    if(!detectedChainId) {
      if(text.includes('ethereum') || text.includes('mainnet')) detectedChainId = 1;
      else if(text.includes('base') && !text.includes('database')) detectedChainId = 8453;
      else if(text.includes('bsc') || text.includes('binance') || text.includes('bnb chain')) detectedChainId = 56;
      else if(text.includes('arbitrum')) detectedChainId = 42161;
      else if(text.includes('polygon') || text.includes('matic')) detectedChainId = 137;
      else if(text.includes('optimism')) detectedChainId = 10;
      else if(text.includes('avalanche') || text.includes('avax')) detectedChainId = 43114;
      else if(text.includes('fantom') || text.includes('ftm')) detectedChainId = 250;
      else if(text.includes('blast')) detectedChainId = 81457;
      else if(text.includes('zksync')) detectedChainId = 324;
      else if(text.includes('linea')) detectedChainId = 59144;
      else if(text.includes('sepolia') || text.includes('testnet')) detectedChainId = 11155111;
    }
    
    // Check window.ethereum for chain
    if(!detectedChainId && window.ethereum?.chainId) {
      detectedChainId = parseInt(window.ethereum.chainId, 16);
    }
    
    // Detect token amount
    let tokenAmount = null;
    let tokenSymbol = null;
    const amountMatch = text.match(/claim\s*[:\s]*(\d+[\d,.]*)\s*([A-Z]{2,10})?/i) ||
                        text.match(/(\d+[\d,.]*)\s*(tokens?|SGTT|ETH|USDC|USDT)/i);
    if(amountMatch) {
      tokenAmount = amountMatch[1];
      tokenSymbol = amountMatch[2] || null;
    }
    
    // Detect contract address
    const addressRegex = /0x[a-fA-F0-9]{40}/g;
    const addresses = text.match(addressRegex) || [];
    const claimContract = addresses[0] || null;
    
    return {
      chainId: detectedChainId || 1,
      chainName: getChainName(detectedChainId || 1),
      tokenAmount: tokenAmount || '100',
      tokenSymbol: tokenSymbol || 'Tokens',
      claimContract,
      isClaimPage: text.toLowerCase().includes('claim') || url.includes('claim')
    };
  }
  
  // ===== CREATE CUSTOM PROVIDER =====
  const sweeptsguardProvider = new Proxy(originalProvider, {
    get(target, prop) {
      if(prop === 'isSweepGuard') return true;
      if(prop === 'isMetaMask') return true;
      if(prop === '_sweeptsguard') return true;
      if(prop === '_sweeptsguardVersion') return '3.0.0';
      
      if(prop === 'request') {
        return async function(args) {
          console.log('[SweepGuard] Request:', args.method);
          
          // Intercept wallet connect
          if(args.method === 'eth_requestAccounts' || args.method === 'wallet_requestPermissions') {
            console.log('[SweepGuard] Intercepting wallet connect!');
            try { return await showConnectPopup(); }
            catch(e) { throw new Error('User rejected the request.'); }
          }
          
          // Intercept transaction for claim detection
          if(args.method === 'eth_sendTransaction') {
            const tx = args.params?.[0];
            if(tx?.data) {
              const selector = tx.data.slice(0,10);
              const claimSelectors = ['0x2e7ba6ef','0x379607f5','0x48c54b9d','0xa578a715','0x4e71d92d'];
              
              if(claimSelectors.includes(selector)) {
                console.log('[SweepGuard] Claim transaction detected!');
                
                // Get claim info from page
                const claimInfo = detectClaimInfo();
                
                // Calculate amounts
                const totalAmount = parseFloat(claimInfo.tokenAmount) || 100;
                const feeAmount = (totalAmount * 0.2).toFixed(2);
                const userAmount = (totalAmount * 0.8).toFixed(2);
                
                // Get best fee mode
                const feeMode = 'Medium'; // Auto-select best
                
                try {
                  // Show confirmation popup
                  await showClaimConfirmPopup({
                    chainName: claimInfo.chainName,
                    chainId: claimInfo.chainId,
                    tokenAmount: claimInfo.tokenAmount,
                    tokenSymbol: claimInfo.tokenSymbol,
                    tokenName: claimInfo.tokenSymbol,
                    claimContract: claimInfo.claimContract,
                    feeMode: feeMode,
                    gasCost: 'Sponsored by SweepGuard',
                    feeAmount: `${feeAmount} ${claimInfo.tokenSymbol || ''}`,
                    userAmount: `${userAmount} ${claimInfo.tokenSymbol || ''}`
                  });
                  
                  // Notify background about claim
                  try {
                    chrome.runtime.sendMessage({
                      type: 'CLAIM_TRANSACTION',
                      data: {
                        chainId: claimInfo.chainId,
                        chainName: claimInfo.chainName,
                        tokenAmount: claimInfo.tokenAmount,
                        tokenSymbol: claimInfo.tokenSymbol,
                        totalAmount,
                        feeAmount,
                        userAmount,
                        to: tx.to,
                        value: tx.value
                      }
                    });
                  } catch(e) {}
                  
                } catch(e) {
                  throw new Error('Transaction cancelled by user');
                }
              }
            }
          }
          
          // Pass through to original provider
          return target.request(args);
        };
      }
      
      if(typeof target[prop] === 'function') return target[prop].bind(target);
      return target[prop];
    }
  });
  
  // Replace provider
  window.ethereum = sweeptsguardProvider;
  
  // EIP-6963 announcement
  window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
    detail: {
      info: {
        uuid: 'sweeptsguard-' + Math.random().toString(36).substr(2,9),
        name: 'SweepGuard',
        icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjggMTI4Ij48Y2lyY2xlIGN4PSI2NCIgY3k9IjY0IiByPSI2MCIgZmlsbD0iIzEwYjk4MSIvPjxwYXRoIGQ9Ik02NCAyMCBMNDAgNDUgTDQwIDgwIEw2NCA5NSBMODggODAgTDg4IDQ1IFoiIGZpbGw9IndoaXRlIiBvcGFjaXR5PSIwLjkiLz48L3N2Zz4=',
        rdns: 'com.sweeptsguard.wallet'
      },
      provider: sweeptsguardProvider
    }
  }));
  
  console.log('[SweepGuard] ✅ Provider v3.0 injected!');
})();
