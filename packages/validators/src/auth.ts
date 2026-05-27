import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email("请输入有效邮箱"),
  password: z.string().min(1, "请输入密码"),
})

export type LoginInput = z.infer<typeof loginSchema>

export const refreshTokenSchema = z.object({
  token: z.string().min(1),
})

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>
