## 修复方案

### handleBrowse
复用 ProjectDirPrompt 的服务端目录浏览器模式：
- 点击浏览 → 弹出一个内嵌目录树，通过 `GET /api/fs/list?path=` 读取
- 单击目录选中填入路径框，双击进入子目录
- 用户可直接手动输入路径

### handleSave
保存成功后在 catch 之前追加：
```typescript
fetch('/api/project/init-eagle', { method: 'POST' }).catch(() => {})
```
