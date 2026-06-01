---
name: user-prefs
description: 用户技术偏好、基础设施选择和编码习惯
metadata:
  type: user
---

## 基础设施

- **数据库**: Supabase (PostgreSQL)，DATABASE_URL 存于 apps/server/.env
- **ORM**: Drizzle ORM，无 migration 系统（直接连 Supabase 已有表）
- **认证**: JWT (jose 库，HS256)，token 存 localStorage
- **邮件**: Nodemailer，本地用 Mailpit 验收，生产配 SMTP_HOST 等环境变量
- **测试框架**: Vitest (单 worker，避免 Supabase pool_size=15 超限)

## 编码偏好

- 不主动写测试，除非用户要求
- 不 git commit，除非用户要求
- 改代码优先 minimal diff，不改无关代码
- 中文 UI 文案
- 后端 API 挂 /api 前缀，Hono RPC 风格
- 前端 storefront 用 Astro (SSR)，admin 用 Vite + React
- 不支持完整的 Medusa 促销规则引擎——只做当前需求范围内的

## 项目约定

- **文档优先**: 做功能前先查 docs/14/15/16，不要仅凭文件是否存在判断
- **Demo 参考**: 实现 Admin UI 前先看 apps/admin/demo/dashboard 对应页面
- **不改 Medusa 表结构**: DDL 不擅自变更

**Why:** 记录用户的技术选择和偏好，避免每次重新确认。
**How to apply:** 写代码前参考，不符合这些偏好的方案就不要再提。
