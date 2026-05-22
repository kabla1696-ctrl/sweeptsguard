import { test, expect } from '@playwright/test'

test.describe('Airdrop Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/airdrop')
  })

  test('loads successfully', async ({ page }) => {
    await expect(page.getByText('Airdrop Claimer')).toBeVisible()
  })

  test('displays security badge', async ({ page }) => {
    await expect(page.getByText(/Two Claim Modes/)).toBeVisible()
  })

  test('guide section is visible by default', async ({ page }) => {
    await expect(page.getByText('How to Claim — Complete Guide')).toBeVisible()
  })

  test('guide section toggles', async ({ page }) => {
    const toggle = page.getByRole('button', { name: 'Toggle claim guide' })

    // Guide is visible by default
    await expect(page.getByText(/CRITICAL WARNING/)).toBeVisible()

    // Click to hide
    await toggle.click()
    await expect(page.getByText(/CRITICAL WARNING/)).not.toBeVisible()

    // Click to show again
    await toggle.click()
    await expect(page.getByText(/CRITICAL WARNING/)).toBeVisible()
  })

  test('wizard step 1: chain selector works', async ({ page }) => {
    // Chain selector button should be visible
    const chainButton = page.getByRole('button').filter({ hasText: /Base.*Recommended/ })
    await expect(chainButton).toBeVisible()

    // Click to open dropdown
    await chainButton.click()

    // Should show chain options
    await expect(page.getByText('Ethereum (ETH)')).toBeVisible()
    await expect(page.getByText('Arbitrum (ETH)')).toBeVisible()
    await expect(page.getByText('Polygon (MATIC)')).toBeVisible()

    // Select a different chain
    await page.getByText('Ethereum (ETH)').click()

    // Dropdown should close and selection should update
    await expect(page.getByRole('button').filter({ hasText: 'Ethereum' })).toBeVisible()
  })

  test('wizard step 1: contract address input works', async ({ page }) => {
    const input = page.getByPlaceholder('0x... (NOT the token address)')
    await expect(input).toBeVisible()
    await input.fill('0x1234567890abcdef1234567890abcdef12345678')
    await expect(input).toHaveValue('0x1234567890abcdef1234567890abcdef12345678')
  })

  test('wizard step 1: next button disabled without contract', async ({ page }) => {
    const nextBtn = page.getByRole('button', { name: /Next: Wallet Setup/ })
    await expect(nextBtn).toBeDisabled()
  })

  test('wizard navigation: step 1 to step 2', async ({ page }) => {
    // Fill contract address
    await page.getByPlaceholder('0x... (NOT the token address)').fill('0x1234567890abcdef1234567890abcdef12345678')

    // Click next
    await page.getByRole('button', { name: /Next: Wallet Setup/ }).click()

    // Step 2 should be visible
    await expect(page.getByText('Wallet Setup')).toBeVisible()
    await expect(page.getByText('Your Hacked Wallet Address')).toBeVisible()
    await expect(page.getByText('Safe Wallet Address')).toBeVisible()
    await expect(page.getByText('Sponsor Wallet Address')).toBeVisible()
  })

  test('wizard navigation: step 2 inputs work', async ({ page }) => {
    // Navigate to step 2
    await page.getByPlaceholder('0x... (NOT the token address)').fill('0x1234567890abcdef1234567890abcdef12345678')
    await page.getByRole('button', { name: /Next: Wallet Setup/ }).click()

    // Fill wallet addresses
    const hackedInput = page.getByPlaceholder('0x...').first()
    await hackedInput.fill('0xaaaa1234567890abcdef1234567890abcdef1234')

    const safeInput = page.locator('input[placeholder="0x..."]').nth(1)
    await safeInput.fill('0xbbbb1234567890abcdef1234567890abcdef1234')

    const sponsorInput = page.locator('input[placeholder="0x..."]').nth(2)
    await sponsorInput.fill('0xcccc1234567890abcdef1234567890abcdef1234')
  })

  test('wizard navigation: back button works', async ({ page }) => {
    // Navigate to step 2
    await page.getByPlaceholder('0x... (NOT the token address)').fill('0x1234567890abcdef1234567890abcdef12345678')
    await page.getByRole('button', { name: /Next: Wallet Setup/ }).click()
    await expect(page.getByText('Wallet Setup')).toBeVisible()

    // Click back
    await page.getByRole('button', { name: /Back/ }).click()

    // Should be back on step 1
    await expect(page.getByText('Select Chain & Contract')).toBeVisible()
  })

  test('progress bar shows current step', async ({ page }) => {
    // Step 1 should be highlighted
    const step1 = page.locator('.rounded-full').filter({ hasText: '1' }).first()
    await expect(step1).toBeVisible()

    // Fill and advance
    await page.getByPlaceholder('0x... (NOT the token address)').fill('0x1234567890abcdef1234567890abcdef12345678')
    await page.getByRole('button', { name: /Next: Wallet Setup/ }).click()

    // Step 2 should now be highlighted
    await expect(page.getByText('Wallet Setup')).toBeVisible()
  })

  test('navigation links work', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Scan' })).toHaveAttribute('href', '/scan')
    await expect(page.getByRole('link', { name: 'Tracker' })).toHaveAttribute('href', '/tracker')
    await expect(page.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard')
  })
})
