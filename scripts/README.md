# scripts

| File | Command | Purpose |
|------|---------|---------|
| `init.ps1` | `pnpm run init` | Check env, .env, pnpm install |
| `migrate-from-legacy.ps1` | `pnpm run migrate` | Full sync from `../my-medusa-store` (docs, code, .cursor) |
| `sync-handoff-from-old.ps1` | `pnpm run sync:handoff` | Docs + .cursor only |
| `patch-hono-docs.ps1` | `pnpm run patch:hono-docs` | Placeholder (hono overlays in repo) |
| `copy-dashboard-ui.ps1` | `pnpm run copy:dashboard-ui` | Copy Medusa Dashboard UI |

## Typical migration

```powershell
pnpm run migrate
pnpm run init
```
