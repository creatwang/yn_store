# 购物车 · 结算 · 认证流程

> API 前缀：`{PUBLIC_API_URL}/api`  
> 封装：`src/lib/cart.ts`、`src/lib/auth.ts`  
> UI 状态：`src/stores/cartStore.ts`

---

## 1. 购物车生命周期

```
用户首次加购
  → localStorage 无 cart_id
  → POST /store/carts { currency_code }
  → setCartId(cart.id)
  → POST /store/carts/:id/line-items { variant_id, quantity }
  → incrementCart() 乐观更新角标
```

```
再次加购
  → getCartId()
  → POST line-items（同一 cart）
```

```
加购失败
  → decrementCart()
  → 展示 inline 错误（role="status"）
```

**权威数据**：server cart；`$cartCount` 仅 UI 角标，页面 load 时 `CartCountInit` 与 server 同步。

---

## 2. 关键 API

| 动作 | 方法 | 路径 |
|------|------|------|
| 创建 cart | POST | `/store/carts` |
| 加 line item | POST | `/store/carts/:id/line-items` |
| 更新数量 | POST | `/store/carts/:id/line-items/:itemId` |
| 删除行 | DELETE | `/store/carts/:id/line-items/:itemId` |
| 读 cart | GET | `/store/carts/:id` |

`apiFetch` 自动附加 `Authorization`（若已登录）。

---

## 3. localStorage 键

| 键 | 文件 | 用途 |
|----|------|------|
| `storefront_cart_id` | cart.ts | Server cart ID |
| `storefront_customer_token` | auth.ts | JWT |
| `storefront_customer` | auth.ts | 客户 JSON 缓存 |

---

## 4. 认证流程

### 登录

```
POST /auth/customer/emailpass { email, password }
  → { token, customer }
  → setCustomerSession(token, customer)
  → linkCartToCustomer(cartId)  // 若 cart 存在
```

### 注册

```
POST /store/customers/register
  → loginCustomer(email, password)
```

### 登出

```
clearCustomerSession()
// cart_id 保留，匿名 cart 仍可用
```

---

## 5. Checkout 多步（MVP）

`pages/checkout.astro` 内联 script，大致顺序：

1. 确保 cart_id 存在且 cart 有 line items
2. `GET /store/regions` → 选 region
3. 填写地址 → 更新 cart shipping address
4. `GET /store/shipping-options` → 选配送
5. `POST` payment collection / session
6. `POST` complete cart → order
7. `clearCartId()` + 跳转 account 或 thank you

**目标态**：拆分子组件 + SSR 流式；极复杂块才 Preact `client:visible`。

---

## 6. 与 Astro 渲染模式

| 页面 | 应用 prerender |
|------|----------------|
| cart / checkout / account | `false`（需 hybrid） |
| login / register | `false`（表单 POST / script） |

当前 MVP 为 **static 预渲染** → 交易页 JS 在客户端跑；迁移 hybrid 后改 server 首屏 HTML。

---

## 7. 加购组件（已实现）

`ProductAddToCart.astro`：

- `<output for="variant-select">` 价格
- `<fieldset>` 规格 + 数量
- `<script>` 调 `apiFetch` + `incrementCart` / `decrementCart`

模板：[code-templates.md](code-templates.md) §ProductAddToCart

---

## 8. 错误 UX

- 使用 `role="status"` + `aria-live="polite"` 展示错误（非 SnackBar）
- 红色文案用 class `text-red-600`
- 不在 presentation 解析后端 error 结构；lib 抛可读 message

---

## 9. 禁止事项

- ❌ 纯前端 cart 数组作订单来源
- ❌ Redux / Context 全站 cart
- ❌ `@medusajs/js-sdk`
- ❌ Astro Session 存 cart_id
- ❌ 加购用 React 岛

---

## 10. 相关文档

- Store API 路由表：[reference.md](reference.md)
- Nano Stores：[islands-strategy.md](islands-strategy.md) §5
- middleware 保护：[middleware-security.md](middleware-security.md)
