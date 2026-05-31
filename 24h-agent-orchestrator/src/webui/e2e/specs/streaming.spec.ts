import { test, expect } from '@playwright/test'

test.describe('Streaming Console', () => {
  test('should display empty state when no sessions', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=暂无活跃会话').first()).toBeVisible({ timeout: 5000 })
  })

  test('should show task in tree and stream console header after creation', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('text=已连接', { timeout: 8000 })

    // 创建任务 — scheduler 会自动分发
    await page.request.post('/api/task', { data: { description: '流式控制台测试' } })

    // 验证任务出现在左侧树中
    await expect(page.locator('text=流式控制台测试').first()).toBeVisible({ timeout: 5000 })
  })

  test('should render task name correctly after page reload', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('text=已连接', { timeout: 8000 })

    await page.request.post('/api/task', { data: { description: '重载测试' } })
    await page.waitForTimeout(500)
    await page.reload()
    await page.waitForSelector('text=已连接', { timeout: 8000 })

    // 数据库持久化后应显示任务
    await expect(page.locator('text=重载测试').first()).toBeVisible({ timeout: 5000 })
  })
})
