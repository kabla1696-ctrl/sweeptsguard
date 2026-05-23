// SweepGuard v5.0 — Content Script
// Injects the provider script and bridges messages to background

(function() {
  'use strict'

  // Inject the provider into page context
  const script = document.createElement('script')
  script.src = chrome.runtime.getURL('injected.js')
  script.onload = () => script.remove()
  ;(document.head || document.documentElement).appendChild(script)

  // Bridge: relay messages between page and background
  window.addEventListener('message', async (event) => {
    if (event.source !== window) return
    if (event.data?.type !== 'SWEEPGUARD_REQUEST') return

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'PROVIDER_REQUEST',
        method: event.data.method,
        params: event.data.params,
      })

      window.postMessage({
        type: 'SWEEPGUARD_RESPONSE',
        id: event.data.id,
        method: event.data.method,
        result: response?.result,
        error: response?.error,
      }, '*')
    } catch (err) {
      window.postMessage({
        type: 'SWEEPGUARD_RESPONSE',
        id: event.data.id,
        method: event.data.method,
        error: err.message,
      }, '*')
    }
  })

  // Detect claim buttons and add indicator
  function scanForClaimButtons() {
    const buttons = document.querySelectorAll('button, a[role="button"], [type="submit"]')
    for (const btn of buttons) {
      const text = (btn.textContent || '').toLowerCase().trim()
      if ((text === 'claim' || text === 'claim now' || text === 'collect' || text === 'redeem') && !btn.dataset.sweepguard) {
        btn.dataset.sweepguard = 'detected'
        btn.style.outline = '2px solid #4ade80'
        btn.style.outlineOffset = '2px'
        btn.title = '🛡️ SweepGuard: Claim will be rescued via EIP-7702'
      }
    }
  }

  // Run on page load and observe for dynamic content
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scanForClaimButtons)
  } else {
    scanForClaimButtons()
  }

  const observer = new MutationObserver(scanForClaimButtons)
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true })
  }
})()
