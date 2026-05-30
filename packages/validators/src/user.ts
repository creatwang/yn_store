import { z } from "zod"

// ── 用户列表查询 ──────────────────────────────────────────────
export const listUsersSchema = z.object({
  limit: z.coerce.number().min(1).default(50),
  offset: z.coerce.number().min(0).default(0),
  q: z.string().optional(),
  order: z.string().optional(),
})

export type ListUsersQuery = z.infer<typeof listUsersSchema>

// ── 更新用户 ──────────────────────────────────────────────────
export const updateUserSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email().optional(),
  avatar_url: z.string().url().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
})

export type UpdateUserInput = z.infer<typeof updateUserSchema>

// ── 创建邀请 ──────────────────────────────────────────────────
export const createInviteSchema = z.object({
  email: z.string().email(),
})

export type CreateInviteInput = z.infer<typeof createInviteSchema>

// ── 接受邀请 ──────────────────────────────────────────────────
export const acceptInviteSchema = z.object({
  email: z.string().email(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
})

export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>

// ── 邀请列表查询 ──────────────────────────────────────────────
export const listInvitesSchema = z.object({
  limit: z.coerce.number().min(1).default(50),
  offset: z.coerce.number().min(0).default(0),
})

export type ListInvitesQuery = z.infer<typeof listInvitesSchema>
