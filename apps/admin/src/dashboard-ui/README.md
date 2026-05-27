# dashboard-ui（方案 A：拷贝产物）

本目录为从 Medusa dashboard 源码 **拷贝**而来的 UI 代码，不是独立 npm 包。

## 开发方式

- **只**在 `apps/admin` 下开发：`pnpm dev --filter=@my-store/admin`（Vite HMR）
- **不要**维护第二套 dashboard 应用指望自动同步到本目录
- **不要**在 `vite.config` 里 alias 到外部 dashboard 源码

## 接入步骤

1. 拷贝：`pnpm run copy:dashboard-ui`（仓库根目录）
2. 将 `@medusajs/js-sdk` 改为 `@/lib/api` + `src/hooks/use-*.ts`
3. 路由与 `basename="/admin"` 对齐
4. 稳定后可从 `dashboard-ui/` 迁到 `src/components/`

## 对照 Medusa 原版（可选）

仅在需要对比行为时，使用旧后端环境临时启动 dashboard 进行对照，与 Hono Admin 无关。
