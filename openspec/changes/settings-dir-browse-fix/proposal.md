## 问题

1. 设置页项目目录的"浏览"按钮使用 `showDirectoryPicker()`，不支持的浏览器中静默失败，支持的浏览器也只返回目录名不含完整路径
2. 设置新项目目录后没有触发 `POST /api/project/init-eagle` 安装必要技能

## 修复

1. `ProjectSettings.tsx`: handleBrowse 改为调用 `GET /api/fs/list` 的服务端目录浏览器
2. `ProjectSettings.tsx`: handleSave 成功后调用 `fetch('/api/project/init-eagle', { method: 'POST' })`
