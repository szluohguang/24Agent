# health-dashboard Specification

## Purpose
TBD - created by archiving change webui-enhancement. Update Purpose after archive.
## Requirements
### Requirement: HealthDashboard 组件

#### Scenario: 渲染 Agent 健康状态列表
WHEN 用户打开 Dashboard 页面
THEN 组件渲染一个表格，每行对应一个 Agent，字段包括 sessionId、taskId、status、lastHeartbeat、healthDuration
AND status 列根据枚举值显示彩色徽标：
  - `healthy` → 绿色（#22c55e）
  - `suspected` → 黄色（#eab308）
  - `hung` → 橙色（#f97316）
  - `dead` → 红色（#ef4444）

#### Scenario: 系统概览面板
WHEN Dashboard 加载完毕
THEN 顶部显示系统概览卡片组，包含：
  - Active Count — 状态为 healthy / suspected 的 Agent 总数
  - Error Rate — 最近窗口内失败任务占比百分比
  - Retry Statistics — 总重试次数及当前正在重试的 Agent 数
  - Budget Spent / Limit — 已消耗预算金额与预算上限（如 "$1,250 / $5,000"）

---

### Requirement: 实时更新（WebSocket）

#### Scenario: 通过 WebSocket 接收健康报告
WHEN 后端推送 `health-report` 消息
THEN 组件监听 `ws.on('health-report', callback)` 并增量更新对应 Agent 行
AND 不重新渲染整个表格，只更新变更行
AND lastHeartbeat 字段刷新为当前相对时间

#### Scenario: 新增 Agent 行
WHEN health-report 消息中包含此前未见的 sessionId
THEN 在表格末尾插入新行并应用入场动画（fade-in）

---

### Requirement: 轮询回退（Polling Fallback）

#### Scenario: WebSocket 断连后启动轮询
WHEN WebSocket 连接断开或连接超时（>3s）
THEN 组件自动启动 HTTP 轮询，每 5 秒发送 GET /health
AND 页面顶部显示黄色提示条："实时连接已断开，使用轮询模式（5s）"

#### Scenario: WebSocket 恢复时停止轮询
WHEN WebSocket 重新建立连接
THEN 立即停止轮询定时器，清除提示条
AND 请求一次全量 /health 快照以同步状态

#### Scenario: 轮询请求失败
WHEN GET /health 返回非 2xx 或超时
THEN 重试最多 3 次，间隔 2s
AND 3 次均失败后标记所有 Agent 状态为 unknown，系统概览显示 "--"

---

### Requirement: 数据新鲜度指示器

#### Scenario: 正常连接时显示新鲜度
WHEN 组件通过 WebSocket 或轮询成功收到数据
THEN 页面右上角显示绿色圆点 + "实时"
AND 下方显示 "上次更新：刚刚"

#### Scenario: 连接断开或数据过期
WHEN WebSocket 断开且超过 10 秒未收到任何数据
THEN 指示器变为红色圆点 + "断开"
AND 下方显示 "上次更新：X秒前"（X 自上次成功接收起计时）
AND 所有已缓存的 Agent 行上方叠加半透明遮罩，标注 "数据可能已过期"

#### Scenario: 重连后恢复新鲜度
WHEN 重新收到健康报告数据
THEN 指示器恢复为绿色圆点 + "实时"
AND 遮罩移除，更新时间重置

---

### Requirement: Agent 行细节

#### Scenario: lastHeartbeat 显示相对时间
WHEN Agent 行的 lastHeartbeat 字段渲染时
THEN 显示为相对时间格式，如 "5s ago"、"2m ago"、"1h ago"
AND 每秒自动更新（使用定时器重新计算）
AND 超过 24 小时显示为 ">24h ago"

#### Scenario: healthDuration 显示持续时长
WHEN Agent 行的 healthDuration 字段渲染时
THEN 显示当前状态持续时长，格式为 "XXm YYs"
AND 每秒同步更新
AND 如果 Agent 状态发生过变化，healthDuration 重置为 0

#### Scenario: 状态筛选器
WHEN 用户点击表头上方的状态筛选按钮（全部 / healthy / suspected / hung / dead）
THEN 表格仅显示符合筛选条件的 Agent 行
AND 筛选按钮当前选中项高亮显示

