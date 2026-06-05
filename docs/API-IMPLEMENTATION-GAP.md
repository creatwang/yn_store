# API 实现 vs Medusa 官方对照（本仓库）

> **核实日期**：2026-06-04  
> **官方对照表**：[02-api-endpoints.mdx](./02-api-endpoints.mdx)（Medusa v2.15.3 全量 ~220 Admin 路由，**非**本仓库承诺范围）  
> **实际挂载**：`apps/server/src/app.ts`  
> **自动化**：`pnpm --filter=@my-store/server test` → **23 文件 / 182 用例**（2026-06-04 全绿）

---

## 1. 运营路径抽样（本机 `DATABASE_URL`）

| 场景 | 方法 | 路径 | HTTP | 说明 |
|------|------|------|:----:|------|
| 地区 | GET | `/admin/regions` | 200 | `regions,count,...` |
| 商店 | GET | `/admin/stores` | 200 | `stores,count,...` |
| 税收区域 | GET | `/admin/tax-regions` | 200 | `tax_regions,count,...` |
| 支付供应商 | GET | `/admin/payments/payment-providers` | 200 | `payment_providers,...` |
| 产品列表 | GET | `/admin/products` | 200 | `products,count,...` |
| 创建产品 | POST | `/admin/products` | 201 | `product` |
| 价格列表 | GET | `/admin/price-lists` | 200 | `price_lists,...` |
| 库存 | GET | `/admin/inventory-items` | 200 | `inventory_items,...` |
| 订单 | GET | `/admin/orders` | 200 | `orders,...` |
| 客户 | GET | `/admin/customers` | 200 | `customers,...` |
| 促销 | GET | `/admin/promotions` | 200 | `promotions,...` |
| 销售渠道 | GET | `/admin/sales-channels` | 200 | `sales_channels,...` |
| 仓库 | GET | `/admin/stock-locations` | 200 | `stock_locations,...` |
| 通知 | GET | `/admin/notifications` | 200 | `notifications,...` |
| 产品导入 | POST | `/admin/products/import` | 200 | `transaction_id,summary` |

---

## 2. 已挂载 Admin 前缀（实现入口）

与 `app.ts` 一致，含 CRUD 工厂覆盖的实体：

`products`、`orders`、`customers`、`carts`、`regions`、`sales-channels`、`stock-locations`、`inventory-items`、`product-categories`、`collections`、`customer-groups`、`price-lists`、`tax-rates`、`tax-regions`、`reservations`、`shipping-profiles`、`shipping-option-types`、`currencies`、`promotions`、`campaigns`、`api-keys`、`notifications`、`workflows-executions`、`shipping-options`、`price-preferences`、`property-labels`、`fulfillment-sets`、`fulfillment-providers`、`fulfillments`、`payment-collections`、`uploads`、`stores`、`payments`、`returns`、`claims`、`exchanges`、`order-edits`、`draft-orders`、`users`、`invites`、`product-tags`、`product-types`、`return-reasons`、`refund-reasons`、`views`、`locales`、`tax-providers`，及 batch/link 子路由（价格表 batch、库存 batch、集合/渠道关联等）。

Store：`products`、`orders`、`carts`、`customers`、`regions`、`sales-channels`、`shipping-options`、`payment-collections`、`payment-providers`、`collections`、`promotions`。  
Auth：自定义 JWT（非文档中的 `/auth/user/emailpass` 路径名，语义等价）。

---

## 3. `02-api-endpoints.mdx` 有、本仓库未单独挂载的模块

| 官方模块 | 状态 | 备注 |
|----------|:----:|------|
| Feature Flags | ❌ | 无 `/admin/feature-flags` |
| Plugins | ❌ | 无 `/admin/plugins` |
| Translations | ❌ | 无 `/admin/translations` |
| Order Changes（独立资源） | ❌ | 变更多合并在 orders/returns/claims 流程 |
| RBAC（roles/policies 全量） | ⚠️ | 有 `users`/`invites`，无完整角色策略 API |
| Index | ❌ | 无 Medusa Index 同步 API |

其余模块：**有路由壳**，但子路径/动作数常少于官方（例如 Claim/Exchange 细粒度 action、Draft Order edit 全步骤）。以 Vitest + 上表抽样为准，不以 02 文档行数计完成度。

---

## 4. 语义差异（非缺失但路径/行为不同）

| 项 | 官方（02） | 本仓库 |
|----|-----------|--------|
| Admin 鉴权 | `POST /auth/user/emailpass` | `POST /auth/...`（见 `routes/auth`） |
| 更新/删除 | 部分 `DELETE` | 多数实体 `POST /:id` + body |
| Notification status | `pending` / `success` / `failure` | 已对齐（2026-06-04 修） |
| Upload 不存在 | 404 | 404（测试已改） |
| 产品导出 URL | 因部署而异 | `/api/admin/products/export/:id` |

---

## 5. Admin UI `export const stub = {}`（18 处，2026-06-04）

价格列表 add/edit 表单**已**从官方拷贝，不在此列。

| # | 路由域 | 文件（`apps/admin/src/routes/...`） |
|---|--------|-----------------------------------|
| 1 | 税收-覆盖编辑 | `tax-regions/.../tax-region-tax-override-edit-form.tsx` |
| 2 | 税收-税率编辑 | `tax-regions/.../tax-region-tax-rate-edit-form.tsx` |
| 3 | 税收-税率新建 | `tax-regions/.../tax-region-tax-rate-create-form.tsx` |
| 4 | 税收-覆盖新建 | `tax-regions/.../tax-region-override-create.tsx` |
| 5 | 税收-省覆盖区 | `tax-regions/.../tax-region-province-override-section.tsx` |
| 6 | 税收-省详情区 | `tax-regions/.../tax-region-detail-section.tsx` |
| 7 | 税收-省新建 | `tax-regions/.../tax-region-province-create-form.tsx` |
| 8 | 运输配置-列表表 | `shipping-profiles/.../shipping-profile-list-table.tsx` |
| 9 | 运输配置-详情 | `shipping-profiles/.../shipping-profile-general-section.tsx` |
| 10 | 运输配置-新建 | `shipping-profiles/.../create-shipping-profile-form.tsx` |
| 11 | 运输选项类型-列表 | `shipping-option-types/.../shipping-option-type-list-table.tsx` |
| 12 | 运输选项类型-编辑 | `shipping-option-types/.../edit-shipping-option-type-form.tsx` |
| 13 | 退货原因-新建 | `return-reasons/.../return-reason-create-form.tsx` |
| 14 | 退款原因-新建 | `refund-reasons/.../refund-reason-create-form.tsx` |
| 15 | 产品类型-产品区 | `product-types/.../product-type-product-section.tsx` |
| 16 | 产品类型-通用区 | `product-types/.../product-type-general-section.tsx` |
| 17 | 产品标签-产品区 | `product-tags/.../product-tag-product-section.tsx` |
| 18 | 产品标签-通用区 | `product-tags/.../product-tag-general-section.tsx` |

后端 CRUD 多已存在；**空壳在 Admin 拷贝层**，点进子页可能白屏或仅布局。

---

## 6. 维护说明

- 改路由 → 更新 `app.ts` + 本文 §2–§3 + [PROJECT_STATUS.md](./PROJECT_STATUS.md)  
- 改 stub → 更新本文 §5（`rg 'export const stub' apps/admin`）  
- **勿**用 [02-api-endpoints.mdx](./02-api-endpoints.mdx) 行数推算「完成百分比」
