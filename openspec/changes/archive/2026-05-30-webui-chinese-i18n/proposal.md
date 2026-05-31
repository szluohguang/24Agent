## 为什么

24h Agent Orchestrator 的 WebUI 目前所有界面文字均为英文硬编码，不符合项目文档规范（AGENTS.md 明确约定文档和输出使用中文）。中国用户和中文团队使用时体验割裂，需要完整的中文界面支持。

## 变更内容

- 引入 `react-intl`（FormatJS）作为国际化框架
- 创建中文翻译资源文件（`zh-CN.json`），包含 WebUI 全部 UI 字符串
- 重构 WebUI 组件，将硬编码字符串替换为国际化 key
- 添加语言自动检测（优先浏览器语言，fallback 到中文）
- 添加语言切换控件（中/英），支持运行时切换
- 更新 `index.html` 的 `lang` 属性为动态
- 创建国际化基础设施：`IntlProvider`、翻译 hooks、context

**非破坏性变更**：所有现有功能不变，英文作为 fallback 保留。

## 能力

### 新增能力
- `webui-i18n`: WebUI 国际化基础设施，包括翻译框架集成、资源文件组织、语言检测与切换机制

### 修改的能力
- （无 spec 级别行为变更）

## 影响范围

- `24h-agent-orchestrator/src/webui/` 下的所有组件文件（App.tsx、ControlBar.tsx、StreamConsole.tsx、Timeline.tsx）
- `24h-agent-orchestrator/src/webui/index.html`（lang 属性）
- `24h-agent-orchestrator/package.json`（新增 `react-intl` 依赖）
