---
name: workflow-engine
description: 轻量 Workflow 引擎（step + compensate），适用于跨系统边界的多步操作。纯数据库操作用 `db.transaction()`，不需要此引擎。
---

# Workflow 引擎使用指南

## 何时使用

**适用场景（跨系统边界）：**
- 订单创建 → 外部支付网关扣款 → 本地落库
- 发货 → 物流追踪 API 注册 → 本地更新
- 退款 → 第三方支付退款 → 本地标记

**不适用的场景（用 `db.transaction()` 即可）：**
- 纯数据库操作（同一 PostgreSQL）
- 不涉及外部 API、事件总线、消息队列

## 文件位置

| 文件 | 说明 |
|------|------|
| `apps/server/src/lib/workflow.ts` | Workflow 引擎核心 |
| `apps/server/src/lib/events.ts` | 事件总线 |
| `apps/server/src/workflows/*.ts` | Workflow 定义示例 |

## API

```typescript
import { createWorkflow, step } from "../lib/workflow"
import { eventBus } from "../lib/events"

// 定义 Workflow
const myWorkflow = createWorkflow("my-workflow", [
  step("step-1",
    async ({ input }) => {
      // handler：执行逻辑
      const result = await externalApi.call(input)
      return { id: result.id }
    },
    async ({ input }) => {
      // compensate：回滚（handler 异常时逆序调用）
      await externalApi.rollback(input)
    }
  ),
  step("step-2",
    async ({ input, ctx }) => {
      // ctx["step-1"] 可访问上一步结果
      const previousId = ctx["step-1"].id
      await db.insert(record).values({ id: previousId })
      return { ok: true }
    }
  ),
])

// 执行
const result = await myWorkflow.run(input)
// result = { ok: true } （最后一个 step 的返回值）
```

## 执行逻辑

1. 按数组顺序执行 step
2. 某一步失败 → **逆序**调用所有已完成 step 的 compensate
3. 原始异常继续向上抛
4. 成功 → 返回最后一个 step 的返回值

## 注意事项

- compensate 只有在 handler 执行成功后才注册（即前一步成功，后一步失败时才会触发补偿）
- compensate 本身失败不会阻断后续补偿（try-catch 包裹）
- 补偿是手动操作，需要根据业务逻辑实现正确的逆向操作
- 当前引擎不依赖 Medusa 运行时（`req.scope`），可直接在 Hono route handler 中调用
