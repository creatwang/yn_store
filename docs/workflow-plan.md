# Workflow 编排方案

> 目标：
> - **Workflow 引擎** — 处理"DB 操作 → 外部服务调用 → 失败回滚"的 8 个核心流程，外部服务通过 Provider 接口注入
> - **`dispatchRollbackProcess`** — 处理非 Workflow 场景下的业务回滚逻辑，独立于引擎
>
> 起草日期：2026-06-02

---

## 0. 架构分层

```
┌─────────────────────────────────────────────────┐
│  Workflow 引擎（lib/workflow.ts）               │
│  DB ─→ 外部服务 ─→ compensate ─→ 下一个 step   │
│  场景：8 个跨服务 + 外部调用的核心流程           │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  dispatchRollbackProcess（lib/rollback.ts）     │
│  try { action() } catch { dispatchRollback() }  │
│  场景：非 workflow 但有业务回滚逻辑的场景        │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  db.transaction()                              │
│  PostgreSQL 原生回滚                            │
│  场景：纯 DB 跨表操作，无外部调用               │
└─────────────────────────────────────────────────┘
```

---

## 1. 判断标准

| 场景 | 用 Workflow？ | 理由 |
|------|:--:|------|
| DB → 外部 API → 外部失败需回滚 DB | ✅ | 补偿逻辑有实际语义 |
| DB → 外部 API → 外部失败不影响数据 | ❌（普通函数） | 无补偿需求，fire-and-forget 足够 |
| 纯 DB 操作（单表或多表） | ❌ | `db.transaction()` 保证原子性 |
| 纯外部调用 | ❌ | 不需要编排 |

---

## 2. Provider 接口定义

未来外部服务种类繁多，但抽象为 4 类 Provider：

### 2.1 PaymentProvider

```ts
interface PaymentProvider {
  id: string
  /** 授权扣款（创建订单后） */
  authorize(input: { payment_id: string; amount: number; currency: string }): Promise<{ transaction_id: string }>
  /** 实际扣款 */
  capture(input: { transaction_id: string; amount: number }): Promise<{ capture_id: string }>
  /** 退款 */
  refund(input: { transaction_id: string; amount: number; reason?: string }): Promise<{ refund_id: string }>
  /** 取消授权 */
  cancel(input: { transaction_id: string }): Promise<void>
}
```

未来实现：StripeProvider、PayPalProvider、AlipayProvider、WeChatPayProvider

### 2.2 ShippingProvider

```ts
interface ShippingProvider {
  id: string
  /** 计算费率 */
  getRates(input: { origin: Address; destination: Address; items: Parcel[] }): Promise<RateQuote[]>
  /** 创建运单/获取面单 */
  createLabel(input: { rate_id: string; fulfillment_id: string }): Promise<{ tracking_number: string; label_url: string }>
  /** 取消运单 */
  cancelLabel(input: { label_id: string }): Promise<void>
  /** 追踪查询 */
  track(input: { tracking_number: string }): Promise<TrackingInfo>
}
```

未来实现：ShippoProvider、EasyPostProvider、DHLProvider、自行对接物流商

### 2.3 NotificationProvider

```ts
interface NotificationProvider {
  id: string
  channel: "email" | "sms" | "webhook" | "push"
  send(input: { to: string; template: string; data: Record<string, unknown> }): Promise<void>
}
```

未来实现：ResendProvider（现用）、TwilioProvider、WebhookProvider

### 2.4 InventoryProvider

```ts
interface InventoryProvider {
  id: string
  /** 推送库存变动到外部系统 */
  pushAdjustment(input: { inventory_item_id: string; quantity: number; reason: string }): Promise<void>
  /** 拉取外部库存 */
  pullStock(input: { sku: string }): Promise<{ quantity: number }>
}
```

未来实现：ERPProvider（SAP/Odoo）、WMSProvider、ShopifyProvider（多渠道同步）

---

## 3. 需要 Workflow 的业务流程

### 3.1 下单（order.confirm）✅ 需 Workflow

**当前代码**：`cartService.completeCheckout()`

| Step | 操作 | 类型 | 补偿 | 依赖 Provider |
|------|------|:--:|------|:--:|
| 1 | 校验购物车（非空、有 email） | DB 读 | — | — |
| 2 | 迁移地址到 order_address | DB 写 | DELETE order_address | — |
| 3 | 创建 order + order_items + shipping_methods + payment_collection | DB 写 | DELETE 全部关联行 | — |
| 4 | **预留** 调用 PaymentProvider.authorize() | 外部 | **失败 → 补偿 Step 2-3 → 取消订单** | ✅ PaymentProvider |
| 5 | 标记 cart.completed_at | DB 写 | —（补偿链已覆盖） | — |
| 6 | 发送通知 + 事件 | 外部 | fire-and-forget，不需要补偿 | NotificationProvider |

**当前 Provider**：`NOOPPaymentProvider`（直接返回 `{ transaction_id: "manual" }`）

**补偿关键点**：Step 4 失败 → 补偿 Step 3（DELETE order + items）→ 补偿 Step 2（DELETE order_address）。这就是你提到的"支付失败回滚订单"。

---

### 3.2 支付捕获（payment.capture）✅ 需 Workflow

**当前代码**：`paymentService.capture()`

| Step | 操作 | 类型 | 补偿 | 依赖 Provider |
|------|------|:--:|------|:--:|
| 1 | 校验 payment 存在且未 capture | DB 读 | — | — |
| 2 | INSERT capture 记录 | DB 写 | DELETE capture | — |
| 3 | **预留** PaymentProvider.capture() | 外部 | **失败 → 补偿 Step 2** | ✅ PaymentProvider |
| 4 | UPDATE payment.captured_at | DB 写 | — | — |

**当前 Provider**：`NOOPPaymentProvider`（直接返回 `{ capture_id: "manual" }`）

---

### 3.3 支付退款（payment.refund）✅ 需 Workflow

**当前代码**：`paymentService.refund()`

| Step | 操作 | 类型 | 补偿 | 依赖 Provider |
|------|------|:--:|------|:--:|
| 1 | 校验 payment 已 capture | DB 读 | — | — |
| 2 | INSERT refund 记录 | DB 写 | DELETE refund | — |
| 3 | UPDATE orderItem / orderClaim refund 金额 | DB 写 | 复原金额 | — |
| 4 | **预留** PaymentProvider.refund() | 外部 | **失败 → 补偿 Step 2-3 → 退款记录标记 failed** | ✅ PaymentProvider |
| 5 | 发送通知 | 外部 | fire-and-forget | NotificationProvider |

**当前 Provider**：`NOOPPaymentProvider`

---

### 3.4 履约创建（fulfillment.create）✅ 需 Workflow

**当前代码**：`fulfillmentService.create()`

| Step | 操作 | 类型 | 补偿 | 依赖 Provider |
|------|------|:--:|------|:--:|
| 1 | 校验订单状态 | DB 读 | — | — |
| 2 | INSERT fulfillment + items + labels + UPDATE orderItems | DB 写 | DELETE 全部（复原 orderItems） | — |
| 3 | **预留** ShippingProvider.createLabel() | 外部 | **失败 → 补偿 Step 2 → 删除 fulfillment** | ✅ ShippingProvider |
| 4 | 发送通知 + 事件 | 外部 | fire-and-forget | NotificationProvider |

**当前 Provider**：`NOOPShippingProvider`（返回 mock tracking_number）

---

### 3.5 发货确认（fulfillment.ship）✅ 需 Workflow

**当前代码**：`fulfillmentService.createShipment()`

| Step | 操作 | 类型 | 补偿 | 依赖 Provider |
|------|------|:--:|------|:--:|
| 1 | 校验 fulfillment 存在 | DB 读 | — | — |
| 2 | UPDATE fulfillment.shipped_at + INSERT labels + UPDATE orderItems.shipped_quantity | DB 写 | 复原 | — |
| 3 | **预留** ShippingProvider.confirmShipment() | 外部 | 失败不补偿 DB（label 已生成，物流已创建），手动处理 | ✅ ShippingProvider |
| 4 | 发送通知 + 事件 | 外部 | fire-and-forget | NotificationProvider |

**注意**：Step 3 失败后 DB 不回滚——运单已在物流商系统创建，DB 记录与物流商状态一致。补偿是重试而非回滚，或标记异常待人工处理。

---

### 3.6 退货创建（return.create）✅ 需 Workflow

**当前代码**：`returnService.create()`

| Step | 操作 | 类型 | 补偿 | 依赖 Provider |
|------|------|:--:|------|:--:|
| 1 | 校验订单 | DB 读 | — | — |
| 2 | INSERT orderReturn + returnItems + UPDATE orderItems.return_requested_quantity + INSERT orderChange | DB 写 | DELETE 全部 + 复原 orderItems | — |
| 3 | 创建 companion return（跨 service） | DB 写 | 同上 | — |
| 4 | 事件 | 外部 | fire-and-forget | — |

**当前不依赖 PaymentProvider**——退款是独立操作（管理员在确认收货后手动退款）。未来集成 Stripe 后，`return.receive` 才会触发 `PaymentProvider.refund()`。

---

### 3.7 索赔创建（claim.create）✅ 需 Workflow

**当前代码**：`claimService.create()`

| Step | 操作 | 类型 | 补偿 | 依赖 Provider |
|------|------|:--:|------|:--:|
| 1 | 校验订单 | DB 读 | — | — |
| 2 | INSERT orderClaim + claimItems + UPDATE orderItems + INSERT orderChange + actions | DB 写 | DELETE 全部 | — |
| 3 | 创建 companion return | DB 写 | 同上 | — |
| 4 | 事件 | 外部 | fire-and-forget | — |

**与 return.create 同理**——退款是独立操作，当前无 PaymentProvider 依赖，但预留。

---

### 3.8 换货创建（exchange.create）✅ 需 Workflow

**当前代码**：`exchangeService.create()`

| Step | 操作 | 类型 | 补偿 | 依赖 Provider |
|------|------|:--:|------|:--:|
| 1 | 校验订单 | DB 读 | — | — |
| 2 | INSERT orderExchange + outbound item actions + companion return + orderChange | DB 写 | DELETE 全部 | — |
| 3 | 事件 | 外部 | fire-and-forget | — |

---

## 4. dispatchRollbackProcess — 非 Workflow 的业务回滚

### 定位

Workflow 引擎处理的是多步编排 + 外部服务调用。但有一些场景不需要引擎的 step 链，只需要"执行业务操作，失败时执行业务回滚"——一个简单的 try/catch 包装。

`dispatchRollbackProcess` 就是干这个的。

### API

```ts
export async function dispatchRollbackProcess<T>(
  action: () => Promise<T>,
  rollback: (result: T | null, error: Error) => Promise<void>,
): Promise<T> {
  let result: T | null = null
  try {
    result = await action()
    return result
  } catch (err) {
    await rollback(result, err as Error)
    throw err
  }
}
```

### 与 Workflow 引擎的区别

| 维度 | Workflow 引擎 | dispatchRollbackProcess |
|------|:--:|:--:|
| 步骤数 | 多步，有依赖顺序 | 单步（一个 action → 一个 rollback） |
| 回滚粒度 | 每步有独立 compensate | 只有一个 rollback |
| Provider 注入 | ✅ 引擎注入 | ❌ 不需要 |
| 适合场景 | order.confirm、payment.capture 等复杂流程 | action 追踪、单表 + 业务回滚 |

### 使用示例

```ts
// 订单编辑 addItems：写 order_change_action + 写 line_item
// 如果 line_item 写入失败，要删除已创建的 action
await dispatchRollbackProcess(
  async () => {
    const action = await db.insert(orderChangeAction).values({...}).returning()
    const item = await db.insert(orderLineItem).values({...}).returning()
    return { action, item }
  },
  async (result) => {
    if (result?.action) {
      await db.delete(orderChangeAction).where(eq(orderChangeAction.id, result.action.id))
    }
  },
)
```

### 适用场景

| 场景 | 位置 | 说明 |
|------|------|------|
| order-edit addItems | `orderEditService` | 创建 action + line_item，失败要删 action |
| order-edit confirm | `orderEditService` | 批量 apply actions，中间失败要回滚已 apply 的 |
| claim addInboundItems | `claimService` | 创建 claimItem + update orderItem，失败要回滚 |
| exchange addOutboundItems | `exchangeService` | 同上 |
| return create | `returnService` | 见上方 3.6（当前无外部调用时可简化为此模式） |

---

## 5. 不需要 Workflow 也不需 dispatchRollbackProcess 的场景

| 场景 | 原因 |
|------|------|
| order.cancel | 纯 DB 操作（status → canceled），无外部调用 |
| order.complete | 纯 DB 操作 |
| fulfillment.cancel | 纯 DB 操作（恢复 orderItems.fulfilled_quantity） |
| fulfillment.delivered | DB + 通知。通知 fire-and-forget 无需补偿 |
| order-edit.confirm | 纯 DB 操作（apply actions），价格差由管理员手动处理 |
| 所有通知/邮件 | 异步 fire-and-forget，失败不影响业务数据 |
| 库存调整 | 纯 DB。未来接 ERP 时通过 InventoryProvider 推送 |

---

## 6. Provider 注册表

```ts
// lib/providers.ts
const providers = {
  payment: new Map<string, PaymentProvider>(),    // 启动时注册
  shipping: new Map<string, ShippingProvider>(),
  notification: new Map<string, NotificationProvider>(),
  inventory: new Map<string, InventoryProvider>(),
}

// 默认挂载 NOOP provider（所有预留位置返回 mock 数据）
providers.payment.set("noop", new NOOPPaymentProvider())
providers.shipping.set("noop", new NOOPShippingProvider())
```

Workflow 通过 provider ID 查找对应实现。现在注册 NOOP，未来注册 Stripe/Shippo。

---

## 7. 实施顺序

| 阶段 | 内容 | 文件 |
|:--:|------|------|
| 1 | 实现 `dispatchRollbackProcess` 工具函数 | `lib/rollback.ts` |
| 2 | 定义 4 个 Provider 接口 | `lib/providers/types.ts` |
| 3 | 实现 4 个 NOOP Provider（桩） | `lib/providers/noop.ts` |
| 4 | 升级 Workflow 引擎（StepContext 传递输出 + 透传 provider 实例） | `lib/workflow.ts` |
| 5 | 迁 8 个流程入 workflow | `workflows/<name>.ts` |
| 6 | 非 workflow 场景接入 `dispatchRollbackProcess` | 各 service 文件 |
| 7 | 路由 + Service 切换为调用 workflow | 8 个路由/Service 方法 |

---

## 8. 未来新增 Provider 的改动量

以将来接 Stripe 为例：

1. 实现 `StripePaymentProvider`（~80 行）
2. 在 `app.ts` 启动时 `providers.payment.set("stripe", new StripePaymentProvider(...))`
3. 修改环境变量 `PAYMENT_PROVIDER=stripe`
4. **不改任何业务代码**——Workflow 通过 provider ID 自动适配

以此类推物流（Shippo）、通知（Twilio）、库存同步（ERP）。
