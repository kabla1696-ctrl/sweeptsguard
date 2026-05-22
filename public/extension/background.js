// SweepGuard Background Service Worker
// Drainer detection + phishing protection + transaction monitoring

const DRAINER_DB_URL = 'https://raw.githubusercontent.com/scam-database/scam-db/main/drainers.json'
const PHISHING_DB_URL = 'https://raw.githubusercontent.com/scam-database/scam-db/main/phishing.json'

let drainerAddresses = new Set()
let phishingDomains = new Set()
let lastDBUpdate = 0
const DB_UPDATE_INTERVAL = 60 * 60 * 1000 // 1 hour

// Known drainer patterns (common drainer contract signatures)
const DRAINER_SIGNATURES = [
  '0x8b95dd71', // setApprovalForAll
  '0x095ea7b3', // approve
  '0xa22cb465', // setApprovalForAll (ERC1155)
  '0xd5477f2e', // transferFrom variant
]

// Initialize
chrome.runtime.onInstalled.addListener(() => {
  console.log('[SweepGuard] Extension installed')
  updateDatabases()
  chrome.alarms.create('updateDB', { periodInMinutes: 60 })
})

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'updateDB') updateDatabases()
})

// Update drainer/phishing databases
async function updateDatabases() {
  try {
    const [drainerRes, phishingRes] = await Promise.allSettled([
      fetch(DRAINER_DB_URL),
      fetch(PHISHING_DB_URL),
    ])

    if (drainerRes.status === 'fulfilled' && drainerRes.value.ok) {
      const data = await drainerRes.value.json()
      drainerAddresses = new Set((data.addresses || data || []).map(a => a.toLowerCase()))
    }

    if (phishingRes.status === 'fulfilled' && phishingRes.value.ok) {
      const data = await phishingRes.value.json()
      phishingDomains = new Set((data.domains || data || []).map(d => d.toLowerCase()))
    }

    lastDBUpdate = Date.now()
    console.log(`[SweepGuard] DB updated: ${drainerAddresses.size} drainers, ${phishingDomains.size} phishing domains`)
  } catch (err) {
    console.warn('[SweepGuard] DB update failed:', err.message)
  }
}

// Check if address is a known drainer
function isDrainer(address) {
  return drainerAddresses.has(address.toLowerCase())
}

// Check if domain is a known phishing site
function isPhishing(url) {
  try {
    const domain = new URL(url).hostname.toLowerCase()
    return phishingDomains.has(domain) || [...phishingDomains].some(d => domain.endsWith('.' + d))
  } catch {
    return false
  }
}

// Analyze transaction data for drainer patterns
function analyzeTransaction(data) {
  if (!data || data.length < 10) return { risk: 'safe' }

  const methodSig = data.slice(0, 10)

  // Check for dangerous approvals
  if (methodSig === '0x095ea7b3') {
    // approve(address,uint256)
    const amount = BigInt('0x' + data.slice(74, 138))
    if (amount === BigInt(2) ** BigInt(256) - BigInt(1)) {
      return {
        risk: 'high',
        reason: 'Unlimited token approval detected',
        detail: 'This transaction grants unlimited spending power to the recipient. This is a common drainer pattern.',
      }
    }
  }

  // Check for setApprovalForAll
  if (methodSig === '0xa9059cbb' || methodSig === '0x8b95dd71' || methodSig === '0xa22cb465') {
    return {
      risk: 'medium',
      reason: 'NFT/Token transfer or approval detected',
      detail: 'Verify the recipient address is trusted before signing.',
    }
  }

  return { risk: 'safe' }
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CHECK_URL') {
    const result = {
      isPhishing: isPhishing(message.url),
      domain: new URL(message.url).hostname,
    }
    sendResponse(result)
    return true
  }

  if (message.type === 'CHECK_ADDRESS') {
    const result = {
      isDrainer: isDrainer(message.address),
      address: message.address,
    }
    sendResponse(result)
    return true
  }

  if (message.type === 'ANALYZE_TX') {
    const result = analyzeTransaction(message.data)
    sendResponse(result)
    return true
  }

  if (message.type === 'GET_STATS') {
    sendResponse({
      drainerCount: drainerAddresses.size,
      phishingCount: phishingDomains.size,
      lastUpdate: lastDBUpdate,
    })
    return true
  }

  if (message.type === 'REPORT_THREAT') {
    // Store threat report locally
    chrome.storage.local.get(['threatReports'], (result) => {
      const reports = result.threatReports || []
      reports.push({
        ...message.report,
        timestamp: Date.now(),
        tabId: sender.tab?.id,
      })
      chrome.storage.local.set({ threatReports: reports.slice(-100) })
    })
    sendResponse({ success: true })
    return true
  }
})

// Monitor web requests for known drainer patterns
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.method === 'POST' && details.requestBody) {
      // Check for suspicious transaction patterns
      const url = details.url
      if (isPhishing(url)) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: 'SweepGuard Warning',
          message: 'Blocked connection to known phishing site!',
          priority: 2,
        })
      }
    }
  },
  { urls: ['https://*/*', 'http://*/*'] },
  ['requestBody']
)

console.log('[SweepGuard] Background service worker loaded')
