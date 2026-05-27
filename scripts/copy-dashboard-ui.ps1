# 方案 A：从 Medusa dashboard 源码拷贝可复用 UI 到 apps/admin（覆盖同名目录）
param(
  [string]$MedusaSourcePath = ""
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

$candidateSources = @()
if ($MedusaSourcePath) {
  $candidateSources += $MedusaSourcePath
}
$candidateSources += @(
  (Join-Path $root "apps\backend\node_modules\@medusajs\dashboard\src"),
  (Join-Path $root "apps\backend\node_modules\@medusajs\dashboard\dist"),
  (Join-Path $root "..\my-medusa-store\apps\backend\node_modules\@medusajs\dashboard\src")
)

$src = $candidateSources | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if (-not $src) {
  throw @"
Cannot find Medusa dashboard source.
Pass -MedusaSourcePath, e.g.:
  pnpm run copy:dashboard-ui -- -MedusaSourcePath `"D:\path\to\node_modules\@medusajs\dashboard\src`"
Or install Medusa backend under apps/backend in sibling repo.
Checked: $($candidateSources -join ', ')
"@
}
$dst = Join-Path $root "apps\admin\src\dashboard-ui"

$folders = @(
  "components\common",
  "components\data-table",
  "components\table",
  "components\authentication",
  "components\filtering",
  "components\inputs",
  "components\utilities",
  "providers",
  "i18n",
  "hooks\table"
)

Write-Host "Copy dashboard UI (plan A)"
Write-Host "  from: $src"
Write-Host "  to:   $dst"

New-Item -ItemType Directory -Force -Path $dst | Out-Null

foreach ($f in $folders) {
  $from = Join-Path $src $f
  $to = Join-Path $dst $f
  if (-not (Test-Path $from)) {
    Write-Warning "Skip missing: $f"
    continue
  }
  New-Item -ItemType Directory -Force -Path (Split-Path $to -Parent) | Out-Null
  robocopy $from $to /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "robocopy failed for $f" }
  Write-Host "  OK $f"
}

Write-Host "Done. Edit under apps/admin only; run pnpm dev --filter=@my-store/admin"
