import { test, expect } from '@playwright/test'

test.describe('Internationalization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display Chinese text by default', async ({ page }) => {
    await expect(page.locator('text=24h Agent 编排器')).toBeVisible()
    await expect(page.getByText('任务', { exact: true })).toBeVisible()
    await expect(page.locator('text=流式控制台')).toBeVisible()
    await expect(page.locator('text=时间线')).toBeVisible()
    await expect(page.locator('text=添加任务')).toBeVisible()
    await expect(page.getByRole('combobox')).toHaveValue('safe')
  })

  test('should switch to English when clicking language button', async ({ page }) => {
    const langBtn = page.locator('button:has-text("English")')
    await langBtn.click()

    // 切换到英文后，按钮文字变成"中文", 英文翻译为空对象所以回显到app.title
    await expect(page.locator('button:has-text("中文")')).toBeVisible()
  })

  test('should toggle back and forth between languages', async ({ page }) => {
    const langBtn = page.locator('button:has-text("English")')
    await langBtn.click()
    await expect(page.locator('button:has-text("中文")')).toBeVisible()

    const chineseBtn = page.locator('button:has-text("中文")')
    await chineseBtn.click()
    await expect(page.locator('button:has-text("English")')).toBeVisible()
  })
})
