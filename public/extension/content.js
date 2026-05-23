// SweepGuard Wallet — Content Script Bridge
// Bridges between inject.js (MAIN world) and background.js via postMessage ↔ chrome.runtime.connect

(() => {
  const POST_MESSAGE_ORIGIN = /^https?:\/\//.test(window.location.origin)
    ? window.location.origin : '*';

  let port = null;

  const connectPort = () => {
    try {
      port = chrome.runtime.connect({ name: 'sweeptsguard-wallet' });

      port.onMessage.addListener((message) => {
        if (message.type === 'provider-response') {
          window.postMessage({
            target: 'SWEEPTSGUARD_WALLET',
            type: 'SWEEPTSGUARD_WALLET_RESPONSE',
            id: message.id,
            result: message.result,
            error: message.error,
          }, POST_MESSAGE_ORIGIN);
        }

        if (message.type === 'provider-event') {
          window.postMessage({
            target: 'SWEEPTSGUARD_WALLET',
            type: 'SWEEPTSGUARD_WALLET_EVENT',
            event: message.event,
            params: message.params,
          }, POST_MESSAGE_ORIGIN);
        }
      });

      port.onDisconnect.addListener(() => {
        void chrome.runtime.lastError;
        port = null;
      });
    } catch {
      port = null;
    }
  };

  const sendDisconnectError = (id) => {
    window.postMessage({
      target: 'SWEEPTSGUARD_WALLET',
      type: 'SWEEPTSGUARD_WALLET_RESPONSE',
      id,
      error: { code: 4900, message: 'Extension disconnected. Please refresh the page.' },
    }, POST_MESSAGE_ORIGIN);
  };

  const sendMessage = (data) => {
    try {
      if (!port) connectPort();
      if (port) {
        port.postMessage({ type: 'provider-request', id: data.id, payload: data.payload });
      } else {
        sendDisconnectError(data.id);
      }
    } catch {
      connectPort();
      try {
        if (port) {
          port.postMessage({ type: 'provider-request', id: data.id, payload: data.payload });
        } else {
          sendDisconnectError(data.id);
        }
      } catch {
        sendDisconnectError(data.id);
      }
    }
  };

  // Start relay
  connectPort();

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.target !== 'SWEEPTSGUARD_WALLET') return;
    if (data.type === 'SWEEPTSGUARD_WALLET_REQUEST') {
      sendMessage(data);
    }
  });
})();
