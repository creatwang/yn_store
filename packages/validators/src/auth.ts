import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email("请输入有效邮箱"),
  password: z.string().min(1, "请输入密码"),
})

export type LoginInput = z.infer<typeof loginSchema>

export const registerUserSchema = z.object({
  email: z.string().email("请输入有效邮箱"),
  password: z.string().min(8, "密码至少 8 位"),
})

export type RegisterUserInput = z.infer<typeof registerUserSchema>

export const resetPasswordRequestSchema = z.object({
  identifier: z.string().email("请输入有效邮箱"),
})

export type ResetPasswordRequestInput = z.infer<typeof resetPasswordRequestSchema>

export const updateProviderSchema = z.object({
  password: z.string().min(8, "密码至少 8 位"),
})

export type UpdateProviderInput = z.infer<typeof updateProviderSchema>

export const confirmResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "密码至少 8 位"),
})

export type ConfirmResetPasswordInput = z.infer<typeof confirmResetPasswordSchema>

export const refreshTokenSchema = z.object({
  token: z.string().min(1),
})

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>
