# Sync handoff docs + Cursor rules/skills from legacy repo my-medusa-store
# Usage: pnpm run sync:handoff
#        pnpm run sync:handoff -- -SourceRoot "D:\path\to\my-medusa-store"

param(
  [string]$SourceRoot = ""
)

$ErrorActionPreference = "Stop"
$dest = Split-Path -Parent $PSScriptRoot

if (-not $SourceRoot) {
  $SourceRoot = Join-Path $dest "..\my-medusa-store"
}

$SourceRoot = (Resolve-Path $SourceRoot -ErrorAction SilentlyContinue)
if (-not $SourceRoot) {
  throw "Source repo not found. Pass -SourceRoot pointing to my-medusa-store."
}

Write-Host "Sync handoff assets"
Write-Host "  from: $SourceRoot"
Write-Host "  to:   $dest"
Write-Host ""

$copyFiles = @(
  @{ From = "docs\00-agent-handoff.md"; To = "docs\00-agent-handoff.md" },
  @{ From = "docs\00-architecture-overview.mdx"; To = "docs\00-architecture-overview.mdx" },
  @{ From = "docs\01-database-schema.mdx"; To = "docs\01-database-schema.mdx" },
  @{ From = "docs\02-api-endpoints.mdx"; To = "docs\02-api-endpoints.mdx" },
  @{ From = "docs\03-business-workflows.mdx"; To = "docs\03-business-workflows.mdx" },
  @{ From = "docs\04-implementation-plan.mdx"; To = "docs\04-implementation-plan.mdx" },
  @{ From = "docs\06-drizzle-migration-guide.mdx"; To = "docs\06-drizzle-migration-guide.mdx" },
  @{ From = "docs\README.md"; To = "docs\README.md" },
  @{ From = "AGENTS.md"; To = "AGENTS.md" },
  @{ From = "AGENT_HANDOFF.md"; To = "AGENT_HANDOFF.md" },
  @{ From = ".cursor\rules\agent-handoff.mdc"; To = ".cursor\rules\agent-handoff.mdc" },
  @{ From = ".cursor\rules\medusa-project.mdc"; To = ".cursor\rules\medusa-project.mdc" },
  @{ From = ".cursor\rules\admin-development.mdc"; To = ".cursor\rules\admin-development.mdc" },
  @{ From = ".cursor\rules\storefront-development.mdc"; To = ".cursor\rules\storefront-development.mdc" },
  @{ From = ".cursor\skills\hono-medusa-rebuild\SKILL.md"; To = ".cursor\skills\hono-medusa-rebuild\SKILL.md" }
)

foreach ($item in $copyFiles) {
  $src = Join-Path $SourceRoot $item.From
  $tgt = Join-Path $dest $item.To
  if (-not (Test-Path $src)) {
    throw "Missing source: $src"
  }
  $dir = Split-Path $tgt -Parent
  if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }
  Copy-Item -Path $src -Destination $tgt -Force
  Write-Host "  OK $($item.To)"
}

Write-Host ""
Write-Host "Done. NOT overwritten: START_HERE.md, TRAE_KICKOFF_PROMPT.md, scripts/init.ps1, scripts/copy-dashboard-ui.ps1"
Write-Host "See docs/MIGRATION.md for full list."
