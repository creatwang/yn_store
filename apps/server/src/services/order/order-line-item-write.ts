import {
  generateId,
  orderItem,
  orderLineItem,
} from "@my-store/db"
import { HTTPException } from "hono/http-exception"
import type { DbTx } from "../../lib/infra/db/transaction"
import { variantService } from "../variant.service"

export type OrderLineItemWriteInput = {
  variant_id?: string
  title?: string | null
  quantity: number
  unit_price?: number
  metadata?: Record<string, unknown> | null
}

export async function insertOrderLineItemPair(
  tx: DbTx,
  orderId: string,
  input: OrderLineItemWriteInput,
): Promise<{ lineItemId: string; orderItemId: string }> {
  const variantId = input.variant_id?.trim()
  const customTitle = input.title?.trim()

  if (!variantId && !customTitle) {
    throw new HTTPException(400, {
      message: "Items must have either a variant_id or a title",
    })
  }

  let lineTitle = customTitle ?? ""
  let productId: string | null = null

  if (variantId) {
    const variant = await variantService.getVariantById(variantId)
    if (!lineTitle) lineTitle = variant.title ?? ""
    productId = variant.product_id ?? null
  }

  const resolvedUnitPrice =
    input.unit_price != null && Number.isFinite(Number(input.unit_price))
      ? Number(input.unit_price)
      : 0
  const rawUnitPrice = { amount: resolvedUnitPrice, precision: 2 }

  const lineItemId = generateId("olitm")
  const orderItemId = generateId("orditm")

  await tx.insert(orderLineItem).values({
    id: lineItemId,
    title: lineTitle || "Item",
    variant_id: variantId ?? null,
    product_id: productId,
    requires_shipping: true,
    is_giftcard: false,
    is_discountable: true,
    is_tax_inclusive: false,
    unit_price: String(resolvedUnitPrice),
    raw_unit_price: rawUnitPrice,
    metadata: input.metadata ?? null,
  })

  await tx.insert(orderItem).values({
    id: orderItemId,
    version: 1,
    order_id: orderId,
    item_id: lineItemId,
    quantity: String(input.quantity),
    raw_quantity: { amount: input.quantity, precision: 0 },
    unit_price: String(resolvedUnitPrice),
    raw_unit_price: rawUnitPrice,
    fulfilled_quantity: "0",
    shipped_quantity: "0",
    delivered_quantity: "0",
    return_requested_quantity: "0",
    return_received_quantity: "0",
    return_dismissed_quantity: "0",
    written_off_quantity: "0",
  })

  return { lineItemId, orderItemId }
}
