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
