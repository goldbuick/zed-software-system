import { expect, test } from '@playwright/test'

test('smoke loads canvas frame', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#frame')).toBeVisible()
})
