# system-startup — 系统启动与关闭黑盒测试

## 概述

用户启动/停止系统时的行为和 UI 表现。

## 测试用例

### 操作 1: 系统正常启动

- **页面状态**: 系统尚未启动，浏览器还未打开
- **用户操作**: 在终端运行 `npm run dev`，等待启动完成，打开浏览器访问 http://localhost:3000
- **预期结果**:
  - 终端输出启动日志：
    - "Orchestrator starting..."
    - "SQLite database initialized"
    - "opencode ACP server: http://localhost:xxxxx"
    - "HTTP server: http://localhost:3000"
  - 浏览器中页面完整加载：
    - 左侧任务树面板显示（空状态）
    - 中间 StreamConsole 面板显示（空状态）
    - 右侧时间线面板显示（可能有一条"Orchestrator started"事件）
    - 底部控制栏显示 "Connected" 和默认权限 "Safe"

### 操作 2: 健康检查端点

- **页面状态**: 系统运行中
- **用户操作**: 访问 http://localhost:3000/health
- **预期结果**:
  - 返回 JSON 响应：
    - status: "ok"
    - db: "connected"
    - agents: { active: 0, total: 0 }
    - tasks: { total: 0, running: 0 }

### 操作 3: 优雅关闭

- **页面状态**: WebUI 已打开并显示 "Connected"
- **用户操作**: 在终端按 Ctrl+C 停止服务器
- **预期结果**:
  - 终端输出关闭日志：
    - "Orchestrator shutting down..."
    - SQLite / ACP / HTTP 各组件依次关闭
  - 网页控制栏状态由 "Connected" 变为 "Disconnected"
  - 无未捕获异常或崩溃日志
