## 1. 国际化基础设施搭建

- [ ] 1.1 安装 `react-intl` 依赖到 `24h-agent-orchestrator/package.json`
- [ ] 1.2 创建 `src/webui/src/i18n/zh-CN.json` 翻译资源文件，包含所有 UI 字符串
- [ ] 1.3 创建 `src/webui/src/i18n/I18nProvider.tsx` —— 封装 `IntlProvider`，集成语言检测（`navigator.language` → `localStorage` → fallback `zh-CN`）和切换逻辑
- [ ] 1.4 创建 `src/webui/src/i18n/useLocale.ts` hook —— 提供 `locale` 和 `setLocale`，并持久化到 `localStorage`
- [ ] 1.5 在 `src/webui/src/main.tsx` 中接入 `I18nProvider`，包裹 `App` 组件

## 2. 组件国际化改造

- [ ] 2.1 改造 `ControlBar.tsx` —— 将所有硬编码字符串替换为 `<FormattedMessage>`，包括连接状态、权限选项、输入框 placeholder、按钮文字
- [ ] 2.2 改造 `App.tsx` —— 替换标题栏文字、任务计数标签、Tab 标签、空状态提示、操作按钮文字
- [ ] 2.3 改造 `StreamConsole.tsx` —— 替换空会话提示文字
- [ ] 2.4 改造 `Timeline.tsx` —— 替换空事件提示文字
- [ ] 2.5 更新 `index.html` —— 将 `lang="en"` 和 `<title>` 改为通过 JS 动态设置

## 3. 语言切换控件

- [ ] 3.1 在 `ControlBar.tsx` 中添加语言切换按钮，调用 `useLocale().setLocale`
- [ ] 3.2 确保切换时所有组件即时更新（通过 `I18nProvider` 的 state 驱动）

## 4. 验证与检查

- [ ] 4.1 运行 `npm run build` 确认无构建错误
- [ ] 4.2 运行 `npm run typecheck` 确认类型正确
- [ ] 4.3 启动开发服务器，验证 WebUI 所有文字显示为中文
- [ ] 4.4 验证语言切换功能：切换到英文后所有文字变回英文
- [ ] 4.5 验证持久化：刷新页面后语言选择保持
