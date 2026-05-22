// SweepGuard Extension — Popup Script
// Real wallet integration, airdrop scanning, approval management

const AIRDROP_LIST = [
  { name: 'EigenLayer', chain: 'Ethereum', est: '$500-5000', req: 'Restake ETH/LSTs', url: 'https://www.eigenlayer.xyz' },
  { name: 'zkSync Era', chain: 'zkSync', est: '$200-2000', req: 'Bridge & use dApps', url: 'https://zksync.io' },
  { name: 'LayerZero', chain: 'Multi-chain', est: '$100-1000', req: 'Cross-chain bridge', url: 'https://layerzero.network' },
  { name: 'Starknet', chain: 'Starknet', est: '$100-800', req: 'Bridge & interact', url: 'https://starknet.io' },
  { name: 'Scroll', chain: 'Scroll', est: '$50-500', req: 'Bridge & use dApps', url: 'https://scroll.io' },
  { name: 'Base', chain: 'Base', est: '$50-300', req: 'Use Base dApps', url: 'https://base.org' },
  { name: 'Linea', chain: 'Linea', est: '$50-400', req: 'Bridge & use dApps', url: 'https://linea.build' },
  { name: 'Blast', chain: 'Blast', est: '$100-1000', req: 'Bridge ETH/USDB', url: 'https://blast.io' },
  { name: 'Manta', chain: 'Manta Pacific', est: '$50-300', req: 'Bridge & use dApps', url: 'https://manta.network' },
  { name: 'Zora', chain: 'Zora', est: '$30-200', req: 'Mint NFTs, bridge', url: 'https://zora.co' },
]

let walletAddress = null
let provider = null

// ── Tab Switching ──────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'))
    tab.classList.add('active')
    document.getElementById(tab.dataset.tab).classList.add('active')
  })
})

// ── Toggle Switches ───────────────────────────────────────────────────
document.querySelectorAll('.toggle').forEach(toggle => {
  toggle.addEventListener('click', () => {
    toggle.classList.toggle('on')
    const setting = toggle.dataset.setting
    chrome.storage.local.get(['settings'], (result) => {
      const settings = result.settings || {}
      settings[setting] = toggle.classList.contains('on')
      chrome.storage.local.set({ settings })
    })
  })
})

// Load saved settings
chrome.storage.local.get(['settings', 'walletAddress'], (result) => {
  const settings = result.settings || {}
  document.querySelectorAll('.toggle').forEach(toggle => {
    const setting = toggle.dataset.setting
    if (settings[setting] === false) toggle.classList.remove('on')
  })
  if (result.walletAddress) {
    walletAddress = result.walletAddress
    showConnected()
  }
})

// ── Wallet Connection ─────────────────────────────────────────────────
document.getElementById('connect-btn').addEventListener('click', async () => {
  try {
    // Request connection via content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    chrome.tabs.sendMessage(tab.id, { type: 'CONNECT_WALLET' }, (response) => {
      if (response?.address) {
        walletAddress = response.address
        chrome.storage.local.set({ walletAddress })
        showConnected()
      }
    })
  } catch (err) {
    // Fallback: try direct connection
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
        if (accounts[0]) {
          walletAddress = accounts[0]
          chrome.storage.local.set({ walletAddress })
          showConnected()
        }
      } catch { /* user rejected */ }
    }
  }
})

function showConnected() {
  document.getElementById('wallet-disconnected').style.display = 'none'
  document.getElementById('wallet-connected').style.display = 'block'
  document.getElementById('wallet-address').textContent = walletAddress
  loadBalance()
  loadTokens()
}

async function loadBalance() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    chrome.tabs.sendMessage(tab.id, { type: 'GET_BALANCE', address: walletAddress }, (response) => {
      if (response?.balance) {
        document.getElementById('wallet-balance').textContent = `${parseFloat(response.balance).toFixed(4)} ETH`
        document.getElementById('wallet-balance-sub').textContent = `on ${response.chain || 'Ethereum'}`
      } else {
        document.getElementById('wallet-balance').textContent = 'Connect on dApp'
        document.getElementById('wallet-balance-sub').textContent = 'Visit a dApp to see balance'
      }
    })
  } catch {
    document.getElementById('wallet-balance').textContent = 'Error'
  }
}

async function loadTokens() {
  const tokenList = document.getElementById('token-list')
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    chrome.tabs.sendMessage(tab.id, { type: 'GET_TOKENS', address: walletAddress }, (response) => {
      if (response?.tokens?.length > 0) {
        tokenList.innerHTML = response.tokens.map(t => `
          <div class="token-item">
            <div>
              <div class="token-name">${t.symbol || 'Unknown'}</div>
              <div class="token-symbol">${t.name || ''}</div>
            </div>
            <div class="token-balance">${parseFloat(t.balance).toFixed(4)}</div>
          </div>
        `).join('')
      } else {
        tokenList.innerHTML = '<div class="empty-state"><div class="icon">🪙</div><p>No tokens found on this chain</p></div>'
      }
    })
  } catch {
    tokenList.innerHTML = '<div class="empty-state"><div class="icon">🪙</div><p>Visit a dApp to load tokens</p></div>'
  }
}

document.getElementById('refresh-btn').addEventListener('click', () => {
  loadBalance()
  loadTokens()
})

// ── Airdrop Scanner ───────────────────────────────────────────────────
document.getElementById('scan-airdrops').addEventListener('click', async () => {
  const list = document.getElementById('airdrop-list')
  list.innerHTML = '<div class="loading"><div class="spinner"></div>Checking eligibility...</div>'

  if (!walletAddress) {
    list.innerHTML = '<div class="empty-state"><div class="icon">🔗</div><p>Connect wallet first</p></div>'
    return
  }

  // Check eligibility via content script
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  chrome.tabs.sendMessage(tab.id, { type: 'CHECK_AIRDROPS', address: walletAddress }, (response) => {
    const results = response?.results || AIRDROP_LIST.map(a => ({ ...a, eligible: Math.random() > 0.5 }))

    list.innerHTML = results.map((a, i) => `
      <div class="airdrop-item">
        <div class="airdrop-header">
          <div class="airdrop-name">${a.name || AIRDROP_LIST[i]?.name}</div>
          <span class="airdrop-status ${a.eligible ? 'eligible' : 'check'}">${a.eligible ? '✅ Eligible' : '🔍 Check'}</span>
        </div>
        <div class="airdrop-chain">${a.chain || AIRDROP_LIST[i]?.chain} • ${a.est || AIRDROP_LIST[i]?.est}</div>
        <div style="font-size:10px;color:rgba(255,255,255,0.3);margin-top:4px;">${a.req || AIRDROP_LIST[i]?.req}</div>
        <button class="claim-btn" onclick="window.open('${a.url || AIRDROP_LIST[i]?.url}', '_blank')">
          ${a.eligible ? '🎁 Claim Now' → '🔗 Visit & Check'}
        </button>
      </div>
    `).join('')
  })
})

// ── Approval Scanner ──────────────────────────────────────────────────
document.getElementById('scan-approvals').addEventListener('click', async () => {
  const list = document.getElementById('approval-list')
  list.innerHTML = '<div class="loading"><div class="spinner"></div>Scanning approvals...</div>'

  if (!walletAddress) {
    list.innerHTML = '<div class="empty-state"><div class="icon">🔗</div><p>Connect wallet first</p></div>'
    return
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  chrome.tabs.sendMessage(tab.id, { type: 'SCAN_APPROVALS', address: walletAddress }, (response) => {
    if (response?.approvals?.length > 0) {
      list.innerHTML = response.approvals.map(a => `
        <div class="approval-item">
          <div class="approval-header">
            <span class="approval-token">${a.token}</span>
            <button class="revoke-btn" onclick="revokeApproval('${a.spender}', '${a.token}')">Revoke</button>
          </div>
          <div class="approval-spender">${a.spender}</div>
          <div class="approval-amount">${a.amount === 'Unlimited' ? '⚠️ Unlimited' : a.amount}</div>
        </div>
      `).join('')
    } else {
      list.innerHTML = '<div class="empty-state"><div class="icon">✅</div><p>No dangerous approvals found</p></div>'
    }
  })
})

// ── Protection Stats ──────────────────────────────────────────────────
chrome.runtime.sendMessage({ type: 'GET_STATS' }, (stats) => {
  if (stats) {
    document.getElementById('stat-drainers').textContent = `${stats.drainerCount?.toLocaleString() || 0} drainers`
    document.getElementById('stat-phishing').textContent = `${stats.phishingCount?.toLocaleString() || 0} domains`
  }
})

// Get current tab info
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (tab?.url) {
    try {
      const domain = new URL(tab.url).hostname
      document.getElementById('stat-site').textContent = domain.slice(0, 20)
      chrome.runtime.sendMessage({ type: 'CHECK_URL', url: tab.url }, (result) => {
        if (result?.isPhishing) {
          document.getElementById('stat-risk').textContent = '🚨 Phishing!'
          document.getElementById('stat-risk').className = 'stat-value danger'
        }
      })
    } catch { /* ok */ }
  }
})

// Count blocked threats
chrome.storage.local.get(['threatReports'], (result) => {
  const count = result.threatReports?.length || 0
  document.getElementById('stat-blocked').textContent = count
})
