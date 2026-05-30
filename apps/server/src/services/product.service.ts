// @ts-nocheck
import { and, count, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm"
import {
  generateId,
  getDb,
  product,
  productVariant,
  productOption,
  productOptionValue,
  productImage,
  productCollection,
  productType,
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

/**
 * 对齐 Medusa 官方 defaultAdminProductFields
 * *前缀 = 加载完整关联对象，无* = 只返回外键
 */
const defaultAdminProductFields = [
  "id", "title", "subtitle", "status", "external_id", "description", "handle",
  "is_giftcard", "discountable", "thumbnail", "collection_id", "type_id",
  "weight", "length", "height", "width", "hs_code", "origin_country",
  "mid_code", "material", "created_at", "updated_at", "deleted_at", "metadata",
  "*type", "*collection", "*options", "*options.values", "*tags", "*images",
  "*variants", "*sales_channels", "*categories",
]

/** 按 fields 列表加载关联数据（对齐 Medusa refetchEntity 语义）
 *  - 仅有负值字段（如 "-type,-variants"）→ 用默认字段，排除负值
 *  - 有正值字段（如 "*images"）→ 只看正值字段，遵循排除
 *  - 无 fields → 用默认字段
 */
async function fetchRelations(db: any, id: string, item: any, fields: string[] = defaultAdminProductFields) {
  const hasPositives = fields.some((f) => !f.startsWith("-"))
  const effectiveFields = hasPositives ? fields : [...defaultAdminProductFields, ...fields]

  const negated = new Set(
    fields.filter((f) => f.startsWith("-")).map((f) => f.slice(1))
  )

  const wants = (name: string) => {
    if (negated.has(name)) return false
    return effectiveFields.includes(`*${name}`) || effectiveFields.includes(name)
  }

  const result: Record<string, any> = {}

  if (wants("variants")) {
    result.variants = await db.select().from(productVariant).where(
      and(eq(productVariant.product_id, id), isNull(productVariant.deleted_at))
    )
  }

  if (wants("options")) {
    const opts = await db.select().from(productOption).where(
      and(eq(productOption.product_id, id), isNull(productOption.deleted_at))
    ).catch(() => [])

    if (wants("options.values")) {
      result.options = await Promise.all(opts.map(async (opt: any) => {
        const values = await db.select().from(productOptionValue)
          .where(eq(productOptionValue.option_id, opt.id))
          .catch(() => [])
        return { ...opt, values }
      }))
    } else {
      result.options = opts
    }
  }

  if (wants("images")) {
    result.images = await db.select().from(productImage).where(
      and(eq(productImage.product_id, id), isNull(productImage.deleted_at))
    ).catch(() => [])
  }

  if (wants("collection") && item.collection_id) {
    const [col] = await db.select().from(productCollection).where(eq(productCollection.id, item.collection_id))
    result.collection = col ?? null
  }

  if (wants("type") && item.type_id) {
    const [t] = await db.select().from(productType).where(eq(productType.id, item.type_id))
    result.type = t ?? null
  }

  if (wants("tags")) {
    try {
      const rows = await db.execute(sql`
        SELECT pt.id, pt.value, pt.metadata, pt.created_at, pt.updated_at, pt.deleted_at
        FROM product_tag pt JOIN product_tags pts ON pts.product_tag_id = pt.id
        WHERE pts.product_id = ${id}
      `)
      result.tags = rows.rows ?? []
    } catch { result.tags = [] }
  }

  if (wants("sales_channels")) {
    try {
      const rows = await db.execute(sql`
        SELECT sc.id, sc.name, sc.description, sc.is_disabled, sc.metadata
        FROM sales_channel sc JOIN product_sales_channel psc ON psc.sales_channel_id = sc.id
        WHERE psc.product_id = ${id}
      `)
      result.sales_channels = rows.rows ?? []
    } catch { result.sales_channels = [] }
  }

  if (wants("categories")) {
    try {
      const rows = await db.execute(sql`
        SELECT pc.id, pc.name, pc.handle, pc.description, pc.mpath, pc.is_active, pc.is_internal, pc.rank, pc.parent_category_id
        FROM product_category pc JOIN product_category_product pcp ON pcp.product_category_id = pc.id
        WHERE pcp.product_id = ${id}
      `)
      result.categories = rows.rows ?? []
    } catch { result.categories = [] }
  }

  return result
}

export const productService = {
  async list(query: ListProductsQuery) {
    const db = getDb()
    const conditions: any[] = [isNull(product.deleted_at)]

    if (query.status) {
      if (Array.isArray(query.status)) {
        conditions.push(sql`${product.status} = ANY(${query.status}::text[])`)
      } else {
        conditions.push(eq(product.status, query.status))
      }
    }
    if (query.collection_id) conditions.push(eq(product.collection_id, query.collection_id))
    if (query.type_id) conditions.push(eq(product.type_id, query.type_id))

    if (query.created_at) {
      if (query.created_at.$gte) conditions.push(sql`${product.created_at} >= ${query.created_at.$gte}::timestamp`)
      if (query.created_at.$lte) conditions.push(sql`${product.created_at} <= ${query.created_at.$lte}::timestamp`)
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

  async getById(id: string, storeOnly = false, fields?: string[]) {
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

    const relations = await fetchRelations(db, id, item, fields)

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
        is_giftcard: input.is_giftcard ?? false,
        collection_id: input.collection_id ?? null,
        type_id: input.type_id ?? null,
        weight: input.weight ?? null,
        length: input.length ?? null,
        height: input.height ?? null,
        width: input.width ?? null,
        origin_country: input.origin_country ?? null,
        hs_code: input.hs_code ?? null,
        mid_code: input.mid_code ?? null,
        material: input.material ?? null,
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

    // 保存 categories → product_category_product 关联表
    if (input.categories?.length) {
      for (const cat of input.categories) {
        await db.execute(sql`
          INSERT INTO product_category_product (product_id, product_category_id)
          VALUES (${id}, ${cat.id})
        `)
      }
    }

    // 保存 sales_channels → product_sales_channel 关联表
    if (input.sales_channels?.length) {
      for (const sc of input.sales_channels) {
        await db.execute(sql`
          INSERT INTO product_sales_channel (id, product_id, sales_channel_id)
          VALUES (${generateId("psc")}, ${id}, ${sc.id})
        `)
      }
    }

    // 保存 tags → product_tags 关联表
    if (input.tags?.length) {
      for (const tag of input.tags) {
        await db.execute(sql`
          INSERT INTO product_tags (product_id, product_tag_id)
          VALUES (${id}, ${tag.id})
        `)
      }
    }

    // 保存 options + option values，记录映射 { optionTitle → { optionId, values: { valueStr → valueId } } }
    const optionValueMap = new Map<string, { optionId: string; values: Map<string, string> }>()
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
        const valMap = new Map<string, string>()
        if (opt.values?.length) {
          for (const val of opt.values) {
            const valId = generateId("optval")
            const valStr = typeof val === "string" ? val : (val as any).value || ""
            await db.execute(sql`
              INSERT INTO product_option_value (id, value, option_id, created_at, updated_at)
              VALUES (${valId}, ${valStr}, ${optId}, now(), now())
            `)
            valMap.set(valStr, valId)
          }
        }
        optionValueMap.set(opt.title, { optionId: optId, values: valMap })
      }
    }

    // 保存 variants + variant options + prices + inventory_items
    if (input.variants?.length) {
      for (const v of input.variants) {
        const vid = generateId("variant")
        await db.insert(productVariant).values({
          id: vid,
          product_id: id,
          title: v.title,
          sku: v.sku ?? null,
          barcode: v.barcode ?? null,
          ean: v.ean ?? null,
          upc: v.upc ?? null,
          manage_inventory: v.manage_inventory ?? true,
          allow_backorder: v.allow_backorder ?? false,
          variant_rank: v.variant_rank ?? 0,
          weight: v.weight ?? null,
          length: v.length ?? null,
          height: v.height ?? null,
          width: v.width ?? null,
          origin_country: v.origin_country ?? null,
          hs_code: v.hs_code ?? null,
          mid_code: v.mid_code ?? null,
          material: v.material ?? null,
          thumbnail: v.thumbnail ?? null,
          created_at: sql`now()`,
          updated_at: sql`now()`,
        })
        // product_variant_option: 根据 option title → value 查找正确的 option_value_id
        if (v.options && typeof v.options === "object") {
          for (const [optTitle, optVal] of Object.entries(v.options)) {
            if (optVal) {
              const optEntry = optionValueMap.get(optTitle)
              const valId = optEntry?.values.get(optVal as string)
              if (valId) {
                await db.execute(sql`
                  INSERT INTO product_variant_option (id, variant_id, option_value_id, created_at, updated_at)
                  VALUES (${generateId("pvo")}, ${vid}, ${valId}, now(), now())
                `)
              }
            }
          }
        }
        // 保存 variant prices（price 表中的 money_amount 行）
        if ((v as any).prices?.length) {
          for (const p of (v as any).prices) {
            const priceId = generateId("price")
            const rules = p.rules ? JSON.stringify(p.rules) : null
            await db.execute(sql`
              INSERT INTO price (id, currency_code, amount, variant_id, created_at, updated_at, rules)
              VALUES (${priceId}, ${p.currency_code}, ${p.amount}, ${vid}, now(), now(), ${rules}::jsonb)
            `)
          }
        }
        // 保存 inventory_items 关联
        if ((v as any).inventory_items?.length) {
          for (const inv of (v as any).inventory_items) {
            if (inv.inventory_item_id) {
              await db.execute(sql`
                INSERT INTO product_variant_inventory_item (id, variant_id, inventory_item_id, required_quantity, created_at, updated_at)
                VALUES (${generateId("pvii")}, ${vid}, ${inv.inventory_item_id}, ${inv.required_quantity ?? 1}, now(), now())
              `)
            }
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
        ...(input.description !== undefined && { description: input.description }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.thumbnail !== undefined && { thumbnail: input.thumbnail || null }),
        ...(input.discountable !== undefined && { discountable: input.discountable }),
        ...(input.is_giftcard !== undefined && { is_giftcard: input.is_giftcard }),
        ...(input.collection_id !== undefined && { collection_id: input.collection_id }),
        ...(input.type_id !== undefined && { type_id: input.type_id }),
        ...(input.weight !== undefined && { weight: input.weight }),
        ...(input.length !== undefined && { length: input.length }),
        ...(input.height !== undefined && { height: input.height }),
        ...(input.width !== undefined && { width: input.width }),
        ...(input.origin_country !== undefined && { origin_country: input.origin_country }),
        ...(input.hs_code !== undefined && { hs_code: input.hs_code }),
        ...(input.mid_code !== undefined && { mid_code: input.mid_code }),
        ...(input.material !== undefined && { material: input.material }),
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

  async batchLinkCategories(productId: string, input: { category_ids: string[] }) {
    const db = getDb()
    await db.execute(sql`DELETE FROM product_category_product WHERE product_id = ${productId}`)
    for (const catId of input.category_ids) {
      await db.execute(sql`INSERT INTO product_category_product (id, product_id, product_category_id) VALUES (${generateId("pcp")}, ${productId}, ${catId})`)
    }
    return { success: true }
  },

  async batchLinkSalesChannels(productId: string, input: { channel_ids: string[] }) {
    const db = getDb()
    await db.execute(sql`DELETE FROM product_sales_channel WHERE product_id = ${productId}`)
    for (const chId of input.channel_ids) {
      await db.execute(sql`INSERT INTO product_sales_channel (id, product_id, sales_channel_id) VALUES (${generateId("psc")}, ${productId}, ${chId})`)
    }
    return { success: true }
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
