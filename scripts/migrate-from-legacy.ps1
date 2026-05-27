# Full migration from ../my-medusa-store into my-medusa-store-hono
# Usage: pnpm run migrate

param(
  [string]$SourceRoot = ""
)

$ErrorActionPreference = "Stop"
$dest = Split-Path -Parent $PSScriptRoot

if (-not $SourceRoot) {
  $SourceRoot = Join-Path $dest "..\my-medusa-store"
}
$SourceRoot = (Resolve-Path $SourceRoot).Path

Write-Host "Migrate from: $SourceRoot"
Write-Host "         to: $dest"
Write-Host ""

$dirs = @(
  "docs",
  ".cursor",
  "packages\db",
  "packages\validators",
  "apps\server",
  "apps\admin",
  "apps\storefront"
)

foreach ($sub in $dirs) {
  $src = Join-Path $SourceRoot $sub
  $tgt = Join-Path $dest $sub
  if (-not (Test-Path $src)) {
    Write-Warning "Skip missing: $sub"
    continue
  }
  New-Item -ItemType Directory -Force -Path (Split-Path $tgt -Parent) | Out-Null
  robocopy $src $tgt /E /XD node_modules .git .turbo dist .astro /XF .env /NFL /NDL /NJH /NJS /nc /ns /np
  if ($LASTEXITCODE -ge 8) { throw "robocopy failed: $sub" }
  Write-Host "  OK $sub"
}

$files = @("AGENTS.md", "AGENT_HANDOFF.md")
foreach ($f in $files) {
  Copy-Item (Join-Path $SourceRoot $f) (Join-Path $dest $f) -Force
  Write-Host "  OK $f"
}

Write-Host ""
Write-Host "Done. Run: pnpm run patch:hono-docs  (apply Trae/hono-specific doc overlays)"
