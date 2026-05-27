# 释放本地开发常用端口（9000 API / 5173 Admin / 4321 Store）
$ErrorActionPreference = "SilentlyContinue"
$ports = @(9000, 5173, 4321)

foreach ($port in $ports) {
  Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
    ForEach-Object {
      Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "已尝试释放端口: $($ports -join ', ')"
