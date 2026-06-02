---
name: user-prefs
description: 用户技术偏好和编码习惯
metadata:
  type: user
---

## 基础设施
- 数据库: Supabase PostgreSQL，不改 Medusa 表结构
- ORM: Drizzle
- 认证: Hono JWT (jose)，不换 Clerk/Better Auth
- 品牌: Yanan Store → @my-store/config
- 邮件: Resend API

## 编码偏好
- 不 git commit 除非要求
- 最小 diff，不改无关代码
- 中文 UI
- Admin UI 从 apps/admin/demo/dashboard 拷贝参考
- Storefront 不引入 React/Preact (checkout 除外)

## 关键文档
- docs/PROJECT_STATUS.md — 权威状态
- docs/00-agent-handoff.md — 项目全貌

**Why:** 记录偏好避免每次确认。
**How to apply:** 写代码前对照约束。
