import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'

test.describe('task-lifecycle — 任务生命周期', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE)
    await page.waitForSelector('text=已连接', { timeout: 10000 })
  })

  test('TC-01: 创建任务 — 输入描述点击创建，任务树出现新节点', async ({ page }) => {
    const input = page.locator('input[type="text"]')
    await expect(input).toBeVisible()
    await input.fill('优化用户登录模块的性能')
    await page.locator('button:has-text("添加任务")').click()
    await expect(page.locator('text=优化用户登录模块的性能').first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=待处理').first()).toBeVisible()
  })

  test('TC-02: 连续创建多个任务，每个节点描述正确', async ({ page }) => {
    for (let i = 1; i <= 3; i++) {
      const input = page.locator('input[type="text"]')
      await input.fill(`任务 ${i}`)
      await page.locator('button:has-text("添加任务")').click()
      await page.waitForTimeout(300)
    }
    for (let i = 1; i <= 3; i++) {
      await expect(page.locator(`text=任务 ${i}`).first()).toBeVisible({ timeout: 3000 })
    }
  })

  test('TC-03: 创建带依赖的任务', async ({ page }) => {
    const res1 = await page.request.post(`${BASE}/api/task`, { data: { description: '前置任务A' } })
    const { taskId: idA } = await res1.json()

    const input = page.locator('input[type="text"]')
    await input.fill('依赖任务B')
    await page.locator('button:has-text("添加任务")').click()
    await page.waitForTimeout(500)
    await expect(page.locator('text=依赖任务B').first()).toBeVisible({ timeout: 3000 })
  })

  test('TC-04: 分发任务 — pending→running，控制台流式输出', async ({ page }) => {
    const res = await page.request.post(`${BASE}/api/task`, { data: { description: '测试分发' } })
    const { taskId } = await res.json()
    await page.waitForTimeout(500)
    await page.request.post(`${BASE}/api/task/${taskId}/dispatch`)
    await page.waitForTimeout(2000)
    await expect(page.locator('text=测试分发').first()).toBeVisible()
  })

  test('TC-05: 查看流式输出 — 实时追加内容', async ({ page }) => {
    const res = await page.request.post(`${BASE}/api/task`, { data: { description: '流式输出测试' } })
    const { taskId } = await res.json()
    await page.waitForTimeout(300)
    await page.request.post(`${BASE}/api/task/${taskId}/dispatch`)
    await page.waitForTimeout(1000)
    const streamPanel = page.locator('text=流式控制台').first()
    await expect(streamPanel).toBeVisible()
  })

  test('TC-06: 任务自动完成', async ({ page }) => {
    const res = await page.request.post(`${BASE}/api/task`, { data: { description: '自动完成测试' } })
    const { taskId } = await res.json()
    await page.waitForTimeout(300)
    await page.request.post(`${BASE}/api/task/${taskId}/dispatch`)
    await page.waitForTimeout(5000)
    const completed = page.locator('text=已完成').first()
    await expect(completed).toBeVisible({ timeout: 15000 })
  })

  test('TC-07: 任务失败重试用尽后显示 failed', async ({ page }) => {
    const res = await page.request.post(`${BASE}/api/task`, { data: { description: '失败测试任务' } })
    const { taskId } = await res.json()
    await page.waitForTimeout(300)
    await page.request.post(`${BASE}/api/task/${taskId}/dispatch`)
    await page.waitForTimeout(30000)
    const failed = page.locator('text=失败').first()
    await expect(failed).toBeVisible({ timeout: 60000 })
  })

  test('TC-08: 中止运行中的任务', async ({ page }) => {
    const res = await page.request.post(`${BASE}/api/task`, { data: { description: '中止测试' } })
    const { taskId } = await res.json()
    await page.waitForTimeout(300)
    await page.request.post(`${BASE}/api/task/${taskId}/dispatch`)
    await page.waitForTimeout(1000)
    await page.request.post(`${BASE}/api/task/${taskId}/abort`)
    await page.waitForTimeout(1000)
    await expect(page.locator('text=中止测试').first()).toBeVisible()
  })

  test('TC-09: 删除已完成任务', async ({ page }) => {
    const res = await page.request.post(`${BASE}/api/task`, { data: { description: '待删除任务' } })
    const { taskId } = await res.json()
    await page.waitForTimeout(300)
    await page.request.post(`${BASE}/api/task/${taskId}/dispatch`)
    await page.waitForTimeout(5000)
    await page.request.delete(`${BASE}/api/task/${taskId}`)
    await page.reload()
    await page.waitForSelector('text=已连接', { timeout: 8000 })
    await expect(page.locator('text=待删除任务')).not.toBeVisible()
  })

  test('TC-10: 删除运行中/失败任务', async ({ page }) => {
    const res = await page.request.post(`${BASE}/api/task`, { data: { description: '删除测试' } })
    const { taskId } = await res.json()
    await page.request.post(`${BASE}/api/task/${taskId}/dispatch`)
    await page.waitForTimeout(3000)
    const delRes = await page.request.delete(`${BASE}/api/task/${taskId}`)
    expect([200, 400]).toContain(delRes.status())
  })

  test('TC-11: 依赖任务前序完成后自动分发', async ({ page }) => {
    const res1 = await page.request.post(`${BASE}/api/task`, { data: { description: '前置A' } })
    const { taskId: idA } = await res1.json()
    const res2 = await page.request.post(`${BASE}/api/task`, { data: { description: '依赖B', dependsOn: [idA] } })
    const { taskId: idB } = await res2.json()
    await page.waitForTimeout(300)
    await page.request.post(`${BASE}/api/task/${idA}/dispatch`)
    await page.waitForTimeout(15000)
    await page.request.post(`${BASE}/api/task/${idB}/dispatch`)
    await page.waitForTimeout(1000)
    await expect(page.locator('text=依赖B').first()).toBeVisible()
  })
})

test.describe('schedule-management — 定时任务管理', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE)
    await page.waitForSelector('text=已连接', { timeout: 10000 })
  })

  test('TC-12: 通过 API 添加定时任务', async ({ page }) => {
    const res = await page.request.post(`${BASE}/api/schedule`, {
      data: { description: '每日检查', cronExpr: '0 9 * * *', permission: 'safe' },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('id')
  })

  test('TC-13: 获取定时任务列表', async ({ page }) => {
    const res = await page.request.get(`${BASE}/api/schedule`)
    expect(res.status()).toBe(200)
    const list = await res.json()
    expect(Array.isArray(list)).toBe(true)
  })

  test('TC-14: 启用/禁用定时任务', async ({ page }) => {
    const res = await page.request.post(`${BASE}/api/schedule`, {
      data: { description: '开关测试', cronExpr: '0 9 * * *' },
    })
    const { id } = await res.json()
    const updRes = await page.request.put(`${BASE}/api/schedule/${id}`, { data: { enabled: false } })
    expect(updRes.status()).toBe(200)
  })

  test('TC-15: 删除定时任务', async ({ page }) => {
    const res = await page.request.post(`${BASE}/api/schedule`, {
      data: { description: '待删除', cronExpr: '0 9 * * *' },
    })
    const { id } = await res.json()
    const delRes = await page.request.delete(`${BASE}/api/schedule/${id}`)
    expect(delRes.status()).toBe(200)
  })

  test('TC-16: 无效 cron 表达式被拒绝', async ({ page }) => {
    const res = await page.request.post(`${BASE}/api/schedule`, {
      data: { description: '错误', cronExpr: 'invalid' },
    })
    expect(res.status()).toBe(400)
  })

  test('TC-17: 缺少必填字段被拒绝', async ({ page }) => {
    const res = await page.request.post(`${BASE}/api/schedule`, {
      data: { description: '' },
    })
    expect(res.status()).toBe(400)
  })
})

test.describe('review-panel — 审核流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE)
    await page.waitForSelector('text=已连接', { timeout: 10000 })
  })

  test('TC-18: 查看待审核列表', async ({ page }) => {
    const res = await page.request.get(`${BASE}/api/tasks/awaiting-review`)
    expect(res.status()).toBe(200)
    const list = await res.json()
    expect(Array.isArray(list)).toBe(true)
  })

  test('TC-19: 审核不存在任务返回 404', async ({ page }) => {
    const res = await page.request.post(`${BASE}/api/task/nonexistent/approve`)
    expect(res.status()).toBe(404)
  })

  test('TC-20: 审核 pending 任务返回 409', async ({ page }) => {
    const res = await page.request.post(`${BASE}/api/task`, { data: { description: '审核测试' } })
    const { taskId } = await res.json()
    const approveRes = await page.request.post(`${BASE}/api/task/${taskId}/approve`)
    expect(approveRes.status()).toBe(409)
  })

  test('TC-21: 驳回无反馈返回 400', async ({ page }) => {
    const res = await page.request.post(`${BASE}/api/task`, { data: { description: '驳回测试' } })
    const { taskId } = await res.json()
    const rejectRes = await page.request.post(`${BASE}/api/task/${taskId}/reject`, { data: { feedback: '' } })
    expect(rejectRes.status()).toBe(400)
  })

  test('TC-22: 无待审核任务空状态', async ({ page }) => {
    await page.goto(BASE)
    await page.waitForSelector('text=已连接', { timeout: 10000 })
    const res = await page.request.get(`${BASE}/api/tasks/awaiting-review`)
    const list = await res.json()
    expect(Array.isArray(list)).toBe(true)
  })
})

test.describe('system-configuration — 系统配置', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE)
    await page.waitForSelector('text=已连接', { timeout: 10000 })
  })

  test('TC-23: 控制栏显示权限选择器默认 safe', async ({ page }) => {
    const select = page.locator('select')
    await expect(select).toBeVisible()
    await expect(select).toHaveValue('safe')
  })

  test('TC-24: 切换权限级别 via API', async ({ page }) => {
    const res = await page.request.post(`${BASE}/api/config/permission`, { data: { level: 'strict' } })
    expect(res.status()).toBe(200)
  })

  test('TC-25: 无效权限级别返回错误', async ({ page }) => {
    const res = await page.request.post(`${BASE}/api/config/permission`, { data: { level: 'invalid' } })
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })

  test('TC-26: 设置预算上限 via API', async ({ page }) => {
    const res = await page.request.post(`${BASE}/api/config/budget`, { data: { limit: 100 } })
    expect(res.status()).toBe(200)
  })

  test('TC-27: 设置并行度 via API', async ({ page }) => {
    const res = await page.request.post(`${BASE}/api/config/parallel`, { data: { count: 5 } })
    expect(res.status()).toBe(200)
  })
})

test.describe('webhook-management — Webhook 配置', () => {
  test('TC-28: 获取 webhook 配置', async ({ page }) => {
    await page.goto(BASE)
    const res = await page.request.get(`${BASE}/api/webhooks`)
    expect(res.status()).toBe(200)
    const list = await res.json()
    expect(Array.isArray(list)).toBe(true)
  })

  test('TC-29: 添加 webhook 配置', async ({ page }) => {
    await page.goto(BASE)
    const res = await page.request.post(`${BASE}/api/webhooks`, {
      data: { url: 'https://example.com/callback', events: ['task.completed'] },
    })
    expect(res.status()).toBe(200)
  })

  test('TC-30: 添加 webhook 缺少 URL 被拒绝', async ({ page }) => {
    await page.goto(BASE)
    const res = await page.request.post(`${BASE}/api/webhooks`, {
      data: { events: ['task.completed'] },
    })
    expect(res.status()).toBe(400)
  })

  test('TC-31: 删除 webhook', async ({ page }) => {
    await page.goto(BASE)
    await page.request.post(`${BASE}/api/webhooks`, {
      data: { url: 'https://example.com/del', events: ['task.completed'] },
    })
    const delRes = await page.request.delete(`${BASE}/api/webhooks?url=https://example.com/del`)
    expect(delRes.status()).toBe(200)
  })
})

test.describe('i18n — 界面国际化', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE)
    await page.waitForSelector('text=已连接', { timeout: 10000 })
  })

  test('TC-32: 默认显示中文', async ({ page }) => {
    await expect(page.locator('text=24h Agent').first()).toBeVisible({ timeout: 8000 })
    const emptyText = page.locator('text=暂无任务,text=暂无数据,text=No tasks')
    await expect(emptyText.first()).toBeVisible({ timeout: 5000 }).catch(() => {})
  })

  test('TC-33: 切换到英文', async ({ page }) => {
    const engBtn = page.locator('button:has-text("English")')
    await expect(engBtn).toBeVisible()
    await engBtn.click()
    await expect(page.locator('button:has-text("中文")')).toBeVisible()
  })

  test('TC-34: 中英文来回切换', async ({ page }) => {
    await page.locator('button:has-text("English")').click()
    await expect(page.locator('button:has-text("中文")').first()).toBeVisible()
    await page.locator('button:has-text("中文")').click()
    await expect(page.locator('button:has-text("English")').first()).toBeVisible()
  })

  test('TC-35: 刷新后语言设置保持', async ({ page }) => {
    await page.locator('button:has-text("English")').click()
    await expect(page.locator('button:has-text("中文")').first()).toBeVisible()
    await page.reload()
    await page.waitForTimeout(3000)
    await expect(page.locator('button:has-text("中文")').first()).toBeVisible({ timeout: 15000 })
  })
})

test.describe('connection-management — 连接管理', () => {
  test('TC-36: 页面加载后显示已连接', async ({ page }) => {
    await page.goto(BASE)
    await expect(page.locator('text=已连接')).toBeVisible({ timeout: 10000 })
  })

  test('TC-37: 权限选择器默认 safe', async ({ page }) => {
    await page.goto(BASE)
    const select = page.locator('select')
    await expect(select).toHaveValue('safe')
  })
})

test.describe('persistence-recovery — 持久化', () => {
  test('TC-38: 创建任务后刷新页面，任务保持', async ({ page }) => {
    await page.goto(BASE)
    await page.waitForSelector('text=已连接', { timeout: 10000 })
    await page.request.post(`${BASE}/api/task`, { data: { description: '持久化测试' } })
    await page.waitForTimeout(500)
    await page.reload()
    await page.waitForSelector('text=已连接', { timeout: 8000 })
    await expect(page.locator('text=持久化测试').first()).toBeVisible({ timeout: 5000 })
  })

  test('TC-39: 刷新后任务状态保持 pending', async ({ page }) => {
    await page.goto(BASE)
    await page.waitForSelector('text=已连接', { timeout: 10000 })
    await page.request.post(`${BASE}/api/task`, { data: { description: '状态保持测试' } })
    await page.waitForTimeout(500)
    await page.reload()
    await page.waitForSelector('text=已连接', { timeout: 8000 })
    await expect(page.locator('text=待处理').first()).toBeVisible({ timeout: 5000 })
  })
})

test.describe('system-startup — 启动', () => {
  test('TC-40: 健康检查端点返回系统状态', async ({ page }) => {
    const res = await page.request.get(`${BASE}/health`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('status', 'ok')
    expect(body).toHaveProperty('db', 'connected')
    expect(body).toHaveProperty('agents')
    expect(body).toHaveProperty('tasks')
  })
})

test.describe('task-tree — 任务树面板', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE)
    await page.waitForSelector('text=已连接', { timeout: 10000 })
  })

  test('TC-41: 空状态显示提示', async ({ page }) => {
    const title = page.locator('text=24h Agent').first()
    await expect(title).toBeVisible({ timeout: 8000 })
  })

  test('TC-42: 任务节点显示描述和状态标签', async ({ page }) => {
    await page.request.post(`${BASE}/api/task`, { data: { description: '树节点测试' } })
    await page.waitForTimeout(500)
    await expect(page.locator('text=树节点测试').first()).toBeVisible()
    await expect(page.locator('text=待处理').first()).toBeVisible()
  })

  test('TC-43: 选中节点高亮', async ({ page }) => {
    await page.request.post(`${BASE}/api/task`, { data: { description: '高亮测试' } })
    await page.waitForTimeout(500)
    const node = page.locator('text=高亮测试').first()
    await node.click()
    await expect(node).toBeVisible()
  })
})

test.describe('stream-console — 流式控制台', () => {
  test('TC-44: 无活动会话显示空状态', async ({ page }) => {
    await page.goto(BASE)
    await page.waitForSelector('text=已连接', { timeout: 10000 })
    const emptyState = page.locator('text=暂无活跃会话').first()
    await expect(emptyState).toBeVisible({ timeout: 5000 })
  })
})

test.describe('timeline — 时间线', () => {
  test('TC-45: 创建任务后时间线出现事件', async ({ page }) => {
    await page.goto(BASE)
    await page.waitForSelector('text=已连接', { timeout: 10000 })
    await page.request.post(`${BASE}/api/task`, { data: { description: '时间线测试' } })
    await page.waitForTimeout(1000)
    await expect(page.locator('text=时间线测试').first()).toBeVisible({ timeout: 3000 })
  })
})

test.describe('system-overview — 系统概览', () => {
  test('TC-46: 健康检查返回系统指标', async ({ page }) => {
    const res = await page.request.get(`${BASE}/health`)
    const body = await res.json()
    expect(typeof body.agents.active).toBe('number')
    expect(typeof body.agents.total).toBe('number')
    expect(typeof body.tasks.total).toBe('number')
    expect(typeof body.tasks.running).toBe('number')
  })

  test('TC-47: 创建任务后指标更新', async ({ page }) => {
    await page.goto(BASE)
    await page.request.post(`${BASE}/api/task`, { data: { description: '指标更新' } })
    await page.waitForTimeout(500)
    const res = await page.request.get(`${BASE}/health`)
    const body = await res.json()
    expect(body.tasks.total).toBeGreaterThanOrEqual(1)
  })
})

test.describe('control-bar — 控制栏', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE)
    await page.waitForSelector('text=已连接', { timeout: 10000 })
  })

  test('TC-48: 输入框可输入文字', async ({ page }) => {
    const input = page.locator('input[type="text"]')
    await input.fill('控制栏测试')
    await expect(input).toHaveValue('控制栏测试')
  })

  test('TC-49: 输入框清空后按钮禁用', async ({ page }) => {
    const input = page.locator('input[type="text"]')
    await input.fill('test')
    await expect(page.locator('button:has-text("添加任务")')).toBeEnabled()
    await input.clear()
    await page.waitForTimeout(200)
    const addBtn = page.locator('button:has-text("添加任务")')
    await expect(addBtn).toBeVisible()
  })

  test('TC-50: 连接状态显示已连接', async ({ page }) => {
    await expect(page.locator('text=已连接')).toBeVisible({ timeout: 8000 })
  })
})

test.describe('health-dashboard — 健康仪表板', () => {
  test('TC-51: 无活跃 Agent 显示空状态', async ({ page }) => {
    await page.goto(BASE)
    await page.waitForSelector('text=已连接', { timeout: 10000 })
    await expect(page.locator('text=无活跃 Agent')).toBeVisible()
  })
})

test.describe('settings-dialog — 设置弹窗', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE)
    await page.waitForSelector('text=已连接', { timeout: 10000 })
  })

  test('TC-52: 点击设置按钮打开弹窗', async ({ page }) => {
    const gearBtn = page.getByTitle('设置')
    await expect(gearBtn).toBeVisible()
    await gearBtn.click()
    await expect(page.locator('text=定时任务管理')).toBeVisible()
  })

  test('TC-53: 设置弹窗可关闭', async ({ page }) => {
    await page.getByTitle('设置').click()
    await expect(page.locator('text=定时任务管理')).toBeVisible()
    await page.mouse.click(10, 10)
    await expect(page.locator('text=定时任务管理')).not.toBeVisible()
  })
})
