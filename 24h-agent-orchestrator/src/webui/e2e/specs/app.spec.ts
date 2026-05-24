import { test, expect } from '@playwright/test'

test.describe('WebUI Application', () => {
  test('should load the page and show title', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=24h Agent')).toBeVisible()
  })

  test('should render task sidebar with empty state', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=暂无任务')).toBeVisible()
  })

  test('should show language switch button', async ({ page }) => {
    await page.goto('/')
    const langBtn = page.locator('button:has-text("English")')
    await expect(langBtn).toBeVisible()
  })

  test('should show permission selector', async ({ page }) => {
    await page.goto('/')
    const select = page.locator('select')
    await expect(select).toBeVisible()
    await expect(select).toHaveValue('safe')
  })

  test('should show task input and add button', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('input[type="text"]')).toBeVisible()
    await expect(page.locator('button:has-text("添加任务")')).toBeVisible()
  })

  test('should show tab buttons', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=流式控制台')).toBeVisible()
    await expect(page.locator('text=时间线')).toBeVisible()
  })

  test('should show connection status indicator', async ({ page }) => {
    await page.goto('/')
    // 连接状态显示（WebSocket 连接中或已断开）
    const statusText = page.locator('text=未连接')
    await expect(statusText).toBeVisible()
  })
})
