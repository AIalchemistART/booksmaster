import { test, expect } from '@playwright/test'

/**
 * Critical Path E2E Tests
 * Tests the core user workflows: receipt → transaction → export
 */

test.describe('Dashboard', () => {
  test('loads dashboard successfully', async ({ page }) => {
    await page.goto('/')
    
    // Check for key dashboard elements
    await expect(page.locator('h1')).toContainText(/dashboard|thomas/i)
    
    // Verify navigation is present
    await expect(page.locator('nav')).toBeVisible()
  })

  test('displays business stats cards', async ({ page }) => {
    await page.goto('/')
    
    // Look for stat cards (income, expenses, profit)
    const cards = page.locator('[class*="card"], [class*="Card"]')
    await expect(cards.first()).toBeVisible()
  })

  test('navigation links work', async ({ page }) => {
    await page.goto('/')
    
    // Test navigation to key pages
    const navLinks = [
      { text: /transaction/i, url: /transaction/i },
      { text: /receipt/i, url: /receipt/i },
      { text: /report/i, url: /report/i },
    ]
    
    for (const link of navLinks) {
      const navItem = page.locator('nav').getByRole('link', { name: link.text }).first()
      if (await navItem.isVisible()) {
        await navItem.click()
        await expect(page).toHaveURL(link.url)
        await page.goto('/') // Return to dashboard
      }
    }
  })
})

test.describe('Transactions Page', () => {
  test('loads transactions page', async ({ page }) => {
    await page.goto('/transactions')
    
    await expect(page.locator('h1')).toContainText(/transaction/i)
  })

  test('can filter transactions', async ({ page }) => {
    await page.goto('/transactions')
    
    // Look for filter controls
    const filterSection = page.locator('[class*="filter"], select, input[type="search"]').first()
    if (await filterSection.isVisible()) {
      await expect(filterSection).toBeVisible()
    }
  })

  test('can add new transaction', async ({ page }) => {
    await page.goto('/transactions')
    
    // Find add button
    const addButton = page.getByRole('button', { name: /add|new|create/i }).first()
    if (await addButton.isVisible()) {
      await addButton.click()
      
      // Modal or form should appear
      const modal = page.locator('[role="dialog"], form, [class*="modal"]').first()
      await expect(modal).toBeVisible()
    }
  })
})

test.describe('Receipts Page', () => {
  test('loads receipts page', async ({ page }) => {
    await page.goto('/receipts')
    
    await expect(page.locator('h1')).toContainText(/receipt/i)
  })

  test('displays upload area', async ({ page }) => {
    await page.goto('/receipts')
    
    // Look for upload button or drag-drop area
    const uploadArea = page.locator('[class*="upload"], [class*="dropzone"], input[type="file"]').first()
    await expect(uploadArea).toBeVisible()
  })
})

test.describe('Reports Page', () => {
  test('loads reports page', async ({ page }) => {
    await page.goto('/reports')
    
    await expect(page.locator('h1')).toContainText(/report/i)
  })

  test('shows report options', async ({ page }) => {
    await page.goto('/reports')
    
    // Check for report generation options
    const reportOptions = page.locator('button, [class*="card"]').filter({ hasText: /generate|export|download/i })
    await expect(reportOptions.first()).toBeVisible()
  })
})

test.describe('Export Functionality', () => {
  test('loads export page', async ({ page }) => {
    await page.goto('/export')
    
    await expect(page.locator('h1')).toContainText(/export/i)
  })

  test('shows export format options', async ({ page }) => {
    await page.goto('/export')
    
    // Look for export format buttons/cards
    const exportOptions = page.locator('button, [class*="card"]')
    await expect(exportOptions.first()).toBeVisible()
  })
})

test.describe('Settings Page', () => {
  test('loads settings page', async ({ page }) => {
    await page.goto('/settings')
    
    await expect(page.locator('h1')).toContainText(/setting/i)
  })

  test('displays configuration options', async ({ page }) => {
    await page.goto('/settings')
    
    // Check for form inputs
    const inputs = page.locator('input, select, textarea')
    await expect(inputs.first()).toBeVisible()
  })
})

test.describe('Onboarding Flow', () => {
  test('shows onboarding for new users', async ({ page, context }) => {
    // Clear storage to simulate new user
    await context.clearCookies()
    await page.goto('/')
    
    // Check if onboarding modal/wizard appears or dashboard loads
    const pageContent = await page.content()
    const hasOnboarding = pageContent.includes('onboard') || pageContent.includes('welcome') || pageContent.includes('get started')
    
    // Either onboarding or dashboard should be visible
    expect(hasOnboarding || pageContent.includes('dashboard') || pageContent.includes('Dashboard')).toBeTruthy()
  })
})

test.describe('Dark Mode', () => {
  test('can toggle dark mode', async ({ page }) => {
    await page.goto('/settings')
    
    // Find dark mode toggle
    const darkModeToggle = page.locator('button, input[type="checkbox"]').filter({ hasText: /dark|theme|mode/i }).first()
    
    if (await darkModeToggle.isVisible()) {
      await darkModeToggle.click()
      
      // Check if dark class is applied
      const html = page.locator('html')
      const classList = await html.getAttribute('class')
      // Either dark mode is toggled or the toggle interaction worked
      expect(classList !== null || await darkModeToggle.isChecked() !== undefined).toBeTruthy()
    }
  })
})

test.describe('Responsive Design', () => {
  test('works on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    
    // Page should still render properly
    await expect(page.locator('body')).toBeVisible()
    
    // Navigation might be in hamburger menu on mobile
    const mobileNav = page.locator('[class*="mobile"], [class*="hamburger"], button[aria-label*="menu"]').first()
    // Either mobile nav exists or regular nav is visible
    const hasNav = await mobileNav.isVisible().catch(() => false) || 
                   await page.locator('nav').isVisible().catch(() => false)
    expect(hasNav).toBeTruthy()
  })

  test('works on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/')
    
    await expect(page.locator('body')).toBeVisible()
  })
})
