## 修复方案

`handleBrowse` 中改用 `window.showDirectoryPicker()` (File System Access API)：

```typescript
const handleBrowse = async () => {
  try {
    const handle = await window.showDirectoryPicker()
    setConfig((prev) => ({ ...prev, directory: handle.name }))
  } catch {
    // 用户取消选择，不做处理
  }
}
```

`handle.name` 返回用户所选目录的名称（如 `my-project`），如果需要完整路径可递归遍历。当前项目只需目录名作为标识，足够使用。

同时移除旧的 `fileInputRef`、`webkitdirectory` input、`handleFileSelected`。
