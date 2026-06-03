import { z } from "zod"

export const createPaymentSchema = z.object({
  amount: z.number().positive(),
  currency_code: z.string().min(1),
  order_id: z.string().optional(),
  cart_id: z.string().optional(),
})

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>

export const capturePaymentSchema = z.object({
  amount: z.number().positive().optional(),
})

export type CapturePaymentInput = z.infer<typeof capturePaymentSchema>

export const refundPaymentSchema = z.object({
  amount: z.number().positive(),
  note: z.string().optional(),
})

export type RefundPaymentInput = z.infer<typeof refundPaymentSchema>