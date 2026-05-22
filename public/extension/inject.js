// SweepGuard Wallet — Inpage Provider Injection
// Injects as window.ethereum, intercepts competing wallets, spoofs balances
// Modeled after zun's Antidrain architecture

(() => {
  if (window.__sweeptsguardInjected) return;
  window.__sweeptsguardInjected = true;

  const _origDefineProperty = Object.defineProperty;
  const PROTECTED_GLOBALS = new Set([
    'ethereum', 'rabby', 'trustwallet', 'coinbaseWalletExtension',
    'okxwallet', 'tokenpocket', 'bitkeep', 'bitget', 'ambire',
    'mathwallet', 'gatewallet', 'phantom',
  ]);
  let _allowOwnDefs = false;

  // Block competing extensions from claiming window.ethereum
  _origDefineProperty(Object, 'defineProperty', {
    value: function defineProperty(obj, prop, descriptor) {
      if (obj === window && PROTECTED_GLOBALS.has(prop) && !_allowOwnDefs) {
        return obj;
      }
      return _origDefineProperty.call(this, obj, prop, descriptor);
    },
    writable: false,
    configurable: false,
  });

  const listeners = new Map();
  const pending = new Map();
  const REQUEST_TIMEOUT_MS = 120000;

  const POST_MESSAGE_ORIGIN = /^https?:\/\//.test(window.location.origin)
    ? window.location.origin : '*';

  // Cached balance for fetch/XHR spoofing
  let compromisedAddress = null;
  let sponsorBalance = null;
  let sponsorBalanceTs = 0;
  const BALANCE_TTL_MS = 15000;

  function nextId() {
    const buf = new Uint8Array(16);
    crypto.getRandomValues(buf);
    return Array.from(buf, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  function emit(event, payload) {
    const handlers = listeners.get(event);
    if (!handlers) return;
    handlers.forEach(handler => {
      try { handler(payload); } catch {}
    });
  }

  function sendRequest(method, params) {
    const id = nextId();
    const payload = { method, params };
    const message = {
      target: 'SWEEPTSGUARD_WALLET',
      type: 'SWEEPTSGUARD_WALLET_REQUEST',
      id,
      payload,
    };

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id);
          reject(new Error('Request timed out'));
        }
      }, REQUEST_TIMEOUT_MS);

      pending.set(id, { resolve, reject, timeoutId });
      window.postMessage(message, POST_MESSAGE_ORIGIN);
    });
  }

  // Process RPC request — spoof balance/call/gas for compromised wallet
  async function processSingleRpcRequest(rpcBody) {
    if (!compromisedAddress && provider.selectedAddress) {
      compromisedAddress = provider.selectedAddress;
    }
    if (!compromisedAddress) return null;

    // Spoof eth_getBalance: return sponsor balance so dApps see a funded wallet
    if (rpcBody.method === 'eth_getBalance') {
      const requestedAddr = rpcBody.params?.[0]?.toLowerCase();
      if (requestedAddr === compromisedAddress.toLowerCase()) {
        if (sponsorBalance && (Date.now() - sponsorBalanceTs) < BALANCE_TTL_MS) {
          return { jsonrpc: '2.0', id: rpcBody.id, result: sponsorBalance };
        }
        try {
          const balance = await sendRequest('eth_getBalance', [compromisedAddress, 'latest']);
          sponsorBalance = balance;
          sponsorBalanceTs = Date.now();
          return { jsonrpc: '2.0', id: rpcBody.id, result: balance };
        } catch {
          return null;
        }
      }
    }

    // Spoof eth_call: route through extension when from=compromised
    if (rpcBody.method === 'eth_call') {
      const callFrom = rpcBody.params?.[0]?.from?.toLowerCase();
      const paddedAddr = compromisedAddress.slice(2).toLowerCase().padStart(64, '0');
      const calldata = (rpcBody.params?.[0]?.data || '').toLowerCase();
      const fromMatch = callFrom === compromisedAddress.toLowerCase();
      const dataMatch = calldata.length >= 74 && calldata.includes(paddedAddr);

      if (fromMatch || dataMatch) {
        try {
          const result = await sendRequest('eth_call', rpcBody.params || []);
          return { jsonrpc: '2.0', id: rpcBody.id, result };
        } catch {
          return null;
        }
      }
    }

    // Same spoof for gas estimation
    if (rpcBody.method === 'eth_estimateGas') {
      const callFrom = rpcBody.params?.[0]?.from?.toLowerCase();
      const paddedAddrGas = compromisedAddress.slice(2).toLowerCase().padStart(64, '0');
      const calldataGas = (rpcBody.params?.[0]?.data || '').toLowerCase();
      const fromMatchGas = callFrom === compromisedAddress.toLowerCase();
      const dataMatchGas = calldataGas.length >= 74 && calldataGas.includes(paddedAddrGas);

      if (fromMatchGas || dataMatchGas) {
        try {
          const result = await sendRequest('eth_estimateGas', rpcBody.params || []);
          return { jsonrpc: '2.0', id: rpcBody.id, result };
        } catch {
          return null;
        }
      }
    }

    return null;
  }

  // ── Fetch Interception ──────────────────────────────────────────────
  const originalFetch = window.fetch;

  window.fetch = async function(input, init) {
    const method = init?.method || (input instanceof Request ? input.method : null);
    if (!method || method.toUpperCase() !== 'POST') {
      return originalFetch.apply(this, arguments);
    }

    let bodyRaw = init?.body ?? null;
    if (!bodyRaw && input instanceof Request && input.body) {
      try { bodyRaw = await input.clone().text(); }
      catch { return originalFetch.apply(this, arguments); }
    }
    if (!bodyRaw) return originalFetch.apply(this, arguments);

    let body;
    try { body = typeof bodyRaw === 'string' ? JSON.parse(bodyRaw) : bodyRaw; }
    catch { return originalFetch.apply(this, arguments); }

    if (Array.isArray(body)) {
      let anyModified = false;
      const processedBatch = [];
      const spoofedResponses = [];

      for (let i = 0; i < body.length; i++) {
        const req = body[i];
        if (!req?.jsonrpc || !req?.method) {
          processedBatch.push(req);
          continue;
        }
        const result = await processSingleRpcRequest(req);
        if (result) {
          spoofedResponses.push({ index: i, response: result });
          processedBatch.push(req);
        } else {
          processedBatch.push(req);
        }
      }

      if (spoofedResponses.length > 0) {
        const modifiedInit = anyModified ? { ...init, body: JSON.stringify(processedBatch) } : init;
        const response = await originalFetch.call(this, input, modifiedInit);
        let responseData;
        try { responseData = await response.clone().json(); }
        catch { return response; }

        if (Array.isArray(responseData)) {
          for (const { index, response: spoofed } of spoofedResponses) {
            responseData[index] = spoofed;
          }
        }

        return new Response(JSON.stringify(responseData), {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      }

      if (anyModified) {
        const modifiedInit = { ...init, body: JSON.stringify(processedBatch) };
        return originalFetch.call(this, input, modifiedInit);
      }

      return originalFetch.apply(this, arguments);
    }

    if (!body?.jsonrpc || !body?.method) {
      return originalFetch.apply(this, arguments);
    }

    const result = await processSingleRpcRequest(body);
    if (result) {
      if (result.__modified) {
        delete result.__modified;
        const modifiedInit = { ...init, body: JSON.stringify(result) };
        return originalFetch.call(this, input, modifiedInit);
      } else {
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    return originalFetch.apply(this, arguments);
  };

  // ── XHR Interception ────────────────────────────────────────────────
  const OriginalXHR = window.XMLHttpRequest;

  window.XMLHttpRequest = function() {
    const xhr = new OriginalXHR();
    const originalOpen = xhr.open;
    const originalSend = xhr.send;
    let method = '';

    xhr.open = function(requestMethod, requestUrl, ...args) {
      method = requestMethod;
      return originalOpen.apply(this, [requestMethod, requestUrl, ...args]);
    };

    xhr.send = function(body) {
      if (method.toUpperCase() !== 'POST' || !body) {
        return originalSend.apply(this, arguments);
      }

      let parsedBody;
      try { parsedBody = typeof body === 'string' ? JSON.parse(body) : body; }
      catch { return originalSend.apply(this, arguments); }

      if (!parsedBody?.jsonrpc || !parsedBody?.method) {
        return originalSend.apply(this, arguments);
      }

      (async () => {
        const result = await processSingleRpcRequest(parsedBody);
        if (result) {
          if (result.__modified) {
            delete result.__modified;
            return originalSend.call(xhr, JSON.stringify(result));
          } else {
            const spoofedJson = JSON.stringify(result);
            const fakeProto = Object.create(Object.getPrototypeOf(xhr));
            fakeProto.__spoofedReadyState = 4;
            fakeProto.__spoofedStatus = 200;
            fakeProto.__spoofedStatusText = 'OK';
            fakeProto.__spoofedResponseText = spoofedJson;
            fakeProto.__spoofedResponse = (xhr.responseType === 'json') ? result : spoofedJson;

            Object.defineProperties(fakeProto, {
              readyState:   { get() { return this.__spoofedReadyState; } },
              status:       { get() { return this.__spoofedStatus; } },
              statusText:   { get() { return this.__spoofedStatusText; } },
              responseText: { get() { return this.__spoofedResponseText; } },
              response:     { get() { return this.__spoofedResponse; } },
            });
            Object.setPrototypeOf(xhr, fakeProto);
            return originalSend.call(xhr, body);
          }
        }
        return originalSend.call(xhr, body);
      })();
    };

    return xhr;
  };

  // ── EIP-1193 Provider ───────────────────────────────────────────────
  const provider = {
    isSweepGuard: true,
    selectedAddress: null,
    chainId: '0x2105', // Base mainnet (8453)

    async request({ method, params }) {
      // Direct connection methods
      if (method === 'eth_requestAccounts' || method === 'eth_accounts') {
        const result = await sendRequest(method, params);
        if (Array.isArray(result) && result.length > 0) {
          provider.selectedAddress = result[0];
          compromisedAddress = result[0];
        }
        return result;
      }

      if (method === 'eth_chainId') {
        return await sendRequest(method, params);
      }

      if (method === 'wallet_switchEthereumChain') {
        const result = await sendRequest(method, params);
        provider.chainId = params?.[0]?.chainId || provider.chainId;
        emit('chainChanged', provider.chainId);
        return result;
      }

      if (method === 'wallet_addEthereumChain') {
        return await sendRequest(method, params);
      }

      // Spoofed methods for compromised wallet
      if (method === 'eth_getBalance') {
        const requestedAddr = params?.[0]?.toLowerCase();
        if (requestedAddr === provider.selectedAddress?.toLowerCase() ||
            requestedAddr === compromisedAddress?.toLowerCase()) {
          const result = await sendRequest(method, params);
          sponsorBalance = result;
          sponsorBalanceTs = Date.now();
          return result;
        }
        return await sendRequest(method, params);
      }

      if (method === 'eth_sendTransaction') {
        // Route through extension for rescue
        return await sendRequest(method, params);
      }

      if (method === 'personal_sign' || method === 'eth_sign') {
        return await sendRequest(method, params);
      }

      if (method === 'eth_signTypedData_v4' || method === 'eth_signTypedData') {
        return await sendRequest(method, params);
      }

      // Default: pass through
      return await sendRequest(method, params);
    },

    on(event, handler) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(handler);
      return provider;
    },

    removeListener(event, handler) {
      const handlers = listeners.get(event);
      if (handlers) handlers.delete(handler);
      return provider;
    },

    addListener(event, handler) {
      return provider.on(event, handler);
    },

    emit(event, ...args) {
      emit(event, ...args);
    },
  };

  // ── Install Provider ────────────────────────────────────────────────
  _allowOwnDefs = true;
  try {
    Object.defineProperty(window, 'ethereum', {
      get() { return provider; },
      set() {},
      configurable: false,
    });
  } catch {
    window.ethereum = provider;
  }

  // Also set as provider for EIP-6963
  window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
    detail: {
      info: {
        uuid: 'sweeptsguard-' + Date.now(),
        name: 'SweepGuard Wallet',
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🛡️</text></svg>',
        rdns: 'app.sweeptsguard.wallet',
      },
      provider,
    },
  }));

  // ── Message Listener (from content script) ──────────────────────────
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.target !== 'SWEEPTSGUARD_WALLET') return;

    if (data.type === 'SWEEPTSGUARD_WALLET_RESPONSE') {
      const entry = pending.get(data.id);
      if (!entry) return;
      pending.delete(data.id);
      clearTimeout(entry.timeoutId);

      if (data.error) {
        entry.reject(new Error(data.error.message || 'RPC error'));
      } else {
        entry.resolve(data.result);
      }
    }

    if (data.type === 'SWEEPTSGUARD_WALLET_EVENT') {
      emit(data.event, ...(data.params || []));
    }
  });
})();
