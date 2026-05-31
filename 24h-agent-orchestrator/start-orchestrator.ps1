param(
  [string]$Port = "3000",
  [string]$Permission = "safe"
)

$ProjectDir = $PSScriptRoot
$LogFile = Join-Path $PSScriptRoot "orchestrator.log"

Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     24h Agent Orchestrator              ║" -ForegroundColor Cyan
Write-Host "║     Port: $Port                          ║" -ForegroundColor Cyan
Write-Host "║     Permission: $Permission              ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# 检查依赖
if (-not (Get-Command opencode -ErrorAction SilentlyContinue)) {
  Write-Error "opencode CLI 未安装，请先安装: npm install -g @opencode-ai/cli"
  exit 1
}

if (-not (Test-Path $ProjectDir)) {
  Write-Error "项目目录不存在: $ProjectDir"
  exit 1
}

# 设置环境变量
$env:PORT = $Port
$env:PERMISSION_LEVEL = $Permission

# 启动
Write-Host "[orchestrator] 正在启动..." -ForegroundColor Green
Write-Host "[orchestrator] 工作目录: $ProjectDir" -ForegroundColor Gray
Write-Host "[orchestrator] 日志文件: $LogFile" -ForegroundColor Gray
Write-Host ""

Push-Location $ProjectDir
try {
  npm run dev *>&1 | Tee-Object -FilePath $LogFile
}
finally {
  Pop-Location
}
