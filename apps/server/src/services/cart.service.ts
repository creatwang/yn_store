import { and, eq, isNull, sql } from "drizzle-orm"
import { cart, cartLineItem, order, getDb, generateId } from "@my-store/db"
import { HTTPException } from "hono/http-exception"
import type { CreateCartInput, AddToCartInput, UpdateCartInput } from "@my-store/validators"

const ZERO_UNIT_PRICE = {
  unit_price: "0",
  raw_unit_price: { value: "0", precision: 20 },
} as const

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
      .where(
        and(eq(cartLineItem.cart_id, id), isNull(cartLineItem.deleted_at))
      )

    return { cart: cartItem, items }
  },

  async addItem(cartId: string, input: AddToCartInput) {
    const db = getDb()
    await this.getById(cartId)

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
        ...ZERO_UNIT_PRICE,
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

  async completeCheckout(cartId: string) {
    const db = getDb()
    const { cart: cartData, items } = await this.getById(cartId)

    if (items.length === 0) {
      throw new HTTPException(400, { message: "Cart is empty" })
    }

    const orderId = generateId("order")

    const [createdOrder] = await db
      .insert(order)
      .values({
        id: orderId,
        region_id: cartData.region_id,
        customer_id: cartData.customer_id,
        sales_channel_id: cartData.sales_channel_id,
        email: cartData.email,
        currency_code: cartData.currency_code,
        metadata: cartData.metadata,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .returning()

    await db
      .update(cart)
      .set({ completed_at: sql`now()`, updated_at: sql`now()` })
      .where(eq(cart.id, cartId))

    return { order_id: orderId, order: createdOrder }
  },
}
