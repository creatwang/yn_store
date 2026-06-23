import { and, eq, inArray, isNull, sql } from "drizzle-orm"
import {
  cart,
  cartLineItem,
  cartLineItemAdjustment,
  cartShippingMethod,
  order,
  promotion,
  promotionRuleValue,
  getDb,
  generateId,
} from "@my-store/db"
import { HTTPException } from "hono/http-exception"
import type { CreateCartInput, AddToCartInput, UpdateCartInput } from "@my-store/validators"
import { sendOrderConfirmationEmail } from "../lib/mail/mail"
import { notificationService } from "./notification.service"
import { orderConfirmWorkflow } from "../workflows/order-confirm"
import { runInTransaction, type DbTx } from "../lib/infra/db/transaction"
import {
  loadPromotionRulesForType,
  selectApplicationMethodByPromotionId,
} from "./promotion-official-db"

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
    const adjustments =
      itemIds.length > 0
        ? await db
            .select()
            .from(cartLineItemAdjustment)
            .where(inArray(cartLineItemAdjustment.item_id, itemIds))
        : []

    return { cart: cartItem, items, shipping_methods: shippingMethods, adjustments }
  },

  async addItem(cartId: string, input: AddToCartInput) {
    const db = getDb()
    await this.getById(cartId)

    // 查变体价格（USD），通过 price_set 链，写入 unit_price
    let unitPrice = "0"
    if (input.variant_id) {
      const priceRows = await db.execute(sql`
        SELECT pr.amount FROM price pr
        JOIN price_set ps ON ps.id = pr.price_set_id
        JOIN product_variant_price_set pvps ON pvps.price_set_id = ps.id
        WHERE pvps.variant_id = ${input.variant_id}
          AND pr.currency_code = 'usd'
          AND pr.deleted_at IS NULL
        LIMIT 1
      `)
      const rows = Array.isArray(priceRows) ? priceRows : (priceRows as any).rows ?? []
      if (rows[0]) {
        unitPrice = String(rows[0].amount)
      }
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

  /** Apply a promo code to the cart. Uses application_method table + rule matching. */
  async applyPromo(cartId: string, code: string) {
    const db = getDb()
    const { cart: cartData, items } = await this.getById(cartId)

    // Look up the promotion
    const [promo] = await db
      .select()
      .from(promotion)
      .where(and(eq(promotion.code, code), isNull(promotion.deleted_at)))
      .limit(1)

    if (!promo) throw new HTTPException(404, { message: "优惠码不存在" })
    if (promo.status !== "active") throw new HTTPException(400, { message: "优惠码已失效" })

    // Check usage limit
    if (promo.limit != null && (promo.used ?? 0) >= promo.limit) {
      throw new HTTPException(400, { message: "优惠码已达使用上限" })
    }

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

    const appMethod = await selectApplicationMethodByPromotionId(promo.id)
    if (!appMethod?.type) {
      throw new HTTPException(400, {
        message:
          "促销未配置折扣方式，请在后台编辑促销并保存 application_method",
      })
    }

    const discountType = appMethod.type // "fixed" | "percentage"
    const discountValue = Number(appMethod.value ?? 0)
    const maxQty = appMethod.max_quantity ?? null
    const allocation = appMethod.allocation ?? "across" // "each" | "across"

    // ── Rule check: cart-level rules via promotion_promotion_rule ────
    const linkedRules = await loadPromotionRulesForType(promo.id, "rules")
    const rules = linkedRules.map((r) => ({
      id: r.id,
      attribute: r.attribute,
      operator: r.operator,
      description: r.description,
    }))

    // Check cart-level rules (region, country, customer_group, sales_channel)
    if (rules.length > 0) {
      for (const rule of rules) {
        const ruleVals = await db
          .select()
          .from(promotionRuleValue)
          .where(eq(promotionRuleValue.promotion_rule_id, rule.id))
        const vals = ruleVals.map(v => v.value)

        const matched = this._matchRule(rule.attribute, rule.operator, vals, cartData, items)
        if (!matched) {
          throw new HTTPException(400, { message: `不满足优惠条件：${rule.attribute ?? rule.description ?? ""}` })
        }
      }
    }

    // ── Apply discount ───────────────────────────────
    if (appMethod.target_type === "shipping_methods") {
      // Discount on shipping — skip for now, no shipping line-item adjustments
      return { promotion: { id: promo.id, code: promo.code, type: promo.type }, discount_total: 0 }
    }

    return runInTransaction((tx) =>
      this._applyDiscount(tx, cartId, promo, items, discountType, discountValue, maxQty, allocation),
    )
  },

  /** Internal: apply discount amount to cart line items */
  async _applyDiscount(
    db: DbTx,
    cartId: string,
    promo: typeof promotion.$inferSelect,
    items: Array<typeof cartLineItem.$inferSelect>,
    discountType: string,
    discountValue: number,
    maxQty?: number | null,
    _allocation?: string,
  ) {
    // Reload items fresh within db context if called externally — but we already have them
    const lineItems = items.length > 0 ? items : await db
      .select()
      .from(cartLineItem)
      .where(and(eq(cartLineItem.cart_id, cartId), isNull(cartLineItem.deleted_at)))

    // Filter items by target rules if buy-rules exist
    const applicableItems = lineItems

    let totalDiscount = 0
    let remainingQty = maxQty ?? Infinity

    for (const item of applicableItems) {
      if (remainingQty <= 0) break

      const itemTotal = Number(item.unit_price ?? 0) * item.quantity
      let discount: number

      if (discountType === "fixed") {
        discount = Math.min(discountValue, itemTotal)
      } else {
        discount = Math.round(itemTotal * (discountValue / 100))
      }

      // Cap by remaining allocation quantity
      if (maxQty != null) {
        const maxDiscount = Math.round(Number(item.unit_price ?? 0) * Math.min(remainingQty, item.quantity))
        discount = Math.min(discount, maxDiscount)
        remainingQty -= item.quantity
      }

      totalDiscount += discount

      await db.insert(cartLineItemAdjustment).values({
        id: generateId("adj"),
        description: `${promo.code}: ${discountType === "fixed" ? `-$${discount.toFixed(2)}` : `-${discountValue}%`}`,
        code: promo.code,
        amount: String(discount),
        raw_amount: { value: String(discount), precision: 20 },
        promotion_id: promo.id,
        item_id: item.id,
      })
    }

    // Increment promo usage
    await db.update(promotion).set({
      used: (promo.used ?? 0) + 1,
      updated_at: sql`now()`,
    }).where(eq(promotion.id, promo.id))

    return {
      promotion: { id: promo.id, code: promo.code, type: promo.type },
      discount_total: totalDiscount,
    }
  },

  /** Match a single rule against cart context */
  _matchRule(
    attribute: string,
    operator: string,
    values: string[],
    cartData: any,
    _items: any[],
  ): boolean {
    if (values.length === 0) return true

    let cartValue: string | null = null

    switch (attribute) {
      case "currency_code":
        cartValue = cartData.currency_code ?? null
        break
      case "region_id":
      case "region.id":
        cartValue = cartData.region_id ?? null
        break
      case "sales_channel_id":
        cartValue = cartData.sales_channel_id ?? null
        break
      case "customer.groups.id":
        cartValue = cartData.customer_id ?? null
        break
      // Shipping address based
      case "shipping_address.country_code":
      case "country":
        cartValue = (cartData.shipping_address as any)?.country_code ?? null
        break
      // Item-based rules — check if any item matches
      case "items.product.id":
        return _items.some(item => values.includes(item.product_id ?? ""))
      case "items.product.categories.id":
        return _items.some(item => values.includes(item as any))
      case "items.product.collection_id":
        return _items.some(item => values.includes(item.product_collection ?? ""))
      case "items.product.type_id":
        return _items.some(item => values.includes(item.product_type_id ?? ""))
      case "items.product.tags.id":
        return _items.some(item => {
          const tags = (item.metadata?.tags ?? []) as string[]
          return tags.some(t => values.includes(t))
        })
      default:
        // Unknown attribute — pass-through (don't block)
        return true
    }

    if (cartValue == null) return false

    switch (operator) {
      case "in":
        return values.includes(cartValue)
      case "eq":
        return values[0] === cartValue
      case "ne":
        return !values.includes(cartValue)
      default:
        return values.includes(cartValue)
    }
  },

  /** Remove a promo code from the cart. */
  async removePromo(cartId: string, code: string) {
    await runInTransaction(async (tx) => {
      const items = await tx
        .select({ id: cartLineItem.id })
        .from(cartLineItem)
        .where(and(eq(cartLineItem.cart_id, cartId), isNull(cartLineItem.deleted_at)))
      const itemIds = items.map((i) => i.id)

      if (itemIds.length > 0) {
        await tx
          .delete(cartLineItemAdjustment)
          .where(
            and(
              eq(cartLineItemAdjustment.code, code),
              inArray(cartLineItemAdjustment.item_id, itemIds),
            ),
          )
      }
    })

    return { success: true }
  },

  async completeCheckout(cartId: string) {
    const result = (await orderConfirmWorkflow.run({
      cartId,
    })) as { orderId: string; email?: string; displayId?: string }
    if (!result?.orderId) {
      throw new HTTPException(500, { message: "Order creation failed" })
    }
    const db = getDb();
    const [createdOrder] = await db.select().from(order).where(eq(order.id, result.orderId)).limit(1);
    if (!createdOrder) throw new HTTPException(500, { message: 'Order not found after creation' });
    if (result.email) {
      notificationService.send({
        to: result.email,
        template: 'order.confirmed',
        data: { display_id: String(result.displayId ?? result.orderId), order_id: result.orderId },
        trigger_type: 'order.placed',
        resource_id: result.orderId,
        resource_type: 'order',
        idempotency_key: `order-confirm-${result.orderId}`,
        no_notification: false,
        sender: () => sendOrderConfirmationEmail(result.email!, String(result.displayId ?? result.orderId), result.orderId),
      });
    }
    return { order: createdOrder };
  },

}
