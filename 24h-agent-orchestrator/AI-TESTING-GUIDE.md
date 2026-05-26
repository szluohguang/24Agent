# 24h Agent Orchestrator — 浏览器自动化测试操作指引

> 供后续 AI 代理进行有头/无头浏览器自动化测试时使用。
> 测试框架: **Playwright** (通过 MCP 工具 `playwright_browser_*` 调用)

---

## 1. 环境准备

### 1.1 启动服务器

```powershell
# 构建前端
cd 24h-agent-orchestrator
npm run build

# 启动开发服务器（默认端口 3000）
npm run dev
# 或指定端口:
$env:PORT="3333"; npm run dev
```

服务器启动后访问 `http://localhost:PORT`，应看到三栏布局 WebUI。

### 1.2 启动 E2E 测试服务器（无真实 ACP 依赖）

```powershell
tsx src/webui/e2e/test-server.ts
# 默认端口 3000，可通过 $env:PORT 指定
```

E2E 测试服务器使用 mock client，无需真实 opencode ACP 环境。

### 1.3 验证服务可用

```powershell
curl http://localhost:3333/health
# → 200 OK
```

---

## 2. 浏览器工具使用规范

### 2.1 可用工具

| 工具 | 用途 | 频率 |
|------|------|------|
| `playwright_browser_navigate` | 打开页面 | 每次测试初始化 |
| `playwright_browser_snapshot` | 获取无障碍树（比截图更精确） | 高频 |
| `playwright_browser_take_screenshot` | 截图留存证据 | 关键步骤 |
| `playwright_browser_click` | 点击元素 | 高频 |
| `playwright_browser_type` | 输入文本 | 高频 |
| `playwright_browser_fill_form` | 批量填表 | 低频 |
| `playwright_browser_select_option` | 下拉选择 | 低频 |
| `playwright_browser_evaluate` | 执行 JS（调用 API、读取状态） | 中频 |
| `playwright_browser_run_code_unsafe` | 复杂 Playwright 脚本 | 极低频 |
| `playwright_browser_close` | 关闭页面 | 测试结束 |

### 2.2 核心策略

1. **先用 Evaluate 执行 JS 调用 API 设状态，再用 UI 截图验证渲染**
   - 不要指望 UI 操作能触发完整后端流程（mock client 不会发送 SSE idle 事件）
   - 推荐流程: `API 准备数据 → page.evaluate 验证 → 截图`

2. **元素定位优先级**
   ```
   text=可见文本  >  input[placeholder="xxx"]  >  button:has-text("按钮")  >  CSS 选择器
   ```

3. **动态 ref 不可靠** — snapshot 中的 `[ref=eXX]` 每次页面加载都会变化

---

## 3. 测试全场景操作手册

### 3.1 页面初始状态

```javascript
// 导航
await page.goto('http://localhost:3333');

// 验证核心元素
const text = document.body.innerText;
text.includes('24h Agent 编排器');  // 标题
text.includes('流式控制台');         // 中间栏
text.includes('添加任务');           // 底部按钮
document.querySelector('select');   // 权限选择器
```

### 3.2 语言切换

```javascript
// 切换到英文
await page.locator('button:has-text("English")').click();

// 验证
document.title === '24h Agent Orchestrator';
document.body.innerText.includes('Stream Console');

// 切回中文
await page.locator('button:has-text("中文")').click();
document.title === '24h Agent 编排器';
```

### 3.3 权限切换

```javascript
// 选择 strict 级别
await page.locator('select').selectOption(['strict']);
// 验证
document.querySelector('select').value === 'strict';

// 可选值: trusted / safe / strict
```

### 3.4 任务创建

**方式 A — UI 输入：**

```javascript
// 输入任务描述
await page.locator('input[placeholder="输入新任务描述..."]').fill('测试任务');
// 点击添加
await page.locator('button:has-text("添加任务")').click();
// 验证出现在列表
document.body.innerText.includes('测试任务');
```

**方式 B — REST API（推荐）：**

```javascript
const res = await fetch('/api/task', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ description: 'API任务' })
});
const { taskId } = await res.json();  // taskId: "task-1234-xxxx"

// 带依赖的任务
await fetch('/api/task', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ description: '子任务', dependsOn: [parentTaskId] })
});
```

**错误边界：**

```javascript
// 空描述 → 400
const res = await fetch('/api/task', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ description: '' })
});
res.status === 400;
(await res.json()).error === 'description is required';
```

### 3.5 任务分发与中止

```javascript
// 分发
const dispatchRes = await fetch('/api/task/' + taskId + '/dispatch', { method: 'POST' });
dispatchRes.status === 200;

// 中止（仅对 running 状态有效）
const abortRes = await fetch('/api/task/' + taskId + '/abort', { method: 'POST' });
abortRes.status === 200;  // 不存在时也返回 200（静默忽略）

// 错误：不存在的 task
const errRes = await fetch('/api/task/nonexistent/dispatch', { method: 'POST' });
errRes.status === 400;
```

### 3.6 Continue Prompt（继续提问）

```javascript
// 1. 创建并分发任务获取 sessionId
await fetch('/api/task/' + taskId + '/dispatch', { method: 'POST' });
const stateRes = await fetch('/api/state');
const state = await stateRes.json();
const task = state.tasks.find(t => t.id === taskId);
const sessionId = task.sessionId;  // "ses_xxxx"

// 2. 通过 WebSocket 发送继续提问
const ws = new WebSocket('ws://localhost:3333/ws');
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'continue-prompt',
    sessionId: sessionId,
    prompt: '请继续优化代码'
  }));
};
// 服务端回复 follow-up-prompt 类型消息即成功
```

### 3.7 审核流程

**API 端点测试（不需真实 Agent 执行）：**

```javascript
// 前置：创建任务
const res = await fetch('/api/task', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ description: '审核测试' })
});
const { taskId } = await res.json();
```

**边界场景验证（完整矩阵）：**

| 测试 | API 调用 | 预期状态 |
|------|---------|:--------:|
| 通过非待审任务 | `POST /api/task/:id/approve` | **409** |
| 驳回无反馈 | `POST /api/task/:id/reject` body: `{ feedback: '' }` | **400** |
| 通过不存在任务 | `POST /api/task/nonexistent/approve` | **404** |
| 驳回不存在任务 | `POST /api/task/nonexistent/reject` body: `{ feedback: 'x' }` | **404** |
| 获取待审列表 | `GET /api/tasks/awaiting-review` | **200** `[]` |
| 获取审核历史 | `GET /api/task/:id/review-history` | **200** `[]` |

**完整审核流程（需真实 Agent，跳过 mock）：**

```
strict 模式 → 创建任务 → 分发 → Agent执行 → idle事件
  → handleSessionComplete 检查权限
  → status = 'awaiting_review'
  → WebUI 显示审核面板 (ReviewPanel)
  → 用户点击"通过" → POST approve → status = 'completed'
  → 或用户点击"驳回" → 输入反馈 → POST reject → status = 'rejected'
  → 重新分发时自动注入反馈到 prompt
```

### 3.8 定时任务管理

```javascript
// 创建
const createRes = await fetch('/api/schedule', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    description: '每日任务',
    cronExpr: '0 9 * * 1',
    permission: 'safe',
    budget: 10,
    maxRetries: 5
  })
});
const { id } = await createRes.json();

// 列表
const listRes = await fetch('/api/schedule');
const schedules = await listRes.json();

// 更新
await fetch('/api/schedule/' + id, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ enabled: false })
});

// 删除
await fetch('/api/schedule/' + id, { method: 'DELETE' });

// 错误：空字段 → 400
await fetch('/api/schedule', {
  method: 'POST',
  body: JSON.stringify({ description: '', cronExpr: '' })
});  // status === 400
```

### 3.9 健康面板 & 状态

```javascript
// 通过 API 获取完整状态
const res = await fetch('/api/state');
const state = await res.json();
// state.tasks      — 任务列表
// state.agents     — Agent 列表  
// state.timeline   — 时间线条目
// state.budget     — { spent, limit }

// UI 验证
document.body.innerText.includes('活跃');    // 系统概览
document.body.innerText.includes('预算');    // 预算指标
document.body.innerText.includes('Agent');   // 表格表头
```

### 3.10 设置弹窗

```javascript
// 打开
await page.locator('button[title="设置"]').click();
// 或
await page.locator('button:has-text("⚙️")').click();

// 验证
document.body.innerText.includes('定时任务管理');

// 创建定时任务表单
await page.locator('text=创建定时任务').click();

// 关闭（点击遮罩或 ✕ 按钮）
await page.locator('button:has-text("✕")').click();
```

---

## 4. 测试数据准备模式

### 4.1 无真实 ACP 环境（mock）

由于 `test-server.ts` 使用 mock client，Agent 不会实际执行。**测试审核功能时，需先用 API 准备数据，再通过 `page.evaluate` 操作后端状态或直接验证 API 响应。**

推荐流程：

```
[API] 创建任务 → [API] 分发任务
  → [API] 调用 approve/reject 验证边界
  → [UI] 截图验证状态显示
```

### 4.2 有真实 ACP 环境

需要 opencode ACP server 可用时，使用 `npm run dev` 启动完整服务：

```
[UI] 创建任务 → [API] 分发 → [等待] Agent 执行
  → [等待] handleSessionComplete 触发
  → [UI] 审核面板出现 → [UI] 点击通过/驳回
```

### 4.3 测试完成后清理

```javascript
// 关闭浏览器
await page.close();
```

---

## 5. 常见问题排查

| 问题 | 原因 | 解法 |
|------|------|------|
| `page.locator` 找不到元素 | 元素在懒加载列表中未渲染 | 先用 `page.evaluate` 检查 `document.body.innerText` |
| `[ref=eXX]` 选择器报错 | Playwright 快照中的 ref 是运行时动态 ID | 改用 `text=`, `button:has-text()`, `input[placeholder=]` |
| API 返回 409 | 任务状态不允许当前操作 | 检查 task.status，仅 `awaiting_review` 可 approve/reject |
| WebSocket 消息无响应 | 页面已关闭或 WS 未连接 | 先验证 `connected` 状态灯显示"已连接" |
| 定时任务不触发 | cron 表达式需要等待 | 用 `GET /api/schedule` 验证任务已注册 |
| 审核面板不显示 | 任务不是 `awaiting_review` 状态 | strict 模式下 Agent idle 后才会进入该状态 |

---

## 6. 截图命名规范

```
test-NN-<描述>.png

示例:
test-01-initial.png           # 初始状态
test-02-lang-zh.png           # 中文界面
test-04-tasks-created.png     # 任务创建后
test-05-task-selected.png     # 任务选中
test-06-settings.png          # 设置弹窗
test-08-final.png             # 最终状态
```

截图保存在项目根目录，用过后可清理。

---

## 7. 快速验证清单（E2E Smoke Test）

适合每次功能变更后快速验证核心链路：

```javascript
// 1. 页面加载
await page.goto('http://localhost:3333');
// 2. 标题
document.title === '24h Agent 编排器';
// 3. API 状态
const state = await (await fetch('/api/state')).json();
state.tasks.length >= 0;
// 4. 创建任务
const { taskId } = await (await fetch('/api/task', { method:'POST', body: JSON.stringify({description:'smoke'}) })).json();
// 5. 任务出现在 UI
document.body.innerText.includes('smoke');
// 6. 权限切换
document.querySelector('select').value === 'safe';
// 7. 语言切换
document.body.innerText.includes('English');
```
