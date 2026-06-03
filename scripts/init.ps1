# init.ps1 - bootstrap my-medusa-store-hono
# Usage: pnpm run init
#        pnpm run init -- -SkipInstall

param(
  [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Write-Step($msg) {
  Write-Host ""
  Write-Host "==> $msg" -ForegroundColor Cyan
}

function Test-Command($name) {
  return $null -ne (Get-Command $name -ErrorAction SilentlyContinue)
}

Write-Step "Check runtime"

if (-not (Test-Command "node")) {
  throw "node not found. Install Node.js >= 20: https://nodejs.org/"
}

Write-Host "  Node: $(node -v)"

if (-not (Test-Command "pnpm")) {
  Write-Host "  pnpm not found, trying corepack ..."
  if (Test-Command "corepack") {
    corepack enable | Out-Null
    corepack prepare pnpm@10.17.1 --activate | Out-Null
  } else {
    throw "pnpm not found. Install: npm i -g pnpm"
  }
}

Write-Host "  pnpm: $(pnpm -v)"

Write-Step "Check project layout"

$requiredPaths = @(
  "docs/00-agent-handoff.md",
  "AGENTS.md",
  "AGENT_HANDOFF.md",
  "START_HERE.md",
  "TRAE_KICKOFF_PROMPT.md",
  "apps/server/src/app.ts",
  "apps/server/entry.node.ts",
  "apps/admin/src/main.tsx",
  "apps/storefront/src/pages/index.astro",
  "packages/db/package.json",
  "packages/validators/package.json",
  "pnpm-workspace.yaml",
  "turbo.json",
  ".cursor/rules/agent-handoff.mdc",
  ".cursor/rules/medusa-project.mdc",
  ".cursor/rules/admin-development.mdc",
  ".cursor/rules/storefront-development.mdc",
  ".cursor/skills/hono-medusa-rebuild/SKILL.md",
  "docs/MIGRATION.md"
)

$missing = @()
foreach ($p in $requiredPaths) {
  if (-not (Test-Path (Join-Path $root $p))) {
    $missing += $p
  }
}

if ($missing.Count -gt 0) {
  Write-Host "  Missing paths:" -ForegroundColor Red
  $missing | ForEach-Object { Write-Host "    - $_" }
  throw "Incomplete project layout."
}

Write-Host "  Layout OK ($($requiredPaths.Count) paths)"

Write-Step "Setup .env files"

$envPairs = @(
  @{ Example = "apps/server/.env.example"; Target = "apps/server/.env" },
  @{ Example = "apps/admin/.env.example"; Target = "apps/admin/.env" },
  @{ Example = "apps/storefront/.env.example"; Target = "apps/storefront/.env" }
)

foreach ($pair in $envPairs) {
  $example = Join-Path $root $pair.Example
  $target = Join-Path $root $pair.Target
  if (Test-Path $example) {
    if (-not (Test-Path $target)) {
      Copy-Item $example $target
      Write-Host "  Created $($pair.Target)"
    } else {
      Write-Host "  Exists $($pair.Target) (skip)"
    }
  }
}

Write-Host ""
Write-Host "  Edit apps/server/.env: DATABASE_URL, JWT_SECRET" -ForegroundColor Yellow

if (-not $SkipInstall) {
  Write-Step "pnpm install"
  pnpm install
  if ($LASTEXITCODE -ne 0) { throw "pnpm install failed" }
  Write-Host "  Done"
} else {
  Write-Host ""
  Write-Host "Skipped pnpm install (-SkipInstall)" -ForegroundColor Yellow
}

Write-Step "Done"

Write-Host @"

Next:
  1. Configure apps/server/.env (DATABASE_URL, JWT_SECRET)
  2. Start dev (会先释放 7000/5173/4321 端口):
       pnpm dev
     若端口占用: pnpm predev
     Or separately:
       pnpm dev:server   # http://localhost:7000/api/health
       pnpm dev:admin    # http://localhost:5173/admin
       pnpm dev:store    # http://localhost:4321
  3. Read before coding:
       docs/00-agent-handoff.md
       TRAE_KICKOFF_PROMPT.md
  4. Optional copy Medusa UI:
       pnpm run copy:dashboard-ui -- -MedusaSourcePath "D:\path\to\@medusajs\dashboard\src"

"@
