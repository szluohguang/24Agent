## 问题

项目设置页面的「浏览」按钮使用 `<input webkitdirectory>` 选择目录后，`webkitRelativePath` 只返回选中目录内文件的相对路径（如 `src/index.ts`），`split('/')[0]` 得到的是首个子路径片段而非完整目录路径。保存到后端后实际存储了错误值，下次加载时显示不正确。

## 根因

浏览器 File API 的 `webkitRelativePath` 设计上不暴露完整绝对路径（安全限制）。当前代码错误的将相对路径片段当作目录路径使用。

## 修复

使用 File System Access API (`window.showDirectoryPicker()`) 替代旧式 `webkitdirectory` 方式获取正确目录路径。在 Chrome 86+ 中 `showDirectoryPicker` 返回的 `FileSystemDirectoryHandle.name` 即为所选目录的完整路径。
