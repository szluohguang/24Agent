# Comet Design Handoff

- Change: project-dir-enforce
- Phase: design
- Mode: compact
- Context hash: 2afbe024e1e5ca970c58a3076f59b5a12cf29c58d2af900ad0ff26400367085a

Generated-by: comet-handoff.sh

OpenSpec remains the canonical capability spec. This handoff is a deterministic, source-traceable context pack, not an agent-authored summary.

## openspec/changes/project-dir-enforce/proposal.md

- Source: openspec/changes/project-dir-enforce/proposal.md
- Lines: 1-13
- SHA256: c381acb28429b83b3c7ffead8594bce5c5dad4fe7cccb5a6244f49ae3a894a34

```md
## 问题

1. 用户未设置项目目录时，任务仍可创建（不报错、不提示），但子 agent 没有明确的工作目录
2. `projectConfig.directory` 仅作为文本注入到 prompt 的 Project Context 中，未实际切换工作目录
3. ACP Server 启动时使用 `process.cwd()` 作为工作目录，未考虑项目目录的设置
4. `handleBrowse` 仅获取目录名而非完整路径

## 变更

1. 前端：未设置目录时弹窗提示用户设置，阻止创建任务
2. 前端：设置/修改目录时验证路径有效性（后端配合）
3. 后端：`createOpencodeServer` 接受 projectDir 参数，启动时 `chdir` 到项目目录
4. 后端：`dispatchTask` prompt 中加入项目目录路径，验证目录存在
```

## openspec/changes/project-dir-enforce/design.md

- Source: openspec/changes/project-dir-enforce/design.md
- Lines: 1-30
- SHA256: 43ffe8fbdc0a75c58c10e495aaddc4ba61dd201f5a950edc35fca5fb2fc4d7d7

```md
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
```

## openspec/changes/project-dir-enforce/tasks.md

- Source: openspec/changes/project-dir-enforce/tasks.md
- Lines: 1-6
- SHA256: d4b0853717c526aa8a4d5b9c4929c8989f6af9c775e3a3fa3a42a14d5ba78ddf

```md
- [ ] 1. backend: `PUT /api/project/config` 增加目录存在性验证
- [ ] 2. backend: `createOpencodeServer` 接受 projectDir，启动时 chdir
- [ ] 3. backend: `dispatchTask` prompt 中加入工作目录信息
- [ ] 4. frontend: 创建 ProjectDirPrompt 组件（弹窗+输入+浏览+保存）
- [ ] 5. frontend: App.tsx 加载时检查目录 → 弹窗；创建任务时阻止无目录
- [ ] 6. 验证：typecheck + 测试通过
```

