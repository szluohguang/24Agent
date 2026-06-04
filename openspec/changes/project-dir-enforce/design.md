## 方案

### 1. 前端弹窗提示

新增 `ProjectDirPrompt` 组件，在以下场景触发：
- 首页加载时检查 `GET /api/project/config` → directory 为空 → 弹窗
- 用户点击 Add Task 时检查 directory 为空 → 弹窗

弹窗包含：
- 说明文字："请先设置项目目录"
- 文本输入框（可手动输入路径）
- 浏览按钮（调用 `showDirectoryPicker`）
- 保存/确认按钮

### 2. 后端验证

`POST /api/project/config` 增加目录存在性验证：
```typescript
if (directory && !fs.existsSync(directory)) {
  return reply.status(400).send({ error: '目录不存在' })
}
```

### 3. ACP Server 工作目录

`createOpencodeServer` 接受 `projectDir?: string` 参数，不为空时 `process.chdir(projectDir)`。

### 4. dispatchTask 注入目录

prompt 中加入 `## Working Directory` 节，指示子 agent 在此目录下工作。
