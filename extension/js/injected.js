// SweepGuard Injected Script
// Runs in page context to intercept Web3 calls

(function() {
  'use strict'

  // Only inject once
  if (window.__sweeptguard_injected) return
  window.__sweeptguard_injected = true

  console.log('[SweepGuard] Injected into page context')

  // Store original ethereum provider
  let originalProvider = null

  // Wait for ethereum provider
  function waitForEthereum() {
    return new Promise((resolve) => {
      if (window.ethereum) {
        resolve(window.ethereum)
        return
      }

      const handler = (e) => {
        if (e.detail) {
          resolve(e.detail)
          window.removeEventListener('ethereum#initialized', handler)
        }
      }

      window.addEventListener('ethereum#initialized', handler)

      // Timeout fallback
      setTimeout(() => {
        if (window.ethereum) {
          resolve(window.ethereum)
        }
      }, 3000)
    })
  }

  // Wrap provider methods
  async function wrapProvider() {
    const provider = await waitForEthereum()
    if (!provider) return

    originalProvider = { ...provider }

    // Wrap request method
    const originalRequest = provider.request.bind(provider)
    provider.request = async function(args) {
      // Log all requests
      console.log('[SweepGuard] Web3 Request:', args.method, args.params)

      // Intercept dangerous methods
      if (args.method === 'eth_sendTransaction') {
        const tx = args.params?.[0]
        if (tx) {
          // Notify content script
          window.postMessage({
            type: 'SWEEPGUARD_TX_DETECTED',
            transaction: {
              to: tx.to,
              data: tx.data,
              value: tx.value
            }
          }, '*')
        }
      }

      // Intercept sign methods
      if (args.method === 'eth_sign' || args.method === 'personal_sign') {
        window.postMessage({
          type: 'SWEEPGUARD_SIGN_DETECTED',
          method: args.method,
          params: args.params
        }, '*')
      }

      return originalRequest(args)
    }

    console.log('[SweepGuard] Provider wrapped successfully')
  }

  // Listen for messages from content script
  window.addEventListener('message', (event) => {
    if (event.source !== window) return

    if (event.data.type === 'SWEEPGUARD_BLOCK_TX') {
      console.log('[SweepGuard] Blocking transaction:', event.data.reason)
    }
  })

  // Initialize
  wrapProvider()
})()
