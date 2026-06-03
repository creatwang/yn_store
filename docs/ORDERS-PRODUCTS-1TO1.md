# 订单 / 商品 Admin 与 Server 对照说明

对照源：`apps/admin/demo/dashboard`（Medusa Admin v2.15.3）。

## 自检命令

```bash
pnpm check:orders-products-1to1
```

从官方 demo 重新覆盖关键表单（改 import 路径后写入 `src`）：

```bash
pnpm port:orders-products-stubs
```

## 已落地的 P0

| 项 | 说明 |
|----|------|
| 订单 5 个表单 | 自 demo 移植：创建履约、改地址、换货 inbound 表、余额结算 |
| 商品配送配置 | `product-shipping-profile-section` / `product-shipping-profile-form` |
| 变体库存项 | `manage-variant-inventory-items-form` |
| 创建运单路由 | `app.tsx` 参数 `:f_id`（与官方一致） |
| Returns dismiss | `POST /admin/returns/:id/dismiss-items` + `client.ts` 指向正确路径 |
| Product API | `getById` 加载 `shipping_profile`、变体 `prices`；`update` 写 shipping_profile / categories / tags / sales_channels |

## 仍待 P1/P2

- `order-edits` / `returns` / `claims` 其余路径与官方 action 模型完全对齐（含 order_change_action）
- 商品列表 fields 筛选、batch categories 树形 API
- 订单/商品页面残留硬编码英文 i18n
