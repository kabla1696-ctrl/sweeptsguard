// SweepGuard Content Script v3.2 — Message Relay
(function() {
  'use strict';
  if(window.__sweeptsguard_loaded) return;
  window.__sweeptsguard_loaded = true;
  
  // Inject provider FIRST
  try {
    const s = document.createElement('script');
    s.src = chrome.runtime.getURL('injected.js');
    s.onload = () => s.remove();
    (document.head||document.documentElement||document).appendChild(s);
  } catch(e) {}
  
  // Also inject inline for instant override
  try {
    const inline = document.createElement('script');
    inline.textContent = `(function(){let _eth=window.ethereum;Object.defineProperty(window,'ethereum',{get(){return _eth},set(v){_eth=v},configurable:true});})();`;
    (document.documentElement||document).prepend(inline);
    inline.remove();
  } catch(e) {}
  
  console.log('[SweepGuard] Content v3.2 on:', window.location.href);
  
  // ===== MESSAGE RELAY: injected.js ↔ background.js =====
  window.addEventListener('message', async (e) => {
    if (e.source !== window) return;
    if (e.data?.type !== 'SG_REQUEST') return;
    
    const { id, action, ...rest } = e.data;
    
    try {
      let response;
      
      if (action === 'GET_WALLET_ADDRESS') {
        // Get wallets from chrome.storage via background
        response = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({ type: 'GET_WALLETS' }, (resp) => {
            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
            else resolve(resp);
          });
        });
      } else if (action === 'OPEN_POPUP') {
        chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
        response = { ok: true };
      } else if (action === 'CLAIM_AIRDROP') {
        response = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({ type: 'CLAIM_AIRDROP', ...rest }, (resp) => {
            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
            else resolve(resp);
          });
        });
      } else {
        response = { error: 'Unknown action' };
      }
      
      // Send response back to injected script
      window.postMessage({ type: 'SG_RESPONSE', id, success: true, data: response }, '*');
    } catch(err) {
      window.postMessage({ type: 'SG_RESPONSE', id, success: false, error: err.message }, '*');
    }
  });
  
  // Re-inject on DOM ready if needed
  if(document.readyState==='loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if(!window.__sweeptsguard_provider) {
        try {
          const s = document.createElement('script');
          s.src = chrome.runtime.getURL('injected.js');
          s.onload = () => s.remove();
          (document.head||document.documentElement).appendChild(s);
        } catch(e) {}
      }
    });
  }
  
  // Claim detection
  const CLAIM_PATTERNS = ['claim','airdrop','merkle','distribution','rewards','vesting','unlock','collect','mint','free-mint'];
  
  function isClaimPage() {
    const url = location.href.toLowerCase();
    const title = document.title.toLowerCase();
    const body = document.body?.innerText?.toLowerCase() || '';
    return CLAIM_PATTERNS.some(p => url.includes(p)||title.includes(p)||body.includes(p));
  }
  
  // Wallet modal detection
  function watchModal() {
    new MutationObserver(muts => {
      for(const m of muts) for(const n of m.addedNodes) {
        if(n.nodeType===1) {
          const t = n.innerText?.toLowerCase()||'';
          if(t.includes('connect wallet')||t.includes('choose wallet')||t.includes('select wallet')||
             t.includes('metamask')||t.includes('walletconnect')||t.includes('coinbase')||
             t.includes('rabby')||t.includes('keplr')||t.includes('okx')||t.includes('phantom')) {
            try{chrome.runtime.sendMessage({type:'WALLET_MODAL',data:{url:location.href}});}catch(e){}
          }
        }
      }
    }).observe(document.body||document.documentElement,{childList:true,subtree:true});
  }
  
  // Indicator
  function addInd() {
    if(document.getElementById('sg-ind')) return;
    const d = document.createElement('div');
    d.id = 'sg-ind';
    d.innerHTML = `<div id="sg-ib" style="position:fixed;bottom:20px;right:20px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:12px 20px;border-radius:14px;font-size:13px;font-weight:600;box-shadow:0 8px 24px rgba(16,185,129,0.3);z-index:999998;cursor:pointer;display:flex;align-items:center;gap:8px;border:2px solid rgba(255,255,255,0.2);user-select:none">🛡️ <span>SweepGuard</span><span style="background:rgba(255,255,255,0.2);padding:2px 8px;border-radius:6px;font-size:10px">ACTIVE</span></div>`;
    document.body.appendChild(d);
    document.getElementById('sg-ib')?.addEventListener('click',()=>{try{chrome.runtime.sendMessage({type:'OPEN_POPUP'});}catch(e){}});
  }
  
  // Messages
  chrome.runtime.onMessage.addListener((msg,send,resp)=>{
    if(msg.type==='GET_PAGE_INFO') resp({url:location.href,title:document.title,isClaimPage:isClaimPage(),hostname:location.hostname});
    if(msg.type==='CONNECT_WALLET'){
      if(window.ethereum) window.ethereum.request({method:'eth_requestAccounts'}).then(a=>resp({success:true,accounts:a})).catch(e=>resp({success:false,error:e.message}));
      else resp({success:false,error:'No provider'});
      return true;
    }
  });
  
  // Init
  function init() {
    if(isClaimPage()) {
      addInd();
      try{chrome.runtime.sendMessage({type:'CLAIM_PAGE',data:{url:location.href,title:document.title}});}catch(e){}
    }
    watchModal();
  }
  
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  
  let last = location.href;
  setInterval(()=>{if(location.href!==last){last=location.href;init();}},1000);
})();
