import { test, expect } from '@playwright/test'

test.describe('Internationalization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display Chinese text by default', async ({ page }) => {
    await expect(page.locator('text=24h Agent 编排器')).toBeVisible()
    await expect(page.locator('text=流式控制台')).toBeVisible()
    await expect(page.locator('text=添加任务')).toBeVisible()
    await expect(page.locator('text=暂无任务')).toBeVisible()
    await expect(page.locator('text=无活跃 Agent')).toBeVisible()
    await expect(page.getByRole('combobox')).toHaveValue('safe')
  })

  test('should switch to English when clicking language button', async ({ page }) => {
    const langBtn = page.locator('button:has-text("English")')
    await langBtn.click()

    await expect(page.locator('button:has-text("中文")')).toBeVisible()
  })

  test('should toggle back and forth between languages', async ({ page }) => {
    const langBtn = page.locator('button:has-text("English")')
    await langBtn.click()
    await expect(page.locator('button:has-text("中文")').first()).toBeVisible()

    const chineseBtn = page.locator('button:has-text("中文")')
    await chineseBtn.click()
    await expect(page.locator('button:has-text("English")').first()).toBeVisible()
  })
})
