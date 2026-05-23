import { test, expect } from '@playwright/test'

test.describe('Scan Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/scan')
  })

  test('loads successfully', async ({ page }) => {
    await expect(page.getByText('Wallet Scanner')).toBeVisible()
  })

  test('displays scan description', async ({ page }) => {
    await expect(page.getByText(/Check for suspicious permissions/)).toBeVisible()
  })

  test('address input is visible and functional', async ({ page }) => {
    const input = page.getByPlaceholder('Enter wallet address (0x...)')
    await expect(input).toBeVisible()
    await input.fill('0x1234567890abcdef1234567890abcdef12345678')
    await expect(input).toHaveValue('0x1234567890abcdef1234567890abcdef12345678')
  })

  test('scan button exists and has correct label', async ({ page }) => {
    const button = page.getByRole('button', { name: 'Scan wallet address' })
    await expect(button).toBeVisible()
    await expect(button).toBeEnabled()
  })

  test('what this scan checks section is visible', async ({ page }) => {
    await expect(page.getByText('What this scan checks')).toBeVisible()
    await expect(page.getByText('Delegations')).toBeVisible()
    await expect(page.getByText('Assets')).toBeVisible()
    await expect(page.getByText('NFTs')).toBeVisible()
    await expect(page.getByText('Drainer activity')).toBeVisible()
  })

  test('scan with address from URL param', async ({ page }) => {
    await page.goto('/scan?address=0x1234567890abcdef1234567890abcdef12345678')
    const input = page.getByPlaceholder('Enter wallet address (0x...)')
    await expect(input).toHaveValue('0x1234567890abcdef1234567890abcdef12345678')
  })

  test('back to home link works', async ({ page }) => {
    const homeLink = page.getByRole('link', { name: 'SweepGuard' })
    await expect(homeLink).toHaveAttribute('href', '/')
  })
})
