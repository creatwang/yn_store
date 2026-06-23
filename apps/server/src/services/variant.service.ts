// @ts-nocheck
import { and, count, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm"
import {
  generateId,
  getDb,
  inventoryItem,
  product,
  productVariant,
  productVariantInventoryItem,
} from "@my-store/db"
import { HTTPException } from "hono/http-exception"
import { loadInventoryLevelsForItems } from "./inventory-item-detail.service"
import { syncVariantInventoryFromInput } from "./inventory-variant-link.service"

/**
 * 跨模块 Middleware：只算 inventory_quantity 数字，不返回完整 inventory_items 对象。
 * 对齐 Medusa 官方 wrapVariantsWithTotalInventoryQuantity 模式。
 *
 * @returns { [variant_id]: quantity } — 只汇总 stocked_quantity
 */
async function getVariantsInventoryQuantity(db: any, variantIds: string[]): Promise<Record<string, number>> {
  const result: Record<string, number> = {}
  if (variantIds.length === 0) return result

  // raw SQL: product_variant_inventory_item 表无 Drizzle schema 映射
  const rows = await db.execute(sql`
    SELECT pvii.variant_id, COALESCE(SUM(il.stocked_quantity), 0)::int AS quantity
    FROM product_variant_inventory_item pvii
    JOIN inventory_item ii ON ii.id = pvii.inventory_item_id AND ii.deleted_at IS NULL
    LEFT JOIN inventory_level il ON il.inventory_item_id = ii.id AND il.deleted_at IS NULL
    WHERE pvii.variant_id = ANY(ARRAY[${sql.join(variantIds.map(id => sql`${id}`), sql`, `)}])
      AND pvii.deleted_at IS NULL
    GROUP BY pvii.variant_id
  `).then((r: any) => r.rows ?? [])

  for (const row of rows) {
    result[row.variant_id] = Number(row.quantity ?? 0)
  }
  return result
}

const parseIdFilter = (id?: string | string[]) => {
  if (!id) {
    return undefined
  }

  if (Array.isArray(id)) {
    return id.filter(Boolean)
  }

  if (id.includes(",")) {
    return id.split(",").map((s) => s.trim()).filter(Boolean)
  }

  return [id]
}

export const variantService = {
  /** 对齐官方 GET /admin/product-variants（草稿/订单编辑选品） */
  async listAll(query?: {
    limit?: number
    offset?: number
    q?: string
    id?: string | string[]
    product_id?: string
    inventory_quantity?: boolean
  }) {
    const db = getDb()
    const limit = query?.limit ?? 50
    const offset = query?.offset ?? 0
    const ids = parseIdFilter(query?.id)

    const conditions = [isNull(productVariant.deleted_at)]

    if (query?.q?.trim()) {
      const term = `%${query.q.trim()}%`
      conditions.push(
        or(
          ilike(productVariant.title, term),
          ilike(productVariant.sku, term),
        )!,
      )
    }

    if (ids?.length) {
      conditions.push(inArray(productVariant.id, ids))
    }

    if (query?.product_id) {
      conditions.push(eq(productVariant.product_id, query.product_id))
    }

    const where = and(...conditions)

    const [variants, [{ total }]] = await Promise.all([
      db
        .select()
        .from(productVariant)
        .where(where)
        .orderBy(productVariant.variant_rank)
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(productVariant).where(where),
    ])

    const productIds = [...new Set(variants.map((v) => v.product_id))]
    const products =
      productIds.length > 0
        ? await db
            .select({
              id: product.id,
              title: product.title,
              thumbnail: product.thumbnail,
              status: product.status,
            })
            .from(product)
            .where(
              and(inArray(product.id, productIds), isNull(product.deleted_at)),
            )
        : []

    const productById = Object.fromEntries(products.map((p) => [p.id, p]))

    let enriched = variants.map((variant) => {
      const linked = productById[variant.product_id]
      return {
        ...variant,
        product: linked ?? {
          id: variant.product_id,
          title: variant.title,
          thumbnail: variant.thumbnail ?? null,
          status: "draft",
        },
      }
    })

    if (query?.inventory_quantity) {
      enriched = await this.withInventoryQuantity(enriched)
    }

    return {
      variants: enriched,
      count: Number(total),
      limit,
      offset,
    }
  },

  async getVariantById(variantId: string) {
    const db = getDb()
    const [item] = await db
      .select()
      .from(productVariant)
      .where(
        and(eq(productVariant.id, variantId), isNull(productVariant.deleted_at)),
      )
      .limit(1)

    if (!item) {
      throw new HTTPException(404, { message: "Variant not found" })
    }

    return item
  },

  async listVariants(
    productId: string,
    query?: { limit?: number; offset?: number; id?: string | string[] },
  ) {
    const db = getDb()
    const limit = query?.limit ?? 50
    const offset = query?.offset ?? 0
    const ids = parseIdFilter(query?.id)

    const conditions = [
      eq(productVariant.product_id, productId),
      isNull(productVariant.deleted_at),
    ]

    if (ids?.length) {
      conditions.push(inArray(productVariant.id, ids))
    }

    const where = and(...conditions)

    const [variants, [{ total }], [productRow]] = await Promise.all([
      db
        .select()
        .from(productVariant)
        .where(where)
        .orderBy(productVariant.variant_rank)
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(productVariant).where(where),
      db
        .select({ id: product.id, thumbnail: product.thumbnail })
        .from(product)
        .where(and(eq(product.id, productId), isNull(product.deleted_at)))
        .limit(1),
    ])

    const enriched = variants.map((variant) => ({
      ...variant,
      product: productRow
        ? { id: productRow.id, thumbnail: productRow.thumbnail }
        : undefined,
    }))

    return { variants: enriched, count: Number(total), limit, offset }
  },

  /**
   * 对齐 Medusa Admin 产品库存编辑：挂载 inventory_items + inventory.location_levels
   */
  async withInventoryItems(variants: any[]) {
    if (!variants.length) return variants

    const db = getDb()
    const variantIds = variants.map((v) => v.id)

    const links = await db
      .select()
      .from(productVariantInventoryItem)
      .where(
        and(
          inArray(productVariantInventoryItem.variant_id, variantIds),
          isNull(productVariantInventoryItem.deleted_at),
        ),
      )

    if (!links.length) {
      return variants.map((v) => ({ ...v, inventory_items: [] }))
    }

    const itemIds = [...new Set(links.map((l) => l.inventory_item_id))]
    const items = await db
      .select()
      .from(inventoryItem)
      .where(
        and(inArray(inventoryItem.id, itemIds), isNull(inventoryItem.deleted_at)),
      )
    const itemMap = new Map(items.map((item) => [item.id, item]))
    const levelsByItem = await loadInventoryLevelsForItems(itemIds)

    const linksByVariant = new Map<string, any[]>()
    for (const link of links) {
      const item = itemMap.get(link.inventory_item_id)
      if (!item) continue

      const entry = {
        variant_id: link.variant_id,
        inventory_item_id: link.inventory_item_id,
        required_quantity: link.required_quantity ?? 1,
        inventory: {
          ...item,
          location_levels: levelsByItem.get(link.inventory_item_id) ?? [],
        },
      }

      const existing = linksByVariant.get(link.variant_id) ?? []
      existing.push(entry)
      linksByVariant.set(link.variant_id, existing)
    }

    return variants.map((variant) => ({
      ...variant,
      inventory_items: linksByVariant.get(variant.id) ?? [],
    }))
  },

  async getVariant(productId: string, variantId: string) {
    const db = getDb()
    const [item] = await db
      .select()
      .from(productVariant)
      .where(and(
        eq(productVariant.id, variantId),
        eq(productVariant.product_id, productId),
        isNull(productVariant.deleted_at)
      ))
      .limit(1)

    if (!item) throw new HTTPException(404, { message: "Variant not found" })

    return { variant: item }
  },

  async createVariant(productId: string, input: any) {
    const db = getDb()
    const id = generateId("variant")
    const [created] = await db.insert(productVariant).values({
      id,
      product_id: productId,
      title: input.title,
      sku: input.sku ?? null,
      barcode: input.barcode ?? null,
      ean: input.ean ?? null,
      upc: input.upc ?? null,
      allow_backorder: input.allow_backorder ?? false,
      manage_inventory: input.manage_inventory ?? true,
      variant_rank: input.variant_rank ?? 0,
      thumbnail: input.thumbnail ?? null,
      metadata: input.metadata ?? null,
      created_at: sql`now()`,
      updated_at: sql`now()`,
    }).returning()

    await syncVariantInventoryFromInput(created, input)

    return { variant: created }
  },

  async updateVariant(productId: string, variantId: string, input: Record<string, any>) {
    const db = getDb()
    await this.getVariant(productId, variantId)

    const setData: Record<string, any> = { updated_at: sql`now()` }
    const validKeys = ["title", "sku", "barcode", "ean", "upc", "allow_backorder", "manage_inventory", "variant_rank", "metadata", "thumbnail"]
    for (const key of validKeys) {
      if (input[key] !== undefined) setData[key] = input[key]
    }

    const [updated] = await db.update(productVariant)
      .set(setData)
      .where(and(eq(productVariant.id, variantId), isNull(productVariant.deleted_at)))
      .returning()

    if (!updated) throw new HTTPException(404, { message: "Variant not found" })

    await syncVariantInventoryFromInput(updated, input)

    return { variant: updated }
  },

  async deleteVariant(productId: string, variantId: string) {
    const db = getDb()
    await this.getVariant(productId, variantId)

    await db.update(productVariant)
      .set({ deleted_at: sql`now()`, updated_at: sql`now()` })
      .where(eq(productVariant.id, variantId))

    return { deleted: true }
  },

  /**
   * 跨模块 Middleware：传入 variant IDs，返回 { variant_id: 总库存量 }。
   * 对齐 Medusa 官方 getTotalVariantAvailability 模式。
   */
  async getInventoryQuantity(variantIds: string[]) {
    const db = getDb()
    return getVariantsInventoryQuantity(db, variantIds)
  },

  /**
   * 批量操作变体：create + update + delete。
   * 对齐 Medusa 官方 batchProductVariantsWorkflow。
   */
  async batchVariants(productId: string, input: {
    create?: any[]
    update?: any[]
    delete?: string[]
  }) {
    const created: any[] = []
    const updated: any[] = []
    const deletedIds: string[] = []

    if (input.create?.length) {
      for (const c of input.create) {
        const r = await this.createVariant(productId, c)
        created.push(r.variant)
      }
    }
    if (input.update?.length) {
      for (const u of input.update) {
        const r = await this.updateVariant(productId, u.id, u)
        updated.push(r.variant)
      }
    }
    if (input.delete?.length) {
      for (const id of input.delete) {
        await this.deleteVariant(productId, id)
        deletedIds.push(id)
      }
    }

    return {
      created,
      updated,
      deleted: { ids: deletedIds, object: "variant", deleted: true },
    }
  },

  /**
   * 给变体列表挂载 inventory_quantity（Middleware 后处理）。
   */
  async withInventoryQuantity(variants: any[]) {
    if (!variants.length) return variants
    const variantIds = variants.map(v => v.id)
    const quantityMap = await this.getInventoryQuantity(variantIds)
    return variants.map(v => ({
      ...v,
      inventory_quantity: quantityMap[v.id] ?? 0,
    }))
  },
}
