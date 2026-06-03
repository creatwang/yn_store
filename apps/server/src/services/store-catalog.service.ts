import { and, count, desc, eq, isNull } from "drizzle-orm"
import { getDb, product, productCollection, promotion } from "@my-store/db"
import type { StoreGetCollectionsParamsType } from "@my-store/validators/admin-list-params"
import { HTTPException } from "hono/http-exception"
import { listLimitOffset } from "../lib/query-filters"

export const storeCatalogService = {
  async listCollections(query: StoreGetCollectionsParamsType) {
    const db = getDb()
    const { limit, offset } = listLimitOffset(query, { limit: 20, offset: 0 })
    const where = isNull(productCollection.deleted_at)
    const [collections, [{ total }]] = await Promise.all([
      db
        .select()
        .from(productCollection)
        .where(where)
        .orderBy(desc(productCollection.created_at))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(productCollection).where(where),
    ])
    return {
      collections,
      count: Number(total),
      limit,
      offset,
    }
  },

  async getCollection(idOrHandle: string) {
    const db = getDb()
    const isId = idOrHandle.startsWith("pcol_")
    const [col] = await db
      .select()
      .from(productCollection)
      .where(
        and(
          isId ? eq(productCollection.id, idOrHandle) : eq(productCollection.handle, idOrHandle),
          isNull(productCollection.deleted_at),
        ),
      )
      .limit(1)

    if (!col) {
      throw new HTTPException(404, { message: "合集不存在" })
    }

    const products = await db
      .select({
        id: product.id,
        title: product.title,
        handle: product.handle,
        thumbnail: product.thumbnail,
        subtitle: product.subtitle,
      })
      .from(product)
      .where(and(eq(product.collection_id, col.id), isNull(product.deleted_at)))
      .orderBy(desc(product.created_at))
      .limit(48)

    return { collection: { ...col, products } }
  },

  async listPromotions(query: { limit: number; offset: number }) {
    const db = getDb()
    const where = and(isNull(promotion.deleted_at), eq(promotion.status, "active"))
    const [promotions, [{ total }]] = await Promise.all([
      db
        .select({
          id: promotion.id,
          code: promotion.code,
          type: promotion.type,
          is_automatic: promotion.is_automatic,
          status: promotion.status,
        })
        .from(promotion)
        .where(where)
        .orderBy(desc(promotion.created_at))
        .limit(query.limit)
        .offset(query.offset),
      db.select({ total: count() }).from(promotion).where(where),
    ])
    return {
      promotions,
      count: Number(total),
      limit: query.limit,
      offset: query.offset,
    }
  },
}
