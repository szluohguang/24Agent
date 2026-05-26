import { test, expect } from '@playwright/test'

test.describe('Health Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should show empty agent state in health dashboard', async ({ page }) => {
    await expect(page.locator('text=无活跃 Agent')).toBeVisible()
    await expect(page.getByText('活跃', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('状态', { exact: true }).first()).toBeVisible()
  })
})

test.describe('Settings Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should open settings modal and show schedule manager', async ({ page }) => {
    await page.getByTitle('设置').click()
    await expect(page.locator('text=设置')).toBeVisible()
    await expect(page.locator('text=定时任务管理')).toBeVisible()
    await expect(page.locator('text=暂无定时任务。')).toBeVisible()
  })

  test('should close settings modal when clicking the backdrop', async ({ page }) => {
    await page.getByTitle('设置').click()
    await expect(page.locator('text=设置')).toBeVisible()

    // Click top-left corner of the viewport to hit the modal backdrop
    await page.mouse.click(10, 10)
    await expect(page.locator('text=设置')).not.toBeVisible()
  })
})
