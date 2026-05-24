## 上下文

24h Agent Orchestrator 的 WebUI 为 React 单页应用，所有用户可见字符串目前以英文硬编码在各组件中。项目 AGENTS.md 约定文档和输出使用中文，但目前 WebUI 无国际化支持。需要引入标准的国际化方案，最小化对现有代码的侵入。

## 目标 / 非目标

**目标：**
- WebUI 所有用户可见字符串支持中文显示
- 用户可通过切换控件在中文/英文之间切换
- 语言选择持久化（localStorage）
- 新增 UI 字符串时，开发者只需在翻译资源文件中添加条目

**非目标：**
- 服务端国际化（后端日志、CLI 输出等）
- 支持中文以外的其他语言（框架需预留扩展能力）
- 动态内容（如 Agent 返回的任务描述、日志文本）的翻译

## 决策

| 决策 | 选择 | 备选方案 | 理由 |
|------|------|---------|------|
| 国际化框架 | `react-intl`（FormatJS） | `i18next` / 自建方案 | 轻量、React 生态主流、组件级 API（`FormattedMessage`）、TypeScript 友好 |
| 翻译存储 | 单 JSON 文件 (`zh-CN.json`) | 多文件拆分 | 当前 UI 字符串少（< 50 条），单文件更简单；规模扩大后可拆分 |
| 语言检测 | `navigator.language` → localStorage → fallback `zh-CN` | 仅 localStorage | 首次访问自动匹配浏览器语言，用户体验更好 |
| 语言切换 | React Context + Provider 模式 | Redux / Zustand | Context 对国际化这种跨组件但低频更新的场景最合适 |
| 文件结构 | `src/webui/src/i18n/` 独立目录 | 分散在各组件 | 集中管理，新增语言更方便 |

## 翻译映射表

| Key | 英文 (default) | 中文 (zh-CN) |
|-----|---------------|-------------|
| `app.title` | 24h Agent Orchestrator | 24h Agent 编排器 |
| `app.tasks` | Tasks | 任务 |
| `app.active` | Active | 活跃 |
| `app.noTasks` | No tasks yet. Add one in the control bar. | 暂无任务。请在底栏添加。 |
| `tab.console` | Stream Console | 流式控制台 |
| `tab.timeline` | Timeline | 时间线 |
| `task.dispatch` | Dispatch | 分发 |
| `task.abort` | Abort | 中止 |
| `task.depends` | depends | 依赖 |
| `status.connected` | Connected | 已连接 |
| `status.disconnected` | Disconnected | 未连接 |
| `permission.trusted` | Trusted | 信任 |
| `permission.safe` | Safe | 安全 |
| `permission.strict` | Strict | 严格 |
| `placeholder.taskDescription` | New task description... | 输入新任务描述... |
| `button.addTask` | Add Task | 添加任务 |
| `stream.noSessions` | No active sessions. Waiting for tasks... | 暂无活跃会话。等待任务中... |
| `timeline.noEvents` | No events yet. | 暂无事件。 |
| `language.switch` | 语言 | Language |

## 风险 / 权衡

- **[性能]** `react-intl` 引入额外包体积（约 15KB gzip），对 SPA 可接受
- **[维护]** 新增 UI 字符串时需同步更新翻译文件 —— 通过添加 `i18n-check` 脚本在 CI 中验证
- **[兼容]** 现有代码中硬编码字符串保持作为 `defaultMessage`，确保无翻译时英文回退正常
