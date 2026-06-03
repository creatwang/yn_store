# Druid 式数据库连接池（本项目实现）

## 对标关系

| Druid | 本项目 |
|-------|--------|
| `maxActive` | `DB_POOL_MAX`（默认 **20**，上限 50） |
| `maxWait=-1` 无限等连接 | `DB_MAX_WAIT_MS` 未设或 **0** → 借连接**无限排队** |
| `maxWait` 毫秒超时 | `DB_MAX_WAIT_MS=30000` 等 → `database_pool_busy` |
| 单例 DataSource | `globalThis` 每进程一个 `postgres()` |
| 占满不立刻失败 | **两层队列**（见下） |

## 两层排队（压测时关键）

1. **应用层 `DbConcurrencyGate`**（`packages/db/src/db-gate.ts`）  
   每条 SQL 先「借槽位」，槽位 = `maxActive`，满了就排队，默认**一直等**。

2. **驱动层 `postgres.js`**  
   `max` 与 `maxActive` 一致；TCP 连接占满时驱动内继续排队。

压测 Admin 并行 HTTP 时，请求会在应用层排队拿槽位，而不是瞬间冲 50 路建连把库打挂后返回 `database_unavailable`。

## 环境变量（只改这些，与端口无关）

```env
DB_POOL_MAX=20          # maxActive
DB_MAX_WAIT_MS=0        # 0 或未设 = 无限等待（Druid 阻塞借连接）
DB_CONNECT_TIMEOUT=60   # 单次建连超时（秒）
DB_IDLE_TIMEOUT=60
DB_MAX_LIFETIME=600
```

Supabase pooler 已自动 `prepare: false`（任意 `pooler.supabase.com`）。

## 仍会导致 503 的情况（不是池「不够大」）

- **多进程**各建一池：`pnpm dev` + `vitest` + 第二个 terminal `dev:server` → 抢云端总名额。
- **僵尸进程**未 `closeDb`：用 `pnpm predev` 清端口与 `entry.node`。
- **显式排队超时**：设了 `DB_MAX_WAIT_MS>0` 且压测超过该时间。

启动日志示例：

```text
📦 DB pool (Druid): maxActive=20, maxWait=无限等待（Druid maxWait=-1）, connect_timeout=60s
   两层排队：① 应用借连接队列 ② postgres.js 池满继续排队；占满不立刻失败
```

## 代码侧并发习惯

单请求内避免无界 `Promise.all` / `map(async)` 同时打 DB；列表已批量 `inArray` 的见 `order-change-actions-batch.ts`、`product-option-values-batch.ts` 等。
