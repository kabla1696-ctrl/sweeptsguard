// SweepGuard Content Script — Wallet Integration + Drainer Detection
(function() {
  'use strict'
  if (window !== window.top || window.location.protocol === 'chrome-extension:') return

  // ── Wallet Connection ───────────────────────────────────────────────
  function getEthereum() {
    return window.ethereum
  }

  // ── Message Handler ─────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const eth = getEthereum()

    if (message.type === 'CONNECT_WALLET') {
      if (!eth) { sendResponse({ error: 'No wallet found' }); return true }
      eth.request({ method: 'eth_requestAccounts' }).then(accounts => {
        sendResponse({ address: accounts[0] })
      }).catch(err => sendResponse({ error: err.message }))
      return true
    }

    if (message.type === 'GET_BALANCE') {
      if (!eth) { sendResponse({ error: 'No wallet' }); return true }
      eth.request({ method: 'eth_getBalance', params: [message.address, 'latest'] }).then(balance => {
        const ethBalance = parseInt(balance, 16) / 1e18
        eth.request({ method: 'eth_chainId' }).then(chainId => {
          const chains = { '0x1': 'Ethereum', '0xa': 'Optimism', '0x2105': 'Base', '0xa4b1': 'Arbitrum', '0x89': 'Polygon', '0x38': 'BNB Chain', '0xe708': 'Linea', '0xa4ba': 'Scroll' }
          sendResponse({ balance: ethBalance.toString(), chain: chains[chainId] || `Chain ${parseInt(chainId, 16)}` })
        })
      }).catch(err => sendResponse({ error: err.message }))
      return true
    }

    if (message.type === 'GET_TOKENS') {
      if (!eth) { sendResponse({ tokens: [] }); return true }
      // Get native balance + common tokens via eth_call
      const address = message.address
      eth.request({ method: 'eth_chainId' }).then(async chainId => {
        const tokens = []
        // Native token
        const bal = await eth.request({ method: 'eth_getBalance', params: [address, 'latest'] })
        const nativeBal = parseInt(bal, 16) / 1e18
        if (nativeBal > 0) {
          const nativeSymbols = { '0x1': 'ETH', '0xa': 'ETH', '0x2105': 'ETH', '0xa4b1': 'ETH', '0x89': 'MATIC', '0x38': 'BNB' }
          tokens.push({ symbol: nativeSymbols[chainId] || 'ETH', name: 'Native Token', balance: nativeBal.toFixed(6) })
        }
        sendResponse({ tokens })
      }).catch(() => sendResponse({ tokens: [] }))
      return true
    }

    if (message.type === 'SCAN_APPROVALS') {
      if (!eth) { sendResponse({ approvals: [] }); return true }
      // Scan recent Approval events for this address
      const address = message.address
      const approvalTopic = '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925'
      eth.request({ method: 'eth_chainId' }).then(async chainId => {
        try {
          const logs = await eth.request({
            method: 'eth_getLogs',
            params: [{
              fromBlock: '0x0',
              toBlock: 'latest',
              topics: [approvalTopic, null, address ? '0x' + address.slice(2).padStart(64, '0') : null]
            }]
          })
          const approvals = []
          const seen = new Set()
          for (const log of (logs || []).slice(-50)) {
            const spender = '0x' + log.topics[2]?.slice(26)
            const key = `${log.address}-${spender}`
            if (seen.has(key)) continue
            seen.add(key)
            const amount = parseInt(log.data, 16)
            approvals.push({
              token: log.address.slice(0, 10) + '...',
              spender: spender,
              amount: amount === 0 ? '0' : (amount > 1e30 ? 'Unlimited' : amount.toString())
            })
          }
          sendResponse({ approvals })
        } catch {
          sendResponse({ approvals: [] })
        }
      }).catch(() => sendResponse({ approvals: [] }))
      return true
    }

    if (message.type === 'CHECK_URL') {
      chrome.runtime.sendMessage({ type: 'CHECK_URL', url: message.url || window.location.href }, sendResponse)
      return true
    }

    if (message.type === 'ANALYZE_TX') {
      chrome.runtime.sendMessage({ type: 'ANALYZE_TX', data: message.data }, sendResponse)
      return true
    }
  })

  // ── Transaction Interception ────────────────────────────────────────
  function setupWalletInterception() {
    const eth = getEthereum()
    if (!eth || !eth.request) return

    const originalRequest = eth.request.bind(eth)
    eth.request = async function(args) {
      if (args.method === 'eth_sendTransaction' && args.params?.[0]) {
        const tx = args.params[0]
        // Check for dangerous patterns
        const analysis = analyzeTxData(tx.data || '', tx.to)
        if (analysis.risk === 'high') {
          const proceed = await showWarning(analysis)
          if (!proceed) throw new Error('SweepGuard: Transaction blocked')
        }
      }
      if (args.method === 'personal_sign') {
        const msg = typeof args.params?.[0] === 'string' ? args.params[0] : ''
        if (isSuspiciousSign(msg)) {
          const proceed = await showWarning({ risk: 'high', reason: 'Suspicious signature', detail: 'This may grant token approvals. Verify the source.' })
          if (!proceed) throw new Error('SweepGuard: Signature blocked')
        }
      }
      return originalRequest(args)
    }
  }

  function analyzeTxData(data, to) {
    if (!data || data.length < 10) return { risk: 'safe' }
    const sig = data.slice(0, 10)
    // approve(address,uint256)
    if (sig === '0x095ea7b3') {
      const amount = BigInt('0x' + data.slice(74, 138))
      if (amount === BigInt(2) ** BigInt(256) - BigInt(1)) {
        return { risk: 'high', reason: 'Unlimited token approval', detail: 'Grants unlimited spending power. Common drainer pattern.' }
      }
      return { risk: 'medium', reason: 'Token approval', detail: 'Verify the spender is trusted.' }
    }
    // setApprovalForAll
    if (sig === '0xa22cb465' || sig === '0x8b95dd71') {
      return { risk: 'high', reason: 'NFT approval for all', detail: 'Grants access to ALL your NFTs. Extremely dangerous if untrusted.' }
    }
    return { risk: 'safe' }
  }

  function isSuspiciousSign(msg) {
    const lower = msg.toLowerCase()
    return ['setapprovalforall', 'permit', 'transfer', 'claim', 'airdrop', 'free mint', 'whitelist'].some(s => lower.includes(s))
  }

  function showWarning(analysis) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div')
      overlay.id = 'sweeptsguard-warning'
      overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:2147483647;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;font-family:-apple-system,sans-serif;'
      overlay.innerHTML = `
        <div style="max-width:480px;width:90%;background:#0a0a12;border:1px solid rgba(255,0,0,0.3);border-radius:16px;padding:32px;text-align:center;">
          <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
          <h2 style="color:#ff4444;font-size:22px;font-weight:700;margin:0 0 12px;">SweepGuard Warning</h2>
          <p style="color:#ff6666;font-size:15px;font-weight:600;margin:0 0 8px;">${analysis.reason}</p>
          <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0 0 24px;line-height:1.5;">${analysis.detail}</p>
          <div style="display:flex;gap:12px;">
            <button id="sg-block" style="flex:1;padding:14px;background:linear-gradient(135deg,#22c55e,#10b981);color:#000;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;">🛡️ Block</button>
            <button id="sg-proceed" style="flex:1;padding:14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;color:rgba(255,255,255,0.5);font-size:13px;cursor:pointer;">Proceed</button>
          </div>
        </div>`
      document.body.appendChild(overlay)
      document.getElementById('sg-block').onclick = () => { overlay.remove(); resolve(false) }
      document.getElementById('sg-proceed').onclick = () => { overlay.remove(); resolve(true) }
    })
  }

  // ── Phishing Check ──────────────────────────────────────────────────
  async function checkPhishing() {
    chrome.runtime.sendMessage({ type: 'CHECK_URL', url: window.location.href }, (result) => {
      if (result?.isPhishing) {
        showWarning({ risk: 'high', reason: 'Phishing site!', detail: `${result.domain} is in our phishing database. Do NOT connect your wallet.` })
      }
    })
  }

  // ── Init ────────────────────────────────────────────────────────────
  function init() {
    checkPhishing()
    if (getEthereum()) {
      setupWalletInterception()
    } else {
      const interval = setInterval(() => {
        if (getEthereum()) { clearInterval(interval); setupWalletInterception() }
      }, 1000)
      setTimeout(() => clearInterval(interval), 30000)
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
})()
