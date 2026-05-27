import { and, count, desc, eq, isNull, sql } from "drizzle-orm"
import {
  generateId,
  getDb,
  cart,
  cartLineItem,
  product,
  productVariant,
} from "@my-store/db"
import type {
  CreateCartInput,
  UpdateCartInput,
  CreateCartLineItemInput,
  UpdateCartLineItemInput,
} from "@my-store/validators"
import { HTTPException } from "hono/http-exception"

export const cartService = {
  async getById(id: string) {
    const db = getDb()
    const [item] = await db
      .select()
      .from(cart)
      .where(and(eq(cart.id, id), isNull(cart.deleted_at)))
      .limit(1)

    if (!item) {
      throw new HTTPException(404, { message: "Cart not found" })
    }

    const lineItems = await db
      .select()
      .from(cartLineItem)
      .where(
        and(
          eq(cartLineItem.cart_id, id),
          isNull(cartLineItem.deleted_at)
        )
      )

    return { cart: { ...item, items: lineItems } }
  },

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

    return { cart: { ...created, items: [] } }
  },

  async update(id: string, input: UpdateCartInput) {
    const db = getDb()
    await this.getById(id)

    const [updated] = await db
      .update(cart)
      .set({
        ...(input.region_id !== undefined && { region_id: input.region_id }),
        ...(input.customer_id !== undefined && { customer_id: input.customer_id }),
        ...(input.sales_channel_id !== undefined && { sales_channel_id: input.sales_channel_id }),
        ...(input.email !== undefined && { email: input.email }),
        ...(input.currency_code !== undefined && { currency_code: input.currency_code }),
        ...(input.metadata !== undefined && { metadata: input.metadata }),
        updated_at: sql`now()`,
      })
      .where(and(eq(cart.id, id), isNull(cart.deleted_at)))
      .returning()

    if (!updated) {
      throw new HTTPException(404, { message: "Cart not found" })
    }

    return this.getById(id)
  },

  async addLineItem(cartId: string, input: CreateCartLineItemInput) {
    const db = getDb()
    await this.getById(cartId)

    let productInfo = null
    let variantInfo = null

    if (input.product_id) {
      const [p] = await db
        .select()
        .from(product)
        .where(and(eq(product.id, input.product_id), isNull(product.deleted_at)))
        .limit(1)
      productInfo = p
    }

    if (input.variant_id) {
      const [v] = await db
        .select()
        .from(productVariant)
        .where(and(eq(productVariant.id, input.variant_id), isNull(productVariant.deleted_at)))
        .limit(1)
      variantInfo = v
    }

    if (!productInfo && !variantInfo) {
      throw new HTTPException(404, { message: "Product or variant not found" })
    }

    const id = generateId("cali")
    const title = variantInfo?.title || productInfo?.title || "Item"

    const [created] = await db
      .insert(cartLineItem)
      .values({
        id,
        cart_id: cartId,
        title,
        quantity: input.quantity,
        variant_id: input.variant_id ?? null,
        product_id: input.product_id ?? null,
        product_title: productInfo?.title ?? null,
        product_description: productInfo?.description ?? null,
        product_subtitle: productInfo?.subtitle ?? null,
        variant_title: variantInfo?.title ?? null,
        variant_sku: variantInfo?.sku ?? null,
        metadata: input.metadata ?? null,
        unit_price: sql`0`,
        raw_unit_price: sql`'{"value":"0","precision":2}'::jsonb`,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .returning()

    return this.getById(cartId)
  },

  async updateLineItem(cartId: string, lineItemId: string, input: UpdateCartLineItemInput) {
    const db = getDb()
    await this.getById(cartId)

    const [updated] = await db
      .update(cartLineItem)
      .set({
        ...(input.quantity !== undefined && { quantity: input.quantity }),
        ...(input.metadata !== undefined && { metadata: input.metadata }),
        updated_at: sql`now()`,
      })
      .where(and(eq(cartLineItem.id, lineItemId), eq(cartLineItem.cart_id, cartId), isNull(cartLineItem.deleted_at)))
      .returning()

    if (!updated) {
      throw new HTTPException(404, { message: "Line item not found" })
    }

    return this.getById(cartId)
  },

  async removeLineItem(cartId: string, lineItemId: string) {
    const db = getDb()
    await this.getById(cartId)

    await db
      .update(cartLineItem)
      .set({
        deleted_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .where(and(eq(cartLineItem.id, lineItemId), eq(cartLineItem.cart_id, cartId), isNull(cartLineItem.deleted_at)))

    return this.getById(cartId)
  },

  async complete(cartId: string) {
    const db = getDb()
    const cartData = await this.getById(cartId)

    await db
      .update(cart)
      .set({
        completed_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .where(and(eq(cart.id, cartId), isNull(cart.deleted_at)))

    return cartData
  },
}
