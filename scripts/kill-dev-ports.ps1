# 释放本地开发常用端口（7000 API / 5173 Admin / 4321 Store）
# 并清理僵尸 tsx watch server（不占端口时 predev 旧逻辑杀不掉，会多占 DB 池）
$ErrorActionPreference = "SilentlyContinue"
$ports = @(7000, 5173, 4321)
$repoMarker = "my-medusa-store-hono"

foreach ($port in $ports) {
  Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
    ForEach-Object {
      Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

Get-CimInstance Win32_Process -Filter "name='node.exe'" -ErrorAction SilentlyContinue |
  Where-Object {
    $_.CommandLine -match $repoMarker -and
    $_.CommandLine -match "entry\.node"
  } |
  ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  }

Write-Host "已尝试释放端口: $($ports -join ', ')"
Write-Host "已尝试结束本仓库残留的 tsx watch entry.node 进程"
