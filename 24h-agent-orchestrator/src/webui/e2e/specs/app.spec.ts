import { test, expect } from '@playwright/test'

test.describe('WebUI Application', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should load the page and show title', async ({ page }) => {
    await expect(page.locator('text=24h Agent')).toBeVisible()
  })

  test('should render task sidebar with empty state', async ({ page }) => {
    await expect(page.locator('text=暂无任务')).toBeVisible()
  })

  test('should show language switch button', async ({ page }) => {
    const langBtn = page.locator('button:has-text("English")')
    await expect(langBtn).toBeVisible()
  })

  test('should show permission selector', async ({ page }) => {
    const select = page.locator('select')
    await expect(select).toBeVisible()
    await expect(select).toHaveValue('safe')
  })

  test('should show task input and add button in sidebar', async ({ page }) => {
    await expect(page.locator('input[type="text"]')).toBeVisible()
    await expect(page.locator('button:has-text("添加任务")')).toBeVisible()
  })

  test('should show stream console column header', async ({ page }) => {
    await expect(page.locator('text=流式控制台')).toBeVisible()
  })

  test('should show connection status indicator', async ({ page }) => {
    const statusText = page.locator('text=未连接')
    await expect(statusText).toBeVisible()
  })

  test('should show health dashboard with agent table and system overview', async ({ page }) => {
    await expect(page.locator('text=无活跃 Agent')).toBeVisible()
    await expect(page.getByText('活跃', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('状态', { exact: true }).first()).toBeVisible()
  })

  test('should show settings gear button and open modal', async ({ page }) => {
    const gearBtn = page.getByTitle('设置')
    await expect(gearBtn).toBeVisible()
    await gearBtn.click()
    await expect(page.locator('text=定时任务管理')).toBeVisible()
  })
})
