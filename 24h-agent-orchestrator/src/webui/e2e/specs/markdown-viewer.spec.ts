import { test, expect } from '@playwright/test'

test.describe('Markdown Viewer (games/markdown-viewer.html)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/games/markdown-viewer.html')
  })

  test('should load with empty state', async ({ page }) => {
    await expect(page.locator('text=Markdown 查看器')).toBeVisible()
    await expect(page.locator('text=打开一个 Markdown 文件开始查看')).toBeVisible()
  })

  test('should have toolbar with open file and open folder buttons', async ({ page }) => {
    await expect(page.locator('text=打开文件')).toBeVisible()
    await expect(page.locator('text=打开文件夹')).toBeVisible()
  })

  test('should have sidebar with file list header', async ({ page }) => {
    await expect(page.locator('text=打开的文件')).toBeVisible()
  })

  test('should have drag-and-drop zone visible', async ({ page }) => {
    await expect(page.locator('text=拖拽文件到这里')).toBeVisible()
  })

  test('should render markdown content via file input', async ({ page }) => {
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('text=打开文件'),
    ])
    await fileChooser.setFiles({
      name: 'test.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from('# Hello World\n\nThis is **bold** and *italic* text.\n\n- Item 1\n- Item 2\n\n> A quote here'),
    })

    await expect(page.locator('h1')).toHaveText('Hello World')
    await expect(page.locator('strong')).toHaveText('bold')
  })

  test('should render code blocks', async ({ page }) => {
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('text=打开文件'),
    ])
    await fileChooser.setFiles({
      name: 'code.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from('## Code Example\n\n```javascript\nconst x = 1;\nconsole.log(x);\n```'),
    })

    await expect(page.locator('h2')).toHaveText('Code Example')
    await expect(page.locator('pre code')).toBeVisible()
  })

  test('should render tables', async ({ page }) => {
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('text=打开文件'),
    ])
    await fileChooser.setFiles({
      name: 'table.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from('| Name | Age |\n|------|-----|\n| Alice | 30 |\n| Bob | 25 |'),
    })

    await expect(page.locator('table')).toBeVisible()
    await expect(page.locator('th')).toHaveText(['Name', 'Age'])
  })

  test('should render task list items', async ({ page }) => {
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('text=打开文件'),
    ])
    await fileChooser.setFiles({
      name: 'tasks.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from('- [x] Completed task\n- [ ] Pending task'),
    })

    await expect(page.locator('input[type="checkbox"]')).toHaveCount(2)
    await expect(page.locator('input[type="checkbox"]').first()).toBeChecked()
    await expect(page.locator('input[type="checkbox"]').nth(1)).not.toBeChecked()
  })

  test('should show file in sidebar after opening', async ({ page }) => {
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('text=打开文件'),
    ])
    await fileChooser.setFiles({
      name: 'readme.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from('# Readme'),
    })

    await expect(page.locator('.file-item')).toHaveCount(1)
    await expect(page.locator('.file-item .name')).toHaveText('readme.md')
  })

  test('should update toolbar title with file name', async ({ page }) => {
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('text=打开文件'),
    ])
    await fileChooser.setFiles({
      name: 'guide.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from('# Guide'),
    })

    await expect(page.locator('#toolbarTitle')).toHaveText('guide.md')
  })

  test('should render links with target=_blank', async ({ page }) => {
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('text=打开文件'),
    ])
    await fileChooser.setFiles({
      name: 'links.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from('[OpenCode](https://opencode.ai)'),
    })

    const link = page.locator('a')
    await expect(link).toHaveAttribute('href', 'https://opencode.ai')
    await expect(link).toHaveAttribute('target', '_blank')
  })

  test('should render horizontal rules', async ({ page }) => {
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('text=打开文件'),
    ])
    await fileChooser.setFiles({
      name: 'hr.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from('Above\n\n---\n\nBelow'),
    })

    await expect(page.locator('hr')).toBeVisible()
  })
})
