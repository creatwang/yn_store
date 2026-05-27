# Re-apply hono-specific doc lines (ASCII only, safe on Windows PowerShell)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Write-Host "patch-hono-docs: docs already customized in hono repo; no-op."
Write-Host "Edit docs/00-agent-handoff.md and AGENT_HANDOFF.md manually if needed."
