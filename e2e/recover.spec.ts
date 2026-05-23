import { test, expect } from '@playwright/test'

test.describe('Recover Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/recover')
  })

  test('loads successfully', async ({ page }) => {
    await expect(page.getByText('Fund Recovery')).toBeVisible()
  })

  test('displays step indicator', async ({ page }) => {
    await expect(page.getByText('Enter Keys')).toBeVisible()
    await expect(page.getByText('Review')).toBeVisible()
    await expect(page.getByText('Recover')).toBeVisible()
  })

  test('private key input works', async ({ page }) => {
    const input = page.getByPlaceholder(/Paste the private key/)
    await expect(input).toBeVisible()
    await input.fill('0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890')
    await expect(input).not.toBeEmpty()
  })

  test('safe wallet address input works', async ({ page }) => {
    const input = page.getByPlaceholder(/where to send recovered funds/)
    await expect(input).toBeVisible()
    await input.fill('0x1234567890abcdef1234567890abcdef12345678')
    await expect(input).toHaveValue('0x1234567890abcdef1234567890abcdef12345678')
  })

  test('sponsor key input works', async ({ page }) => {
    const input = page.getByPlaceholder(/Private key of a SEPARATE wallet/)
    await expect(input).toBeVisible()
  })

  test('scan button is disabled when private key is empty', async ({ page }) => {
    const button = page.getByRole('button', { name: 'Scan all chains for assets' })
    await expect(button).toBeDisabled()
  })

  test('how it works section expands and collapses', async ({ page }) => {
    const toggle = page.getByText('How It Works')
    await expect(toggle).toBeVisible()

    // Click to expand
    await toggle.click()
    await expect(page.getByText('Fund Recovery (80/20 Split)')).toBeVisible()
    await expect(page.getByText('One-Click Revoke')).toBeVisible()

    // Click to collapse
    await toggle.click()
    await expect(page.getByText('Fund Recovery (80/20 Split)')).not.toBeVisible()
  })

  test('rules and fees section expands and collapses', async ({ page }) => {
    const toggle = page.getByText('Rules & Fees')
    await expect(toggle).toBeVisible()

    // Click to expand
    await toggle.click()
    await expect(page.getByText(/80% of recovered tokens/)).toBeVisible()
    await expect(page.getByText(/20% platform fee/)).toBeVisible()

    // Click to collapse
    await toggle.click()
    await expect(page.getByText(/80% of recovered tokens/)).not.toBeVisible()
  })

  test('show/hide private key toggle works', async ({ page }) => {
    const input = page.getByPlaceholder(/Paste the private key/)
    const toggle = page.getByRole('button', { name: 'Show private key' })

    // Initially password type
    await expect(input).toHaveAttribute('type', 'password')

    // Click show
    await toggle.click()
    await expect(input).toHaveAttribute('type', 'text')

    // Click hide
    await page.getByRole('button', { name: 'Hide private key' }).click()
    await expect(input).toHaveAttribute('type', 'password')
  })

  test('navigation links work', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Scan' })).toHaveAttribute('href', '/scan')
    await expect(page.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard')
  })
})
