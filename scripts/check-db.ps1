# 检查 apps/server/.env 中的 DATABASE_URL 是否可连接
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$serverDir = Join-Path $root "apps\server"
Set-Location $serverDir

if (-not (Test-Path ".env")) {
  Write-Host "缺少 apps/server/.env，请执行: pnpm run init" -ForegroundColor Red
  exit 1
}

Write-Host "检查数据库连接..." -ForegroundColor Cyan
npx tsx ./scripts/check-db-once.ts
exit $LASTEXITCODE
