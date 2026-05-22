import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test('homepage loads at root', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Auto-Sweep')).toBeVisible()
  })

  test('scan page is accessible', async ({ page }) => {
    await page.goto('/scan')
    await expect(page.getByText('Wallet Scanner')).toBeVisible()
  })

  test('recover page is accessible', async ({ page }) => {
    await page.goto('/recover')
    await expect(page.getByText('Fund Recovery')).toBeVisible()
  })

  test('airdrop page is accessible', async ({ page }) => {
    await page.goto('/airdrop')
    await expect(page.getByText('Airdrop Claimer')).toBeVisible()
  })

  test('dashboard page is accessible', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText('Dashboard', { exact: false }).first()).toBeVisible()
  })

  test('tracker page is accessible', async ({ page }) => {
    await page.goto('/tracker')
    await expect(page.getByText('Tracker', { exact: false }).first()).toBeVisible()
  })

  test('wallets page is accessible', async ({ page }) => {
    await page.goto('/wallets')
    await expect(page.getByText('Wallet', { exact: false }).first()).toBeVisible()
  })

  test('history page is accessible', async ({ page }) => {
    await page.goto('/history')
    await expect(page.getByText('History', { exact: false }).first()).toBeVisible()
  })

  test('gas page is accessible', async ({ page }) => {
    await page.goto('/gas')
    await expect(page.getByText('Gas', { exact: false }).first()).toBeVisible()
  })

  test('bridge page is accessible', async ({ page }) => {
    await page.goto('/bridge')
    await expect(page.getByText('Bridge', { exact: false }).first()).toBeVisible()
  })

  test('portfolio page is accessible', async ({ page }) => {
    await page.goto('/portfolio')
    await expect(page.getByText('Portfolio', { exact: false }).first()).toBeVisible()
  })

  test('defi page is accessible', async ({ page }) => {
    await page.goto('/defi')
    await expect(page.getByText('DeFi', { exact: false }).first()).toBeVisible()
  })

  test('audit page is accessible', async ({ page }) => {
    await page.goto('/audit')
    await expect(page.getByText('Audit', { exact: false }).first()).toBeVisible()
  })

  test('reputation page is accessible', async ({ page }) => {
    await page.goto('/reputation')
    await expect(page.getByText('Reputation', { exact: false }).first()).toBeVisible()
  })

  test('homepage navigation links go to correct pages', async ({ page }) => {
    await page.goto('/')

    // Test EVM Scan link
    const scanLink = page.getByRole('link', { name: 'EVM Scan' })
    await expect(scanLink).toHaveAttribute('href', '/scan')

    // Test Recover link
    const recoverLink = page.getByRole('link', { name: /Recover/ })
    await expect(recoverLink).toHaveAttribute('href', '/recover')

    // Test Airdrop link
    const airdropLink = page.getByRole('link', { name: 'Airdrop' })
    await expect(airdropLink).toHaveAttribute('href', '/airdrop')
  })

  test('scan page back link goes to homepage', async ({ page }) => {
    await page.goto('/scan')
    const homeLink = page.getByRole('link', { name: 'SweepGuard' })
    await expect(homeLink).toHaveAttribute('href', '/')
  })

  test('recover page nav links work', async ({ page }) => {
    await page.goto('/recover')
    await expect(page.getByRole('link', { name: 'Scan' })).toHaveAttribute('href', '/scan')
    await expect(page.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard')
  })

  test('footer links work', async ({ page }) => {
    await page.goto('/')

    // Footer should have GitHub link
    const githubLink = page.getByRole('link', { name: 'GitHub' })
    await expect(githubLink).toBeVisible()
    await expect(githubLink).toHaveAttribute('href', /github\.com/)
  })
})
