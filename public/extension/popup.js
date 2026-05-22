// SweepGuard Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  // Get stats from background
  chrome.runtime.sendMessage({ type: 'GET_STATS' }, (stats) => {
    if (stats) {
      document.getElementById('drainer-count').textContent = `${stats.drainerCount.toLocaleString()} drainers`
      document.getElementById('phishing-count').textContent = `${stats.phishingCount.toLocaleString()} domains`
    }
  })

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (tab?.url) {
    try {
      const domain = new URL(tab.url).hostname
      document.getElementById('current-site').textContent = domain.slice(0, 20) + (domain.length > 20 ? '...' : '')

      // Check if phishing
      chrome.runtime.sendMessage({ type: 'CHECK_URL', url: tab.url }, (result) => {
        if (result?.isPhishing) {
          document.getElementById('site-risk').textContent = '⚠️ Phishing!'
          document.getElementById('site-risk').className = 'status-value danger'
        }
      })

      // Check if drainer
      chrome.runtime.sendMessage({ type: 'CHECK_ADDRESS', address: domain }, (result) => {
        if (result?.isDrainer) {
          document.getElementById('site-risk').textContent = '🚨 Drainer!'
          document.getElementById('site-risk').className = 'status-value danger'
        }
      })
    } catch { /* invalid URL */ }
  }

  // Scan button
  document.getElementById('scan-btn').addEventListener('click', async () => {
    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (currentTab?.url) {
      chrome.runtime.sendMessage({ type: 'CHECK_URL', url: currentTab.url }, (result) => {
        if (result?.isPhishing) {
          alert('⚠️ WARNING: This site is in our phishing database!')
        } else {
          alert('✅ This site appears safe.')
        }
      })
    }
  })

  // Dashboard button
  document.getElementById('dashboard-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://sweeptsguard.vercel.app/dashboard' })
  })
})
