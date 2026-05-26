import { test, expect } from '@playwright/test'

test.describe('Task Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should show empty state before any tasks', async ({ page }) => {
    await expect(page.locator('text=暂无任务')).toBeVisible()
  })

  test('should display task created via REST API', async ({ page }) => {
    await page.request.post('/api/task', {
      data: { description: 'API Task Test' },
    })
    await expect(page.locator('text=API Task Test')).toBeVisible({ timeout: 5000 })
  })

  test('should display multiple tasks added via API', async ({ page }) => {
    for (let i = 1; i <= 3; i++) {
      await page.request.post('/api/task', {
        data: { description: `Task ${i}` },
      })
    }

    for (let i = 1; i <= 3; i++) {
      await expect(page.locator(`text=Task ${i}`)).toBeVisible({ timeout: 5000 })
    }
  })

  test('should show pending status for new task after reload', async ({ page }) => {
    await page.request.post('/api/task', {
      data: { description: 'Status check' },
    })
    await page.reload()
    await expect(page.locator('text=待处理').first()).toBeVisible({ timeout: 5000 })
  })

  test('should show dispatch button for pending task after reload', async ({ page }) => {
    await page.request.post('/api/task', {
      data: { description: 'Dispatchable task' },
    })
    await page.reload()
    await expect(page.locator('text=分发').first()).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Language Persistence', () => {
  test('should persist language selection after page reload', async ({ page }) => {
    await page.goto('/')
    await page.locator('button:has-text("English")').click()
    await expect(page.locator('button:has-text("中文")')).toBeVisible()

    await page.reload()
    await expect(page.locator('button:has-text("中文")')).toBeVisible()
  })

  test('should toggle language and verify UI text changes', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=24h Agent 编排器')).toBeVisible()

    await page.locator('button:has-text("English")').click()
    await expect(page.locator('text=24h Agent Orchestrator')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('button:has-text("中文")')).toBeVisible()
  })

  test('should apply language to health dashboard', async ({ page }) => {
    await page.goto('/')
    await page.locator('button:has-text("English")').click()
    await expect(page.locator('button:has-text("中文")')).toBeVisible()

    const noAgentText = page.getByText('No active', { exact: false })
    await expect(noAgentText.first()).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Settings Modal Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should open settings and show schedule form on create click', async ({ page }) => {
    await page.getByTitle('设置').click()
    await expect(page.locator('text=定时任务管理')).toBeVisible()

    await page.locator('text=创建定时任务').click()
    await expect(page.getByPlaceholder('Cron 表达式（如 0 9 * * 1）')).toBeVisible()
  })

  test('should close settings by clicking backdrop', async ({ page }) => {
    await page.getByTitle('设置').click()
    await expect(page.locator('text=定时任务管理')).toBeVisible()

    await page.mouse.click(10, 10)
    await expect(page.locator('text=定时任务管理')).not.toBeVisible()
  })
})

test.describe('Connection Status', () => {
  test('should show connected status after WebSocket connects', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=已连接')).toBeVisible({ timeout: 5000 })
  })

  test('should show permission selector with safe default', async ({ page }) => {
    await page.goto('/')
    const select = page.locator('select')
    await expect(select).toHaveValue('safe')
  })
})
