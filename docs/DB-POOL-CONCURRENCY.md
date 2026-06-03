# 数据库连接池与并发

## Supabase：`:5432` vs `:6543`（先选对端口）

| | **:5432 Session pooler** | **:6543 Transaction pooler** |
|--|--------------------------|------------------------------|
| 本质 | 更接近 **Postgres 直连名额**（全项目共享约十余条） | **云端连接池（叫号机）**，客户端并发由池 multiplex |
| 本地 `DB_POOL_MAX` | 默认 **2**（勿轻易 4+，多进程会抢同一批名额） | 默认 **10**（可按需 **10～20**，一般不易 `Too many clients`） |
| 典型问题 | 僵尸 idle + 重启 dev → 第 5 条连接被 DB **踢断** | 需 `prepare: false`（已在 `client.ts` 配置） |
| 推荐 | 仅当必须用 Session 特性时 | **日常开发 / Admin / vitest 优先** |

单例只保证「每进程一个池」；**端口选错**时，池再大也会在 `:5432` 上撞物理上限。

## 两类常见故障

### 1. 单进程内的「隐式并发」

即使 `packages/db` 使用 `globalThis` 单例，**同一 HTTP 请求**里若 `Promise.all` 或 `array.map(async …)` 同时发起 N 条查询，仍会瞬间占满本进程 `max`（Session pooler 默认 **2**）。

典型症状：`database_unavailable`、连接等待超时、Socket hang up。

**已收敛的热点（串行或批量 IN）：**

- `order.service.getChanges`：`order_change_action` 改为 `inArray` 一次查询
- `order-edit.service.list`：同上
- `order-edit.service.confirm`：变体快照在事务**外**预加载，避免事务占坑时再 `getDb()` 抢连接
- `admin-order` 详情 / `relations` / `presenter`：关联加载改为串行 `await`

**已批量收敛：**

- `product.service` / `option.service`：`product_option_value` 用 `inArray` 一次查询后内存分组（`product-option-values-batch.ts`）
- `stock-location.service`：库位树（zones / geo / shipping_options）与 `enrichShippingOption` 改为固定轮次批量查询（`shipping-option-enrich-batch.ts`）

**仍需谨慎：**

- Admin 一单页会并行请求 `order`、`preview`、`variants` 等多个接口 → 多 HTTP 请求叠加
- 列表接口 `Promise.all([rows, count])` 仅 2 路，一般可接受

### 2. Supabase 僵尸 idle 连接

开发时 Ctrl+C 重启，海外 Session pooler 上的旧连接要等 `idle_timeout` 才回收。新进程再申请连接时，**旧 idle + 新连接** 可能超过项目上限。

**缓解：**

- 推荐 `DATABASE_URL` 使用 **Transaction pooler `:6543`**（`prepare: false`）
- Session `:5432` 时设 `DB_POOL_MAX=2`，勿同时 `pnpm dev:server` + `vitest`
- `entry.node.ts` 在 SIGINT/SIGTERM 调用 `closeDb()` 释放本地池
- Session pooler 下 `idle_timeout` 已缩短为 **10s**（见 `packages/db/src/client.ts`）

## 环境变量

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | **`:6543`** Transaction pooler（推荐） |
| `DB_POOL_MAX` | 覆盖默认：`:6543` 默认 **10**，`:5432` 默认 **2**，本地 PG 默认 **4** |

启动日志会打印 `describeDbPool()` 的 `max` 与 `mode`。
