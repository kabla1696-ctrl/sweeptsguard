// SweepGuard v5.0 — Injected Script
// This script runs in the page context (not content script context)
// It provides the window.ethereum provider

(function() {
  'use strict'
  if (window.__sweepguard_injected) return
  window.__sweepguard_injected = true

  const provider = {
    isSweepGuard: true,
    isMetaMask: false,
    _listeners: {},
    _chainId: '0x2105', // Default Base

    async request({ method, params }) {
      return new Promise((resolve, reject) => {
        const id = Math.random().toString(36).slice(2)

        const handler = (event) => {
          if (event.data?.type === 'SWEEPGUARD_RESPONSE' && event.data?.id === id) {
            window.removeEventListener('message', handler)
            if (event.data.error) {
              reject(new Error(event.data.error))
            } else {
              resolve(event.data.result)
            }
          }
        }
        window.addEventListener('message', handler)

        window.postMessage({
          type: 'SWEEPGUARD_REQUEST',
          id,
          method,
          params: params || [],
        }, '*')

        setTimeout(() => {
          window.removeEventListener('message', handler)
          reject(new Error('SweepGuard request timeout'))
        }, 300000)
      })
    },

    on(event, handler) {
      if (!this._listeners[event]) this._listeners[event] = []
      this._listeners[event].push(handler)
      return this
    },

    removeListener(event, handler) {
      if (this._listeners[event]) {
        this._listeners[event] = this._listeners[event].filter(h => h !== handler)
      }
      return this
    },

    emit(event, ...args) {
      if (this._listeners[event]) {
        this._listeners[event].forEach(handler => handler(...args))
      }
    },

    // EIP-6963
    _info: {
      uuid: 'sweeptsguard-' + crypto.randomUUID(),
      name: 'SweepGuard',
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🛡️</text></svg>',
      rdns: 'ai.sweeptsguard.extension',
    }
  }

  // Set as window.ethereum if not already set
  if (!window.ethereum) {
    window.ethereum = provider
  }
  window.sweepguard = provider

  // EIP-6963: Announce provider
  window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
    detail: { info: provider._info, provider }
  }))

  window.addEventListener('eip6963:requestProvider', () => {
    window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
      detail: { info: provider._info, provider }
    }))
  })

  console.log('🛡️ SweepGuard provider injected (EIP-7702)')
})()
