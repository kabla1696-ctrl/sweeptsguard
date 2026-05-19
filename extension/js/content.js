// SweepGuard Content Script
// Detects drainer patterns on web pages and warns users

(function() {
  'use strict'

  // Known drainer signatures
  const DRAINER_PATTERNS = [
    // EIP-7702 delegation patterns
    '0xef0100', // EIP-7702 delegation prefix
    '0x5ae401dc', // multicall
    '0x2b67b570', // Permit2
    // Common drainer method selectors
    '0xa1798512', // Known drainer method
    '0x39125215', // securityUpdate
    '0x69663e5b', // claimReward
    // Approval patterns
    '0x095ea7b3', // approve()
    '0xd505accf', // permit()
  ]

  // Known drainer domains
  const DRAINER_DOMAINS = [
    'airdrop-claim.net',
    'free-claim.xyz',
    'web3-airdrop.com',
    'eth-giveaway.com',
    'verify-wallet.net',
  ]

  // Inject warning banner
  function injectWarning(message, severity = 'warning') {
    // Remove existing banner
    const existing = document.getElementById('sweeptguard-banner')
    if (existing) existing.remove()

    const banner = document.createElement('div')
    banner.id = 'sweeptguard-banner'
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 2147483647;
      padding: 12px 16px;
      background: ${severity === 'danger' ? 'rgba(239,68,68,0.95)' : 'rgba(250,204,21,0.95)'};
      color: ${severity === 'danger' ? '#fff' : '#000'};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 600;
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      animation: slideDown 0.3s ease;
    `

    const icon = severity === 'danger' ? '🚨' : '⚠️'
    banner.innerHTML = `
      <span>${icon}</span>
      <span>${message}</span>
      <button onclick="this.parentElement.remove()" style="
        background: rgba(255,255,255,0.2);
        border: none;
        color: inherit;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        margin-left: 8px;
      ">Dismiss</button>
    `

    // Add animation
    const style = document.createElement('style')
    style.textContent = '@keyframes slideDown { from { transform: translateY(-100%); } to { transform: translateY(0); } }'
    document.head.appendChild(style)

    document.body.appendChild(banner)
  }

  // Intercept Web3 transactions
  function interceptWeb3() {
    // Intercept ethereum.request
    if (window.ethereum) {
      const originalRequest = window.ethereum.request.bind(window.ethereum)

      window.ethereum.request = async function(args) {
        console.log('[SweepGuard] Intercepted:', args.method, args.params)

        // Check for dangerous methods
        if (args.method === 'eth_sendTransaction') {
          const tx = args.params?.[0]
          if (tx) {
            const result = analyzeTransaction(tx)
            if (result.dangerous) {
              const proceed = confirm(
                `🛡️ SweepGuard Warning:\n\n${result.reason}\n\nDo you want to proceed?`
              )
              if (!proceed) {
                throw new Error('SweepGuard: Transaction blocked by user')
              }
            }
          }
        }

        // Check for wallet_switchEthereumChain (phishing)
        if (args.method === 'wallet_switchEthereumChain') {
          console.log('[SweepGuard] Chain switch detected:', args.params)
        }

        return originalRequest(args)
      }
    }

    // Intercept eth_sign (dangerous)
    if (window.ethereum) {
      const originalSendAsync = window.ethereum.sendAsync || window.ethereum.send
      if (originalSendAsync) {
        window.ethereum.sendAsync = function(payload, callback) {
          if (payload.method === 'eth_sign' || payload.method === 'personal_sign') {
            const message = payload.params?.[1] || ''
            if (message.includes('0xef0100')) {
              injectWarning('⚠️ EIP-7702 delegation signature detected! This could give control of your wallet to a contract.', 'danger')
            }
          }
          return originalSendAsync.call(this, payload, callback)
        }
      }
    }
  }

  // Analyze transaction for dangerous patterns
  function analyzeTransaction(tx) {
    const data = (tx.data || '').toLowerCase()

    // Check for EIP-7702 delegation
    if (data.startsWith('0xef0100')) {
      return { dangerous: true, reason: '🚨 EIP-7702 delegation detected! This will delegate your wallet to a smart contract.' }
    }

    // Check for suspicious approval amounts
    if (data.startsWith('0x095ea7b3')) {
      // approve(address,uint256)
      const maxApproval = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
      if (data.includes(maxApproval)) {
        return { dangerous: true, reason: '⚠️ Unlimited token approval detected! This allows spending all your tokens.' }
      }
    }

    // Check for known drainer methods
    for (const pattern of DRAINER_PATTERNS) {
      if (data.startsWith(pattern.slice(0, 10))) {
        return { dangerous: true, reason: `🚨 Known drainer method detected (${pattern.slice(0, 10)})!` }
      }
    }

    // Check for setApprovalForAll (NFT drain)
    if (data.startsWith('0xa22cb465')) {
      return { dangerous: true, reason: '⚠️ setApprovalForAll detected! This could allow draining all your NFTs.' }
    }

    // Check if sending to known drainer address
    const to = (tx.to || '').toLowerCase()

    return { dangerous: false }
  }

  // Check current domain
  function checkDomain() {
    const domain = window.location.hostname.toLowerCase()

    for (const drainerDomain of DRAINER_DOMAINS) {
      if (domain.includes(drainerDomain)) {
        injectWarning(`🚨 Known drainer domain detected: ${domain}`, 'danger')
        return
      }
    }
  }

  // Monitor for wallet connection requests
  function monitorConnection() {
    // Watch for connect buttons
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) {
            // Check for suspicious text
            const text = (node.textContent || '').toLowerCase()
            if (text.includes('sign to verify') && text.includes('wallet')) {
              console.log('[SweepGuard] Suspicious verify pattern detected')
            }
          }
        }
      }
    })

    observer.observe(document.body, { childList: true, subtree: true })
  }

  // Initialize
  function init() {
    console.log('[SweepGuard] Content script loaded on:', window.location.hostname)

    // Check domain
    checkDomain()

    // Intercept Web3
    interceptWeb3()

    // Monitor DOM
    if (document.body) {
      monitorConnection()
    } else {
      document.addEventListener('DOMContentLoaded', monitorConnection)
    }

    // Notify background script
    chrome.runtime.sendMessage({
      action: 'pageLoaded',
      url: window.location.href,
      domain: window.location.hostname
    })
  }

  // Run when ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
