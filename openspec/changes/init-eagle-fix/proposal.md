## 问题

1. `SkillChecker.baseDir` 使用 `process.cwd()` (= `24h-agent-orchestrator/`)，但 `skills/eagle/` 在 repo 根目录，安装时找不到源文件
2. 前端 `POST /api/project/init-eagle` 即发即弃，无任何安装结果反馈
3. API 端点无 try/catch，异常时返回无法解析的 500 错误
4. 安装成功后未初始化默认 `eagle_mode` 配置

## 修复

1. `SkillChecker.ts`: baseDir 改为从 `__dirname` 解析到 repo 根目录
2. `ProjectDirPrompt.tsx` / `ProjectSettings.tsx`: 显示安装结果
3. `api.ts`: 增加 try/catch
4. `initAll()`: 成功后自动设置 `eagle_mode = 'auto'`
