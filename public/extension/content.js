// SweepGuard Content Script
// Injects into every page to detect and warn about drainer interactions

(function() {
  'use strict'

  // Don't inject into iframes or extension pages
  if (window !== window.top || window.location.protocol === 'chrome-extension:') return

  // Intercept ethereum provider requests
  let originalSend = null
  let originalRequest = null

  function setupWalletInterception() {
    const eth = window.ethereum
    if (!eth) return

    // Intercept eth_sendTransaction
    if (eth.request) {
      originalRequest = eth.request.bind(eth)
      eth.request = async function(args) {
        if (args.method === 'eth_sendTransaction' && args.params?.[0]) {
          const tx = args.params[0]
          const analysis = await analyzeTransaction(tx)
          if (analysis.risk === 'high') {
            const proceed = await showWarning(analysis)
            if (!proceed) throw new Error('SweepGuard: Transaction blocked by user')
          }
        }
        if (args.method === 'personal_sign') {
          const msg = args.params?.[0] || ''
          if (isSuspiciousSignRequest(msg)) {
            const proceed = await showWarning({
              risk: 'high',
              reason: 'Suspicious signature request',
              detail: 'This signature may grant token approvals or sign a malicious message. Verify the source.',
            })
            if (!proceed) throw new Error('SweepGuard: Signature blocked by user')
          }
        }
        return originalRequest(args)
      }
    }
  }

  // Analyze transaction for drainer patterns
  async function analyzeTransaction(tx) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        type: 'ANALYZE_TX',
        data: tx.data || '',
        to: tx.to,
        value: tx.value,
      }, (result) => {
        if (result) resolve(result)
        else resolve({ risk: 'safe' })
      })
    })
  }

  // Check if signature request looks suspicious
  function isSuspiciousSignRequest(message) {
    const msg = typeof message === 'string' ? message.toLowerCase() : ''
    // Check for common drainer message patterns
    const suspicious = [
      'setapprovalforall',
      'permit',
      'transfer',
      'claim',
      'airdrop',
      'free mint',
      'whitelist',
    ]
    return suspicious.some(s => msg.includes(s))
  }

  // Show warning overlay
  function showWarning(analysis) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div')
      overlay.id = 'sweeptsguard-warning'
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 2147483647;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `

      overlay.innerHTML = `
        <div style="max-width: 480px; width: 90%; background: #0a0a12; border: 1px solid rgba(255,0,0,0.3); border-radius: 16px; padding: 32px; text-align: center; box-shadow: 0 0 60px rgba(255,0,0,0.2);">
          <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
          <h2 style="color: #ff4444; font-size: 24px; font-weight: 700; margin: 0 0 12px;">
            SweepGuard Warning
          </h2>
          <p style="color: #ff6666; font-size: 16px; font-weight: 600; margin: 0 0 8px;">
            ${analysis.reason || 'Suspicious transaction detected'}
          </p>
          <p style="color: rgba(255,255,255,0.5); font-size: 14px; margin: 0 0 24px; line-height: 1.5;">
            ${analysis.detail || 'This transaction may be malicious. Proceed with caution.'}
          </p>
          <div style="display: flex; gap: 12px; justify-content: center;">
            <button id="sg-block" style="flex: 1; padding: 14px 24px; background: linear-gradient(135deg, #22c55e, #10b981); color: #000; border: none; border-radius: 12px; font-size: 16px; font-weight: 700; cursor: pointer;">
              🛡️ Block Transaction
            </button>
            <button id="sg-proceed" style="flex: 1; padding: 14px 24px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: rgba(255,255,255,0.5); font-size: 14px; cursor: pointer;">
              Proceed Anyway
            </button>
          </div>
        </div>
      `

      document.body.appendChild(overlay)

      document.getElementById('sg-block').onclick = () => {
        overlay.remove()
        resolve(false)
      }

      document.getElementById('sg-proceed').onclick = () => {
        overlay.remove()
        resolve(true)
      }
    })
  }

  // Check current URL for phishing
  async function checkCurrentURL() {
    chrome.runtime.sendMessage({
      type: 'CHECK_URL',
      url: window.location.href,
    }, (result) => {
      if (result?.isPhishing) {
        showWarning({
          risk: 'high',
          reason: 'Phishing site detected!',
          detail: `${result.domain} is in our phishing database. Do NOT connect your wallet or sign any transactions on this site.`,
        })
      }
    })
  }

  // Initialize
  function init() {
    checkCurrentURL()
    // Wait for ethereum provider
    if (window.ethereum) {
      setupWalletInterception()
    } else {
      window.addEventListener('ethereum#initialized', setupWalletInterception)
      // Also check periodically
      const interval = setInterval(() => {
        if (window.ethereum) {
          clearInterval(interval)
          setupWalletInterception()
        }
      }, 1000)
      setTimeout(() => clearInterval(interval), 30000)
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
