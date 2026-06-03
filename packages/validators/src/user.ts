import { z } from "zod"

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
