import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 120_000 })

test('smoke loads canvas frame', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#frame')).toBeVisible()
})
