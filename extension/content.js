// SweepGuard Content Script v3.0
(function() {
  'use strict';
  if(window.__sweeptsguard_loaded) return;
  window.__sweeptsguard_loaded = true;
  
  console.log('[SweepGuard] Content v3.0 on:', window.location.href);
  
  // Inject provider
  function injectProvider() {
    try {
      const s = document.createElement('script');
      s.src = chrome.runtime.getURL('injected.js');
      s.onload = () => s.remove();
      (document.head||document.documentElement).appendChild(s);
    } catch(e) {}
  }
  injectProvider();
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', injectProvider);
  window.addEventListener('load', injectProvider);
  
  // Claim detection
  const CLAIM_PATTERNS = ['claim','airdrop','merkle','distribution','rewards','vesting','unlock','collect','mint','free-mint'];
  
  function isClaimPage() {
    const url = window.location.href.toLowerCase();
    const title = document.title.toLowerCase();
    const body = document.body?.innerText?.toLowerCase() || '';
    return CLAIM_PATTERNS.some(p => url.includes(p)||title.includes(p)||body.includes(p));
  }
  
  // Wallet modal detection
  function watchWalletModal() {
    const obs = new MutationObserver(muts => {
      for(const m of muts) {
        for(const n of m.addedNodes) {
          if(n.nodeType===1) {
            const txt = n.innerText?.toLowerCase()||'';
            if(txt.includes('connect wallet')||txt.includes('choose wallet')||
               txt.includes('select wallet')||txt.includes('metamask')||
               txt.includes('walletconnect')||txt.includes('coinbase')) {
              try{chrome.runtime.sendMessage({type:'WALLET_MODAL',data:{url:window.location.href}});}catch(e){}
            }
          }
        }
      }
    });
    if(document.body) obs.observe(document.body,{childList:true,subtree:true});
  }
  
  // SweepGuard indicator
  function addIndicator() {
    if(document.getElementById('sg-indicator')) return;
    const d = document.createElement('div');
    d.id = 'sg-indicator';
    d.innerHTML = `<div id="sg-ind-btn" style="
      position:fixed;bottom:20px;right:20px;
      background:linear-gradient(135deg,#10b981,#059669);
      color:#fff;padding:12px 20px;border-radius:14px;font-size:13px;font-weight:600;
      box-shadow:0 8px 24px rgba(16,185,129,0.3);z-index:999998;cursor:pointer;
      display:flex;align-items:center;gap:8px;font-family:-apple-system,sans-serif;
      border:2px solid rgba(255,255,255,0.2);user-select:none;
    ">🛡️ <span>SweepGuard</span>
      <span style="background:rgba(255,255,255,0.2);padding:2px 8px;border-radius:6px;font-size:10px;">ACTIVE</span>
    </div>`;
    d.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:999998;';
    document.body.appendChild(d);
    document.getElementById('sg-ind-btn')?.addEventListener('click',()=>{
      try{chrome.runtime.sendMessage({type:'OPEN_POPUP'});}catch(e){}
    });
  }
  
  // Messages
  chrome.runtime.onMessage.addListener((msg,send,resp)=>{
    if(msg.type==='GET_PAGE_INFO'){
      resp({url:window.location.href,title:document.title,isClaimPage:isClaimPage(),hostname:window.location.hostname});
    }
    if(msg.type==='CONNECT_WALLET'){
      if(window.ethereum) window.ethereum.request({method:'eth_requestAccounts'}).then(a=>resp({success:true,accounts:a})).catch(e=>resp({success:false,error:e.message}));
      else resp({success:false,error:'No provider'});
      return true;
    }
  });
  
  // Init
  function init() {
    if(isClaimPage()) {
      addIndicator();
      try{chrome.runtime.sendMessage({type:'CLAIM_PAGE',data:{url:window.location.href,title:document.title}});}catch(e){}
    }
    watchWalletModal();
  }
  
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  
  let lastUrl = window.location.href;
  setInterval(()=>{if(window.location.href!==lastUrl){lastUrl=window.location.href;init();}},1000);
})();
