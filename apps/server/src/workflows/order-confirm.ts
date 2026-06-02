/** Workflow: order.confirm — 下单（cart → order + 支付授权） */
import { eq, isNull, sql } from "drizzle-orm"
import { generateId, getDb, cart, cartAddress, cartLineItem, cartShippingMethod, order, orderAddress, orderItem, orderLineItem, orderShippingMethod, paymentCollection } from "@my-store/db"
import { createWorkflow, step } from "../lib/workflow"
import { eventBus } from "../lib/events"
import { providers } from "../lib/providers"

type Input = { cartId: string }

export const orderConfirmWorkflow = createWorkflow("order-confirm", [
  step("validate-and-load-cart", async ({ input }) => {
    const db = getDb()
    const [cartData] = await db.select().from(cart).where(
      eq(cart.id, input.cartId),
    ).limit(1)
    if (!cartData) throw new Error("Cart not found")
    if (!cartData.email) throw new Error("Cart email is required")

    const items = await db.select().from(cartLineItem).where(
      eq(cartLineItem.cart_id, input.cartId),
    )
    const shipping = await db.select().from(cartShippingMethod).where(
      eq(cartShippingMethod.cart_id, input.cartId),
    )
    if (items.length === 0) throw new Error("Cart is empty")

    return { cartData, items, shipping }
  }),

  step("migrate-addresses", async ({ input, output }) => {
    const db = getDb()
    const { cartData } = output["validate-and-load-cart"]
    const addrs = await db.select().from(cartAddress).where(
      eq(cartAddress.id, input.cartId),
    )

    let shipping: string | null = null
    let billing: string | null = null
    for (const a of addrs) {
      const aid = generateId("ordaddr")
      await db.insert(orderAddress).values({
        id: aid, customer_id: cartData.customer_id,
        company: a.company, first_name: a.first_name, last_name: a.last_name,
        address_1: a.address_1, address_2: a.address_2, city: a.city,
        country_code: a.country_code, province: a.province,
        postal_code: a.postal_code, phone: a.phone,
        metadata: a.metadata as Record<string, unknown> | null,
      })
      if (!shipping) shipping = aid; else billing = aid
    }
    return { shippingAddressId: shipping, billingAddressId: billing }
  }, async ({ input, output }) => {
    const db = getDb()
    const { shippingAddressId, billingAddressId } = output["migrate-addresses"] ?? {}
    if (shippingAddressId) await db.delete(orderAddress).where(eq(orderAddress.id, shippingAddressId))
    if (billingAddressId) await db.delete(orderAddress).where(eq(orderAddress.id, billingAddressId))
  }),

  step("create-order", async ({ input, output }) => {
    const db = getDb()
    const { cartData, items, shipping } = output["validate-and-load-cart"]
    const { shippingAddressId, billingAddressId } = output["migrate-addresses"]
    const orderId = generateId("order")

    const [created] = await db.insert(order).values({
      id: orderId, region_id: cartData.region_id, customer_id: cartData.customer_id,
      sales_channel_id: cartData.sales_channel_id, email: cartData.email,
      currency_code: cartData.currency_code, shipping_address_id: shippingAddressId,
      billing_address_id: billingAddressId, status: "pending",
      metadata: cartData.metadata ?? null, created_at: sql`now()`, updated_at: sql`now()`,
    }).returning()

    for (const item of items) {
      const liId = generateId("ordli")
      await db.insert(orderLineItem).values({
        id: liId, title: item.title ?? "", variant_id: item.variant_id,
        product_id: item.product_id, unit_price: item.unit_price ?? "0",
        raw_unit_price: item.raw_unit_price ?? { value: "0", precision: 20 },
        requires_shipping: item.requires_shipping ?? true,
      })
      const q = String(item.quantity)
      await db.insert(orderItem).values({
        id: generateId("ordit"), version: 1, order_id: orderId, item_id: liId,
        quantity: q, raw_quantity: { value: q, precision: 20 },
        unit_price: item.unit_price ?? "0",
        raw_unit_price: item.raw_unit_price ?? { value: "0", precision: 20 },
        fulfilled_quantity: "0", shipped_quantity: "0", delivered_quantity: "0",
        return_requested_quantity: "0", return_received_quantity: "0",
        return_dismissed_quantity: "0", written_off_quantity: "0",
      })
    }

    for (const s of shipping) {
      await db.insert(orderShippingMethod).values({
        id: generateId("ordsm"), name: s.name, amount: s.amount,
        raw_amount: s.raw_amount, shipping_option_id: s.shipping_option_id,
        data: s.data, metadata: s.metadata,
      })
    }

    await db.insert(paymentCollection).values({
      id: generateId("paycol"), currency_code: cartData.currency_code ?? "usd",
      amount: "0", raw_amount: { value: "0", precision: 20 },
      metadata: null, created_at: sql`now()`, updated_at: sql`now()`,
    })

    return { orderId, email: cartData.email, displayId: created.display_id ?? orderId }
  }, async ({ output }) => {
    const db = getDb()
    const { orderId } = output["create-order"] ?? {}
    if (orderId) await db.update(order).set({ deleted_at: sql`now()` }).where(eq(order.id, orderId))
  }),

  step("authorize-payment", async ({ output }) => {
    const { orderId } = output["create-order"]
    const paymentProvider = providers.payment.get("noop")!
    const result = await paymentProvider.authorize({ payment_id: orderId, amount: 0, currency: "usd" })
    return { transactionId: result.transaction_id }
  }, async ({ output }) => {
    const db = getDb()
    const { orderId } = output["create-order"] ?? {}
    if (orderId) {
      await db.delete(order).where(eq(order.id, orderId))
    }
  }),

  step("finalize", async ({ input, output }) => {
    const db = getDb()
    await db.update(cart).set({ completed_at: sql`now()`, updated_at: sql`now()` }).where(eq(cart.id, input.cartId))
    const { orderId } = output["create-order"]
    const { email, displayId } = output["create-order"]
    await eventBus.emit("order.placed", { order_id: orderId })
    return { orderId, email, displayId }
  }),
], { providers })
