## 修复方案

### 1. SkillChecker baseDir
当前 `process.cwd()` = `24h-agent-orchestrator/`，但源文件在 repo 根。改用 `path.resolve(__dirname, '..', '..')` 从 `src/eagle-engine/` 上溯到 repo 根。

### 2. API try/catch
在 handler 中 try/catch 包裹，失败返回 `{ success: false, message }`。

### 3. 安装后设置 eagle_mode
`initAll` 成功后调用 `store.setConfig('eagle_mode', 'auto')`。

### 4. 前端反馈
`fetch` 改为异步等待结果，在 UI 上显示安装结果（成功/失败步骤）。
