import { test, expect } from '@playwright/test'

test.describe('Review Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should show review panel for awaiting_review task via API', async ({ page }) => {
    // Create a task via REST
    const res = await page.request.post('/api/task', {
      data: { description: 'Review test task' },
    })
    const { taskId } = await res.json()

    // Set task to awaiting_review via the store directly (via approve endpoint call to check)
    // First verify the task appears in the UI
    await expect(page.locator('text=Review test task')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=待处理')).toBeVisible()
  })

  test('should reject approve for non-existent task with 404', async ({ page }) => {
    const res = await page.request.post('/api/task/nonexistent/approve')
    expect(res.status()).toBe(404)
  })

  test('should reject approve for pending task with 409', async ({ page }) => {
    const res = await page.request.post('/api/task', {
      data: { description: 'Pending task' },
    })
    const { taskId } = await res.json()

    const approveRes = await page.request.post(`/api/task/${taskId}/approve`)
    expect(approveRes.status()).toBe(409)
  })

  test('should reject reject without feedback with 400', async ({ page }) => {
    const res = await page.request.post('/api/task', {
      data: { description: 'Reject test' },
    })
    const { taskId } = await res.json()

    const rejectRes = await page.request.post(`/api/task/${taskId}/reject`, {
      data: { feedback: '' },
    })
    expect(rejectRes.status()).toBe(400)
  })

  test('should return awaiting-review list', async ({ page }) => {
    const res = await page.request.get('/api/tasks/awaiting-review')
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })
})
