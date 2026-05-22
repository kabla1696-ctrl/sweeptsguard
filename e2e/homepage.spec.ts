import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('loads successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/SweepGuard/i)
  })

  test('displays the hero section', async ({ page }) => {
    await expect(page.getByText('Auto-Sweep')).toBeVisible()
    await expect(page.getByText('Protection')).toBeVisible()
  })

  test('navigation links are visible', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'EVM Scan' })).toBeVisible()
    await expect(page.getByRole('link', { name: /Solana/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Recover/ })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Airdrop' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible()
  })

  test('wallet address input works', async ({ page }) => {
    const input = page.getByPlaceholder('Enter compromised wallet address')
    await expect(input).toBeVisible()
    await input.fill('0x1234567890abcdef1234567890abcdef12345678')
    await expect(input).toHaveValue('0x1234567890abcdef1234567890abcdef12345678')
  })

  test('scan button navigates to scan page', async ({ page }) => {
    const input = page.getByPlaceholder('Enter compromised wallet address')
    await input.fill('0x1234567890abcdef1234567890abcdef12345678')
    const scanLink = page.getByRole('link', { name: /Scan Now/ })
    await expect(scanLink).toHaveAttribute('href', /\/scan\?address=/)
  })

  test('extension download link works', async ({ page }) => {
    const downloadLink = page.getByRole('link', { name: /Download Extension/ })
    await expect(downloadLink).toBeVisible()
    await expect(downloadLink).toHaveAttribute('href', /sweeptsguard-extension/)
  })

  test('all feature cards are visible', async ({ page }) => {
    const featureTitles = [
      'Multi-Chain Scanner',
      'Drainer Detection',
      'Fund Tracker',
      'Airdrop Claimer',
      'Gas Sponsor',
      'Auto-Sweep',
      'Multi-Channel Alerts',
      'Chrome Extension',
    ]
    for (const title of featureTitles) {
      await expect(page.getByText(title, { exact: false }).first()).toBeVisible()
    }
  })

  test('how it works section is visible', async ({ page }) => {
    await expect(page.getByText('How It Works')).toBeVisible()
    await expect(page.getByText('1. Scan')).toBeVisible()
    await expect(page.getByText('2. Track')).toBeVisible()
    await expect(page.getByText('3. Airdrop')).toBeVisible()
    await expect(page.getByText('4. Auto-Sweep')).toBeVisible()
  })

  test('stats section shows chain count', async ({ page }) => {
    await expect(page.getByText('34')).toBeVisible()
    await expect(page.getByText('Chains + Solana')).toBeVisible()
  })
})
