import { and, count, desc, eq, ilike, isNull, or, sql } from "drizzle-orm"
import {
  generateId,
  getDb,
  product,
  productVariant,
} from "@my-store/db"
import type {
  CreateProductInput,
  ListProductsQuery,
  ListStoreProductsQuery,
  UpdateProductInput,
} from "@my-store/validators"
import { HTTPException } from "hono/http-exception"
import { slugify } from "../lib/slug"

export const productService = {
  async list(query: ListProductsQuery) {
    const db = getDb()
    const conditions = [isNull(product.deleted_at)]

    if (query.status) {
      conditions.push(eq(product.status, query.status))
    }

    if (query.q) {
      conditions.push(
        or(
          ilike(product.title, `%${query.q}%`),
          ilike(product.handle, `%${query.q}%`)
        )!
      )
    }

    const where = and(...conditions)

    const [products, [{ total }]] = await Promise.all([
      db
        .select()
        .from(product)
        .where(where)
        .orderBy(desc(product.created_at))
        .limit(query.limit)
        .offset(query.offset),
      db.select({ total: count() }).from(product).where(where),
    ])

    return {
      products,
      count: Number(total),
      limit: query.limit,
      offset: query.offset,
    }
  },

  async listStore(query: ListStoreProductsQuery) {
    const db = getDb()
    const conditions = [
      isNull(product.deleted_at),
      eq(product.status, "published"),
    ]

    if (query.q) {
      conditions.push(
        or(
          ilike(product.title, `%${query.q}%`),
          ilike(product.handle, `%${query.q}%`)
        )!
      )
    }

    const where = and(...conditions)

    const [products, [{ total }]] = await Promise.all([
      db
        .select({
          id: product.id,
          title: product.title,
          handle: product.handle,
          subtitle: product.subtitle,
          description: product.description,
          thumbnail: product.thumbnail,
          status: product.status,
        })
        .from(product)
        .where(where)
        .orderBy(desc(product.created_at))
        .limit(query.limit)
        .offset(query.offset),
      db.select({ total: count() }).from(product).where(where),
    ])

    return {
      products,
      count: Number(total),
      limit: query.limit,
      offset: query.offset,
    }
  },

  async getById(id: string, storeOnly = false) {
    const db = getDb()
    const conditions = [eq(product.id, id), isNull(product.deleted_at)]

    if (storeOnly) {
      conditions.push(eq(product.status, "published"))
    }

    const [item] = await db
      .select()
      .from(product)
      .where(and(...conditions))
      .limit(1)

    if (!item) {
      throw new HTTPException(404, { message: "Product not found" })
    }

    const variants = await db
      .select()
      .from(productVariant)
      .where(
        and(
          eq(productVariant.product_id, id),
          isNull(productVariant.deleted_at)
        )
      )

    return { product: { ...item, variants } }
  },

  async getByHandle(handle: string) {
    const db = getDb()
    const [item] = await db
      .select()
      .from(product)
      .where(
        and(
          eq(product.handle, handle),
          eq(product.status, "published"),
          isNull(product.deleted_at)
        )
      )
      .limit(1)

    if (!item) {
      throw new HTTPException(404, { message: "Product not found" })
    }

    const variants = await db
      .select()
      .from(productVariant)
      .where(
        and(
          eq(productVariant.product_id, item.id),
          isNull(productVariant.deleted_at)
        )
      )

    return { product: { ...item, variants } }
  },

  async create(input: CreateProductInput) {
    const db = getDb()
    const handle =
      input.handle?.trim() || slugify(input.title) || generateId("handle")

    const id = generateId("prod")

    const [created] = await db
      .insert(product)
      .values({
        id,
        title: input.title,
        handle,
        subtitle: input.subtitle ?? null,
        description: input.description ?? null,
        status: input.status ?? "draft",
        thumbnail: input.thumbnail || null,
        discountable: input.discountable ?? true,
        metadata: input.metadata ?? null,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .returning()

    return { product: created }
  },

  async update(id: string, input: UpdateProductInput) {
    const db = getDb()
    const existing = await this.getById(id)
    const handle =
      input.handle?.trim() ||
      existing.product.handle

    const [updated] = await db
      .update(product)
      .set({
        ...(input.title !== undefined && { title: input.title }),
        ...(input.handle !== undefined && { handle }),
        ...(input.subtitle !== undefined && { subtitle: input.subtitle }),
        ...(input.description !== undefined && {
          description: input.description,
        }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.thumbnail !== undefined && {
          thumbnail: input.thumbnail || null,
        }),
        ...(input.discountable !== undefined && {
          discountable: input.discountable,
        }),
        ...(input.metadata !== undefined && { metadata: input.metadata }),
        updated_at: sql`now()`,
      })
      .where(and(eq(product.id, id), isNull(product.deleted_at)))
      .returning()

    if (!updated) {
      throw new HTTPException(404, { message: "Product not found" })
    }

    return { product: updated }
  },
}
