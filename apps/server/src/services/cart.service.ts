import { and, eq, inArray, isNull, sql } from "drizzle-orm"
import {
  cart,
  cartLineItem,
  cartLineItemAdjustment,
  cartShippingMethod,
  order,
  orderLineItem,
  orderItem,
  orderShippingMethod,
  paymentCollection,
  promotion,
  getDb,
  generateId,
} from "@my-store/db"
import { HTTPException } from "hono/http-exception"
import type { CreateCartInput, AddToCartInput, UpdateCartInput } from "@my-store/validators"
import { sendOrderConfirmationEmail } from "../lib/mail"

export const cartService = {
  async create(input: CreateCartInput) {
    const db = getDb()
    const id = generateId("cart")

    const [created] = await db
      .insert(cart)
      .values({
        id,
        region_id: input.region_id ?? null,
        customer_id: input.customer_id ?? null,
        sales_channel_id: input.sales_channel_id ?? null,
        email: input.email ?? null,
        currency_code: input.currency_code ?? "USD",
        metadata: input.metadata ?? null,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .returning()

    return { cart: created }
  },

  async getById(id: string) {
    const db = getDb()
    const [cartItem] = await db
      .select()
      .from(cart)
      .where(and(eq(cart.id, id), isNull(cart.deleted_at)))
      .limit(1)

    if (!cartItem) {
      throw new HTTPException(404, { message: "Cart not found" })
    }

    const items = await db
      .select()
      .from(cartLineItem)
      .where(and(eq(cartLineItem.cart_id, id), isNull(cartLineItem.deleted_at)))

    const shippingMethods = await db
      .select()
      .from(cartShippingMethod)
      .where(and(eq(cartShippingMethod.cart_id, id), isNull(cartShippingMethod.deleted_at)))

    // Load adjustments (promo discounts) for display
    const itemIds = [...items.map((i) => i.id)]
    let adjustments: any[] = []
    if (itemIds.length > 0) {
      try {
        adjustments = await db
          .select()
          .from(cartLineItemAdjustment)
          .where(sql`${cartLineItemAdjustment.item_id} = ANY(${itemIds}::text[])`)
      } catch { /* table may not exist yet */ }
    }

    return { cart: cartItem, items, shipping_methods: shippingMethods, adjustments }
  },

  async addItem(cartId: string, input: AddToCartInput) {
    const db = getDb()
    await this.getById(cartId)

    // 查变体价格（USD），通过 price_set 链，写入 unit_price
    let unitPrice = "0"
    if (input.variant_id) {
      try {
        const priceRows = await db.execute(sql`
          SELECT pr.amount FROM price pr
          JOIN price_set ps ON ps.id = pr.price_set_id
          JOIN product_variant_price_set pvps ON pvps.price_set_id = ps.id
          WHERE pvps.variant_id = ${input.variant_id} AND pr.currency_code = 'usd'
          LIMIT 1
        `)
        const rows = Array.isArray(priceRows) ? priceRows : (priceRows as any).rows ?? []
        if (rows[0]) {
          unitPrice = String(rows[0].amount)
        }
      } catch { /* price table not yet populated or schema mismatch */ }
    }

    const id = generateId("line")

    const [item] = await db
      .insert(cartLineItem)
      .values({
        id,
        cart_id: cartId,
        variant_id: input.variant_id,
        product_id: input.product_id ?? null,
        title: input.title ?? "",
        quantity: input.quantity,
        metadata: input.metadata ?? null,
        unit_price: unitPrice,
        raw_unit_price: { value: unitPrice, precision: 20 },
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .returning()

    return { item }
  },

  async updateItem(cartId: string, itemId: string, input: { quantity: number }) {
    const db = getDb()
    await this.getById(cartId)

    const [item] = await db
      .update(cartLineItem)
      .set({ quantity: input.quantity, updated_at: sql`now()` })
      .where(
        and(
          eq(cartLineItem.id, itemId),
          eq(cartLineItem.cart_id, cartId),
          isNull(cartLineItem.deleted_at)
        )
      )
      .returning()

    if (!item) {
      throw new HTTPException(404, { message: "Item not found" })
    }

    return { item }
  },

  async removeItem(cartId: string, itemId: string) {
    const db = getDb()
    await this.getById(cartId)

    const deleted = await db
      .delete(cartLineItem)
      .where(
        and(
          eq(cartLineItem.id, itemId),
          eq(cartLineItem.cart_id, cartId),
          isNull(cartLineItem.deleted_at)
        )
      )
      .returning({ id: cartLineItem.id })

    if (deleted.length === 0) {
      throw new HTTPException(404, { message: "Item not found" })
    }

    return { success: true }
  },

  async update(cartId: string, input: UpdateCartInput) {
    const db = getDb()
    await this.getById(cartId)

    const [updated] = await db
      .update(cart)
      .set({
        ...(input.region_id !== undefined && { region_id: input.region_id }),
        ...(input.customer_id !== undefined && { customer_id: input.customer_id }),
        ...(input.email !== undefined && { email: input.email }),
        ...(input.metadata !== undefined && { metadata: input.metadata }),
        updated_at: sql`now()`,
      })
      .where(and(eq(cart.id, cartId), isNull(cart.deleted_at)))
      .returning()

    if (!updated) {
      throw new HTTPException(404, { message: "Cart not found" })
    }

    return { cart: updated }
  },

  /** Apply a promo code to the cart. Returns discount info. */
  async applyPromo(cartId: string, code: string) {
    const db = getDb()
    await this.getById(cartId)

    // Look up the promotion
    const [promo] = await db
      .select()
      .from(promotion)
      .where(and(eq(promotion.code, code), isNull(promotion.deleted_at)))
      .limit(1)

    if (!promo) throw new HTTPException(404, { message: "优惠码不存在" })
    if (promo.status !== "active") throw new HTTPException(400, { message: "优惠码已失效" })

    // Check if already applied
    const [existing] = await db
      .select({ id: cartLineItemAdjustment.id })
      .from(cartLineItemAdjustment)
      .innerJoin(cartLineItem, eq(cartLineItemAdjustment.item_id, cartLineItem.id))
      .where(and(
        eq(cartLineItemAdjustment.code, code),
        eq(cartLineItem.cart_id, cartId),
      ))
      .limit(1)
    if (existing) throw new HTTPException(400, { message: "该优惠码已使用" })

    // Parse discount rule from metadata
    const meta = (promo.metadata ?? {}) as Record<string, any>
    const ruleType = String(meta.application_type ?? "percentage") // "percentage" | "fixed"
    const ruleValue = Number(meta.value ?? 10) // default 10% or $10

    // Apply to each line item
    const items = await db
      .select()
      .from(cartLineItem)
      .where(and(eq(cartLineItem.cart_id, cartId), isNull(cartLineItem.deleted_at)))

    let totalDiscount = 0
    for (const item of items) {
      const itemTotal = Number(item.unit_price ?? 0) * item.quantity
      let discount: number
      if (ruleType === "fixed") {
        discount = Math.min(ruleValue, itemTotal)
      } else {
        discount = Math.round(itemTotal * (ruleValue / 100))
      }
      totalDiscount += discount

      await db.insert(cartLineItemAdjustment).values({
        id: generateId("adj"),
        description: `${promo.code}: ${ruleType === "fixed" ? `-$${discount.toFixed(2)}` : `-${ruleValue}%`}`,
        code: promo.code,
        amount: String(discount),
        raw_amount: { value: String(discount), precision: 20 },
        promotion_id: promo.id,
        item_id: item.id,
      })
    }

    return {
      promotion: { id: promo.id, code: promo.code, type: promo.type },
      discount_total: totalDiscount,
    }
  },

  /** Remove a promo code from the cart. */
  async removePromo(cartId: string, code: string) {
    const db = getDb()
    // Delete adjustments linked to this code and cart
    const items = await db
      .select({ id: cartLineItem.id })
      .from(cartLineItem)
      .where(and(eq(cartLineItem.cart_id, cartId), isNull(cartLineItem.deleted_at)))
    const itemIds = items.map((i) => i.id)

    if (itemIds.length > 0) {
      await db
        .delete(cartLineItemAdjustment)
        .where(
          and(
            eq(cartLineItemAdjustment.code, code),
            inArray(cartLineItemAdjustment.item_id, itemIds),
          )
        )
    }

    return { success: true }
  },

  async completeCheckout(cartId: string) {
    const db = getDb()
    const { cart: cartData, items, shipping_methods } = await this.getById(cartId)

    if (items.length === 0) {
      throw new HTTPException(400, { message: "Cart is empty" })
    }

    if (!cartData.email) {
      throw new HTTPException(400, { message: "Cart email is required" })
    }

    const orderId = generateId("order")

    // Create order
    const [createdOrder] = await db
      .insert(order)
      .values({
        id: orderId,
        region_id: cartData.region_id,
        customer_id: cartData.customer_id,
        sales_channel_id: cartData.sales_channel_id,
        email: cartData.email,
        currency_code: cartData.currency_code,
        status: "pending",
        metadata: cartData.metadata ?? null,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .returning()

    // Create order line items + order items from cart line items
    for (const item of items) {
      const lineItemId = generateId("ordli")
      await db.insert(orderLineItem).values({
        id: lineItemId,
        title: item.title ?? "",
        subtitle: item.subtitle,
        thumbnail: item.thumbnail,
        variant_id: item.variant_id,
        product_id: item.product_id,
        product_title: item.product_title,
        product_description: item.product_description,
        product_subtitle: item.product_subtitle,
        product_type: item.product_type,
        product_type_id: item.product_type_id,
        product_collection: item.product_collection,
        product_handle: item.product_handle,
        variant_sku: item.variant_sku,
        variant_barcode: item.variant_barcode,
        variant_title: item.variant_title,
        variant_option_values: item.variant_option_values,
        requires_shipping: item.requires_shipping ?? true,
        is_giftcard: item.is_giftcard ?? false,
        is_discountable: item.is_discountable ?? true,
        is_tax_inclusive: item.is_tax_inclusive ?? false,
        unit_price: item.unit_price ?? "0",
        raw_unit_price: item.raw_unit_price ?? { value: "0", precision: 20 },
        compare_at_unit_price: item.compare_at_unit_price,
        raw_compare_at_unit_price: item.raw_compare_at_unit_price,
        is_custom_price: item.is_custom_price ?? false,
        metadata: item.metadata,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })

      const orderItemId = generateId("ordit")
      const qty = String(item.quantity)
      await db.insert(orderItem).values({
        id: orderItemId,
        version: 1,
        order_id: orderId,
        item_id: lineItemId,
        quantity: qty,
        raw_quantity: { value: qty, precision: 20 },
        unit_price: item.unit_price ?? "0",
        raw_unit_price: item.raw_unit_price ?? { value: "0", precision: 20 },
        compare_at_unit_price: item.compare_at_unit_price,
        raw_compare_at_unit_price: item.raw_compare_at_unit_price,
        fulfilled_quantity: "0",
        shipped_quantity: "0",
        delivered_quantity: "0",
        return_requested_quantity: "0",
        return_received_quantity: "0",
        return_dismissed_quantity: "0",
        written_off_quantity: "0",
        metadata: item.metadata,
      })
    }

    // Copy shipping methods
    for (const sm of shipping_methods) {
      await db.insert(orderShippingMethod).values({
        id: generateId("ordsm"),
        name: sm.name,
        description: sm.description,
        amount: sm.amount,
        raw_amount: sm.raw_amount,
        shipping_option_id: sm.shipping_option_id,
        data: sm.data,
        metadata: sm.metadata,
        is_tax_inclusive: sm.is_tax_inclusive ?? false,
        is_custom_amount: false,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
    }

    // Create payment collection
    const pcId = generateId("paycol")
    await db.insert(paymentCollection).values({
      id: pcId,
      currency_code: cartData.currency_code,
      amount: "0",
      raw_amount: { value: "0", precision: 20 },
      metadata: null,
      created_at: sql`now()`,
      updated_at: sql`now()`,
    })

    // Mark cart as completed
    await db
      .update(cart)
      .set({ completed_at: sql`now()`, updated_at: sql`now()` })
      .where(eq(cart.id, cartId))

    // Send order confirmation email (fire-and-forget)
    if (createdOrder.email) {
      sendOrderConfirmationEmail(
        createdOrder.email,
        createdOrder.display_id ?? orderId,
        orderId,
      ).catch((err) => console.error("[mail] order confirmation failed:", err))
    }

    return { order: createdOrder }
  },
}
