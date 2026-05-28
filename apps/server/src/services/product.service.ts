// @ts-nocheck
import { and, count, desc, eq, ilike, isNull, or, sql } from "drizzle-orm"
import {
  generateId,
  getDb,
  product,
  productVariant,
  productOption,
  productImage,
  productCollection,
  productType,
  productTag,
  productCategory,
  salesChannel,
} from "@my-store/db"
import type {
  CreateProductInput,
  ListProductsQuery,
  ListStoreProductsQuery,
  UpdateProductInput,
} from "@my-store/validators"
import { HTTPException } from "hono/http-exception"
import { slugify } from "../lib/slug"
import { variantService } from "./variant.service"

async function fetchRelations(db: any, id: string, item: any) {
  const [rawVariants, options, images, collection, prodType, tags, categories, salesChannels] = await Promise.all([
    db.select().from(productVariant).where(
      and(eq(productVariant.product_id, id), isNull(productVariant.deleted_at))
    ),
    db.select().from(productOption).where(
      and(eq(productOption.product_id, id), isNull(productOption.deleted_at))
    ).catch(() => []),
    db.select().from(productImage).where(
      and(eq(productImage.product_id, id), isNull(productImage.deleted_at))
    ).catch(() => []),
    item.collection_id
      ? db.select().from(productCollection).where(eq(productCollection.id, item.collection_id)).then((r: any) => r[0] ?? null)
      : Promise.resolve(null),
    item.type_id
      ? db.select().from(productType).where(eq(productType.id, item.type_id)).then((r: any) => r[0] ?? null)
      : Promise.resolve(null),
    db.execute(sql`
      SELECT pt.id, pt.value, pt.metadata, pt.created_at, pt.updated_at, pt.deleted_at
      FROM product_tag pt JOIN product_tags pts ON pts.product_tag_id = pt.id
      WHERE pts.product_id = ${id}
    `).then((r: any) => r.rows ?? []),
    db.execute(sql`
      SELECT pc.id, pc.name, pc.handle, pc.description, pc.mpath, pc.is_active, pc.is_internal
      FROM product_category pc JOIN product_category_product pcp ON pcp.product_category_id = pc.id
      WHERE pcp.product_id = ${id}
    `).then((r: any) => r.rows ?? []),
    db.execute(sql`
      SELECT sc.id, sc.name, sc.description, sc.is_disabled, sc.metadata
      FROM sales_channel sc JOIN product_sales_channel psc ON psc.sales_channel_id = sc.id
      WHERE psc.product_id = ${id}
    `).then((r: any) => r.rows ?? []),
  ])

  // variants 不在此处 enrich inventory_quantity，对齐 Medusa 官方 defaultAdminProductFields
  const variants = rawVariants

  const optionsWithValues = await Promise.all(options.map(async (opt: any) => {
    const values = await db.execute(sql`
      SELECT id, value, metadata FROM product_option_value WHERE option_id = ${opt.id}
    `).then((r: any) => r.rows ?? [])
    return { ...opt, values }
  }))

  return { variants, options: optionsWithValues, images, collection, type: prodType, tags, categories, sales_channels: salesChannels }
}

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

    const relations = await fetchRelations(db, id, item)

    return { product: { ...item, ...relations } }
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
      input.handle?.trim() || `${slugify(input.title)}-${generateId("h").slice(0, 6)}`

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

    // 保存 images
    if (input.images?.length) {
      await db.insert(productImage).values(
        input.images.map((img: any) => ({
          id: generateId("img"),
          url: img.url,
          product_id: id,
          rank: img.rank ?? 0,
          created_at: sql`now()`,
          updated_at: sql`now()`,
        }))
      )
    }

    // 保存 options + option values
    if (input.options?.length) {
      for (const opt of input.options) {
        const optId = generateId("opt")
        await db.insert(productOption).values({
          id: optId,
          title: opt.title,
          product_id: id,
          created_at: sql`now()`,
          updated_at: sql`now()`,
        })
        if (opt.values?.length) {
          for (const val of opt.values) {
            await db.execute(sql`
              INSERT INTO product_option_value (id, value, option_id, created_at, updated_at)
              VALUES (${generateId("optval")}, ${val.value || val}, ${optId}, now(), now())
            `)
          }
        }
      }
    }

    // 保存 variants
    if (input.variants?.length) {
      for (const v of input.variants) {
        const vid = generateId("variant")
        await db.insert(productVariant).values({
          id: vid,
          product_id: id,
          title: v.title,
          sku: v.sku ?? null,
          manage_inventory: v.manage_inventory ?? true,
          allow_backorder: v.allow_backorder ?? false,
          variant_rank: v.variant_rank ?? 0,
          thumbnail: v.thumbnail ?? null,
          created_at: sql`now()`,
          updated_at: sql`now()`,
        })
        // raw SQL: product_variant_option 表无 Drizzle schema 映射
        for (const [_, optVal] of Object.entries(v.options || {})) {
          if (optVal) {
            await db.execute(sql`
              INSERT INTO product_variant_option (id, variant_id, option_value_id, created_at, updated_at)
              VALUES (${generateId("pvo")}, ${vid}, ${optVal}, now(), now())
            `)
          }
        }
      }
    }

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

    // 更新 images（全量替换）
    if (input.images !== undefined) {
      await db.delete(productImage).where(eq(productImage.product_id, id))
      if (input.images.length) {
        await db.insert(productImage).values(
          input.images.map((img: any) => ({
            id: generateId("img"),
            url: img.url,
            product_id: id,
            rank: img.rank ?? 0,
            created_at: sql`now()`,
            updated_at: sql`now()`,
          }))
        )
      }
    }

    return { product: updated }
  },

  async delete(id: string) {
    const db = getDb()
    await this.getById(id) // 404 if not found
    await db
      .update(product)
      .set({ deleted_at: sql`now()` })
      .where(eq(product.id, id))
    return { id, object: "product", deleted: true }
  },
}
