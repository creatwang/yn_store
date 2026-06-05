// @ts-nocheck
import { and, count, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm"
import { sqlInIds } from "../lib/sql-in-ids"
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
  UpdateProductInput,
} from "@my-store/validators"
import type {
  AdminGetProductsParamsType,
  StoreGetProductsParamsType,
} from "@my-store/validators/admin-list-params"
import { HTTPException } from "hono/http-exception"
import { attachOptionValues } from "../lib/product-option-values-batch"
import { syncVariantInventoryFromInput } from "./inventory-variant-link.service"
import {
  applyDateRangeConditions,
  applyInArrayCondition,
  listLimitOffset,
  normalizeFilterIds,
  normalizeIdFilter,
} from "../lib/query-filters"
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
  "*variants", "*sales_channels", "*categories", "*shipping_profile",
]

async function loadProductShippingProfile(db: any, productId: string) {
  const rows = await db.execute(sql`
    SELECT sp.id, sp.name, sp.type, sp.metadata, sp.created_at, sp.updated_at, sp.deleted_at
    FROM shipping_profile sp
    INNER JOIN product_shipping_profile psp ON psp.shipping_profile_id = sp.id
    WHERE psp.product_id = ${productId} AND sp.deleted_at IS NULL
    LIMIT 1
  `)
  return sqlRows(rows)[0] ?? null
}

async function setProductShippingProfile(
  db: any,
  productId: string,
  profileId: string | null,
) {
  await db.execute(sql`
    DELETE FROM product_shipping_profile WHERE product_id = ${productId}
  `)
  if (profileId) {
    await db.execute(sql`
      INSERT INTO product_shipping_profile (id, product_id, shipping_profile_id)
      VALUES (${generateId("prodsp")}, ${productId}, ${profileId})
    `)
  }
}

async function loadVariantPrices(db: any, variantIds: string[]) {
  const priceMap = new Map<string, unknown[]>()
  if (!variantIds.length) return priceMap

  const priceRows = await db.execute(sql`
    SELECT pvps.variant_id, pr.id, pr.currency_code, pr.amount, pr.rules, pr.created_at, pr.updated_at
    FROM product_variant_price_set pvps
    JOIN price_set ps ON ps.id = pvps.price_set_id
    JOIN price pr ON pr.price_set_id = ps.id
    WHERE ${sqlInIds(sql`pvps.variant_id`, variantIds)}
      AND pr.deleted_at IS NULL
  `)
  for (const row of sqlRows(priceRows) as { variant_id: string }[]) {
    const list = priceMap.get(row.variant_id) ?? []
    list.push(row)
    priceMap.set(row.variant_id, list)
  }

  return priceMap
}

/** 按 fields 列表加载关联数据（对齐 Medusa refetchEntity 语义）
 *  - 仅有负值字段（如 "-type,-variants"）→ 用默认字段，排除负值
 *  - 有正值字段（如 "*images"）→ 只看正值字段，遵循排除
 *  - 无 fields → 用默认字段
 */
function sqlRows(result: unknown): unknown[] {
  return Array.isArray(result) ? result : ((result as { rows?: unknown[] }).rows ?? [])
}

function parseFieldsParam(fields: unknown): string[] {
  if (typeof fields !== "string" || !fields.trim()) {
    return []
  }
  return fields.split(",").map((f) => f.trim())
}

function wantsVariantsInList(fields: string[]): boolean {
  if (!fields.length) {
    return false
  }
  const negated = new Set(
    fields.filter((f) => f.startsWith("-")).map((f) => f.slice(1)),
  )
  if (negated.has("variants")) {
    return false
  }
  const hasPositives = fields.some((f) => !f.startsWith("-"))
  if (!hasPositives) {
    return true
  }
  return fields.some(
    (f) =>
      f === "variants" ||
      f === "*variants" ||
      f.startsWith("variants.") ||
      f.startsWith("*variants."),
  )
}

async function attachVariantsForList(
  db: ReturnType<typeof getDb>,
  products: Record<string, unknown>[],
  fields: string[],
) {
  if (!wantsVariantsInList(fields) || !products.length) {
    return products
  }

  const productIds = products.map((p) => String(p.id))
  const variantRows = await db
    .select({
      id: productVariant.id,
      product_id: productVariant.product_id,
    })
    .from(productVariant)
    .where(
      and(
        inArray(productVariant.product_id, productIds),
        isNull(productVariant.deleted_at),
      ),
    )

  const byProduct = new Map<string, { id: string }[]>()
  for (const row of variantRows) {
    const list = byProduct.get(row.product_id) ?? []
    list.push({ id: row.id })
    byProduct.set(row.product_id, list)
  }

  return products.map((p) => ({
    ...p,
    variants: byProduct.get(String(p.id)) ?? [],
  }))
}

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
    const variants = await db.select().from(productVariant).where(
      and(eq(productVariant.product_id, id), isNull(productVariant.deleted_at)),
    )
    const wantsVariantPrices = effectiveFields.some(
      (f) => f === "*variants.prices" || f.includes("variants.prices"),
    )
    if (wantsVariantPrices && variants.length) {
      const priceMap = await loadVariantPrices(
        db,
        variants.map((v: { id: string }) => v.id),
      )
      result.variants = variants.map((v: { id: string }) => ({
        ...v,
        prices: priceMap.get(v.id) ?? [],
      }))
    } else {
      result.variants = variants
    }
  }

  if (wants("shipping_profile")) {
    result.shipping_profile = await loadProductShippingProfile(db, id)
  }

  if (wants("options")) {
    const opts = await db.select().from(productOption).where(
      and(eq(productOption.product_id, id), isNull(productOption.deleted_at))
    ).catch(() => [])

    if (wants("options.values")) {
      result.options = await attachOptionValues(db, opts).catch(() => [])
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
      result.tags = sqlRows(rows)
    } catch { result.tags = [] }
  }

  if (wants("sales_channels")) {
    try {
      const rows = await db.execute(sql`
        SELECT sc.id, sc.name, sc.description, sc.is_disabled, sc.metadata
        FROM sales_channel sc JOIN product_sales_channel psc ON psc.sales_channel_id = sc.id
        WHERE psc.product_id = ${id}
      `)
      result.sales_channels = sqlRows(rows)
    } catch { result.sales_channels = [] }
  }

  if (wants("categories")) {
    try {
      const rows = await db.execute(sql`
        SELECT pc.id, pc.name, pc.handle, pc.description, pc.mpath, pc.is_active, pc.is_internal, pc.rank, pc.parent_category_id
        FROM product_category pc JOIN product_category_product pcp ON pcp.product_category_id = pc.id
        WHERE pcp.product_id = ${id}
      `)
      result.categories = sqlRows(rows)
    } catch { result.categories = [] }
  }

  return result
}

export const productService = {
  async list(query: AdminGetProductsParamsType) {
    const db = getDb()
    const { limit, offset } = listLimitOffset(query, { limit: 50, offset: 0 })
    const conditions: any[] = [isNull(product.deleted_at)]

    if (query.status?.length) {
      conditions.push(inArray(product.status, query.status))
    }

    applyInArrayCondition(product.id, query.id, conditions)
    applyInArrayCondition(product.collection_id, query.collection_id, conditions)
    applyInArrayCondition(product.type_id, query.type_id, conditions)

    if (query.is_giftcard != null) {
      conditions.push(eq(product.is_giftcard, query.is_giftcard))
    }

    const tagIds = normalizeFilterIds(
      (query.tags as { id?: string | string[] } | undefined)?.id,
    ) ?? normalizeIdFilter(query.tag_id as string | string[] | undefined)
    if (tagIds?.length) {
      conditions.push(
        sql`exists (
          select 1 from product_tags pt
          where pt.product_id = ${product.id}
            and pt.product_tag_id in (${sql.join(tagIds.map((id) => sql`${id}`), sql`, `)})
        )`,
      )
    }

    const categoryIds = normalizeFilterIds(
      (query.categories as { id?: string | string[] } | undefined)?.id,
    ) ?? normalizeIdFilter(query.category_id as string | string[] | undefined)
    if (categoryIds?.length) {
      conditions.push(
        sql`exists (
          select 1 from product_category_product pcp
          where pcp.product_id = ${product.id}
            and pcp.product_category_id in (${sql.join(categoryIds.map((id) => sql`${id}`), sql`, `)})
        )`,
      )
    }

    const channelIds = normalizeIdFilter(query.sales_channel_id)
    if (channelIds?.length) {
      conditions.push(
        sql`exists (
          select 1 from product_sales_channel psc
          where psc.product_id = ${product.id}
            and psc.sales_channel_id in (${sql.join(channelIds.map((id) => sql`${id}`), sql`, `)})
        )`,
      )
    }

    applyDateRangeConditions(product.created_at, query.created_at, conditions, sql)
    applyDateRangeConditions(product.updated_at, query.updated_at, conditions, sql)

    if (query.q) {
      conditions.push(
        or(
          ilike(product.title, `%${query.q}%`),
          ilike(product.handle, `%${query.q}%`),
        )!,
      )
    }

    const where = and(...conditions)

    const [products, [{ total }]] = await Promise.all([
      db
        .select()
        .from(product)
        .where(where)
        .orderBy(desc(product.created_at))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(product).where(where),
    ])

    return {
      products,
      count: Number(total),
      limit,
      offset,
    }
  },

  async listStore(query: StoreGetProductsParamsType) {
    const db = getDb()
    const { limit, offset } = listLimitOffset(query, { limit: 50, offset: 0 })
    const conditions = [
      isNull(product.deleted_at),
      eq(product.status, "published"),
    ]

    applyInArrayCondition(product.id, query.id, conditions)
    applyInArrayCondition(product.collection_id, query.collection_id, conditions)

    const categoryIds = normalizeFilterIds(
      (query.categories as { id?: string | string[] } | undefined)?.id,
    ) ?? normalizeIdFilter(query.category_id as string | string[] | undefined)
    if (categoryIds?.length) {
      conditions.push(
        sql`exists (
          select 1 from product_category_product pcp
          where pcp.product_id = ${product.id}
            and pcp.product_category_id in (${sql.join(categoryIds.map((id) => sql`${id}`), sql`, `)})
        )`,
      )
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
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(product).where(where),
    ])

    // 加载每个产品的最低价（USD），通过 price_set 链
    const productIds = products.map((p) => p.id)
    const priceMap = new Map<string, number>()
    if (productIds.length > 0) {
      const priceRows = await db.execute(sql`
        SELECT pv.product_id, MIN(pr.amount)::numeric as min_price
        FROM product_variant pv
        JOIN product_variant_price_set pvps ON pvps.variant_id = pv.id
        JOIN price_set ps ON ps.id = pvps.price_set_id
        JOIN price pr ON pr.price_set_id = ps.id
        WHERE ${sqlInIds(sql`pv.product_id`, productIds)}
          AND pr.currency_code = 'usd'
          AND pv.deleted_at IS NULL
          AND pr.deleted_at IS NULL
        GROUP BY pv.product_id
      `)
      for (const row of (Array.isArray(priceRows) ? priceRows : (priceRows as any).rows ?? [])) {
        priceMap.set(row.product_id, Number(row.min_price))
      }
    }

    return {
      products: products.map((p) => ({ ...p, price: priceMap.get(p.id) ?? null })),
      count: Number(total),
      limit,
      offset,
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

    // 加载变体价格（USD），通过 price_set 链
    const variantIds = variants.map((v) => v.id)
    const priceMap = new Map<string, { amount: number; currency_code: string }>()
    if (variantIds.length > 0) {
      const priceRows = await db.execute(sql`
        SELECT pvps.variant_id, pr.amount, pr.currency_code
        FROM product_variant_price_set pvps
        JOIN price_set ps ON ps.id = pvps.price_set_id
        JOIN price pr ON pr.price_set_id = ps.id
        WHERE ${sqlInIds(sql`pvps.variant_id`, variantIds)}
          AND pr.currency_code = 'usd'
          AND pr.deleted_at IS NULL
        ORDER BY pr.amount ASC
      `)
      for (const row of (Array.isArray(priceRows) ? priceRows : (priceRows as any).rows ?? [])) {
        if (!priceMap.has(row.variant_id)) {
          priceMap.set(row.variant_id, {
            amount: Number(row.amount),
            currency_code: row.currency_code,
          })
        }
      }
    }

    return { product: { ...item, variants: variants.map((v) => ({ ...v, price: priceMap.get(v.id) ?? null })) } }
  },

  async getRealtime(idOrHandle: string) {
    const detail = idOrHandle.startsWith("prod_")
      ? await this.getById(idOrHandle, true)
      : await this.getByHandle(idOrHandle)
    const product = detail.product as {
      variants?: Array<{
        price?: { amount: number } | null
        inventory_quantity?: number | null
      }>
    }
    const variants = product.variants ?? []
    const firstPrice = variants.find((v) => v.price?.amount != null)?.price?.amount
    const stock = variants.reduce(
      (sum, v) => sum + (v.inventory_quantity ?? 0),
      0,
    )
    return {
      price: firstPrice ?? null,
      stock,
      currency: "USD",
    }
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
                  INSERT INTO product_variant_option (variant_id, option_value_id)
                  VALUES (${vid}, ${valId})
                `)
              }
            }
          }
        }
        if ((v as any).prices?.length) {
          const priceSetId = generateId("pset")
          await db.execute(sql`INSERT INTO price_set (id) VALUES (${priceSetId})`)
          await db.execute(sql`
            INSERT INTO product_variant_price_set (id, variant_id, price_set_id)
            VALUES (${generateId("pvps")}, ${vid}, ${priceSetId})
          `)
          for (const p of (v as any).prices) {
            const amount = String(p.amount)
            const rules = p.rules ? JSON.stringify(p.rules) : null
            await db.execute(sql`
              INSERT INTO price (
                id, currency_code, amount, raw_amount, price_set_id,
                created_at, updated_at, rules
              )
              VALUES (
                ${generateId("price")}, ${p.currency_code}, ${amount},
                ${JSON.stringify({ value: amount, precision: 20 })}::jsonb,
                ${priceSetId}, now(), now(), ${rules}::jsonb
              )
            `)
          }
        }
        await syncVariantInventoryFromInput(
          {
            id: vid,
            product_id: id,
            title: v.title ?? null,
            sku: v.sku ?? null,
            manage_inventory: v.manage_inventory ?? true,
            weight: v.weight ?? null,
            length: v.length ?? null,
            height: v.height ?? null,
            width: v.width ?? null,
            origin_country: v.origin_country ?? null,
            hs_code: v.hs_code ?? null,
            mid_code: v.mid_code ?? null,
            material: v.material ?? null,
            thumbnail: v.thumbnail ?? null,
          } as any,
          {
            manage_inventory: v.manage_inventory ?? true,
            inventory_items: (v as any).inventory_items,
          },
        )
      }
    }

    if (input.shipping_profile_id) {
      await setProductShippingProfile(db, id, input.shipping_profile_id)
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

    if (input.shipping_profile_id !== undefined) {
      await setProductShippingProfile(
        db,
        id,
        input.shipping_profile_id ?? null,
      )
    }

    if (input.categories !== undefined) {
      await db.execute(sql`
        DELETE FROM product_category_product WHERE product_id = ${id}
      `)
      for (const cat of input.categories) {
        await db.execute(sql`
          INSERT INTO product_category_product (product_id, product_category_id)
          VALUES (${id}, ${cat.id})
        `)
      }
    }

    if (input.sales_channels !== undefined) {
      await db.execute(sql`
        DELETE FROM product_sales_channel WHERE product_id = ${id}
      `)
      for (const sc of input.sales_channels) {
        await db.execute(sql`
          INSERT INTO product_sales_channel (id, product_id, sales_channel_id)
          VALUES (${generateId("psc")}, ${id}, ${sc.id})
        `)
      }
    }

    if (input.tags !== undefined) {
      await db.execute(sql`
        DELETE FROM product_tags WHERE product_id = ${id}
      `)
      for (const tag of input.tags) {
        await db.execute(sql`
          INSERT INTO product_tags (product_id, product_tag_id)
          VALUES (${id}, ${tag.id})
        `)
      }
    }

    return this.getById(id)
  },

  async batchLinkCategories(productId: string, input: { category_ids: string[] }) {
    const db = getDb()
    await db.execute(sql`DELETE FROM product_category_product WHERE product_id = ${productId}`)
    for (const catId of input.category_ids) {
      await db.execute(sql`INSERT INTO product_category_product (product_id, product_category_id) VALUES (${productId}, ${catId})`)
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
