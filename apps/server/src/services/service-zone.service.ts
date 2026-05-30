import { and, eq } from "drizzle-orm"
import { generateId, getDb, serviceZone, geoZone, fulfillmentSet } from "@my-store/db"
import { HTTPException } from "hono/http-exception"

export const serviceZoneService = {
  async retrieve(fulfillmentSetId: string, zoneId: string) {
    const db = getDb()
    const [zone] = await db
      .select()
      .from(serviceZone)
      .where(and(eq(serviceZone.id, zoneId), eq(serviceZone.fulfillment_set_id, fulfillmentSetId)))
      .limit(1)
    if (!zone) throw new HTTPException(404, { message: "未找到服务区域" })

    const zones = await db.select().from(geoZone).where(eq(geoZone.service_zone_id, zoneId))
    return { service_zone: { ...zone, geo_zones: zones } }
  },

  async create(fulfillmentSetId: string, body: { name: string; geo_zones?: Record<string, unknown>[]; metadata?: Record<string, unknown> }) {
    const db = getDb()
    const [fs] = await db.select().from(fulfillmentSet).where(eq(fulfillmentSet.id, fulfillmentSetId)).limit(1)
    if (!fs) throw new HTTPException(404, { message: "未找到 fulfillment set" })

    const id = generateId("serzo")
    await db.insert(serviceZone).values({
      id,
      name: body.name,
      fulfillment_set_id: fulfillmentSetId,
      metadata: body.metadata ?? null,
    })

    for (const gz of body.geo_zones ?? []) {
      await db.insert(geoZone).values({
        id: generateId("geozo"),
        type: (gz.type as string) ?? "country",
        country_code: (gz.country_code as string) ?? "us",
        province_code: (gz.province_code as string) ?? null,
        city: (gz.city as string) ?? null,
        postal_expression: gz.postal_expression ?? null,
        metadata: gz.metadata ?? null,
        service_zone_id: id,
      })
    }

    const [updated] = await db.select().from(fulfillmentSet).where(eq(fulfillmentSet.id, fulfillmentSetId)).limit(1)
    const zones = await db.select().from(serviceZone).where(eq(serviceZone.fulfillment_set_id, fulfillmentSetId))
    return { fulfillment_set: { ...updated, service_zones: zones } }
  },

  async update(fulfillmentSetId: string, zoneId: string, body: { name?: string; metadata?: Record<string, unknown> }) {
    const db = getDb()
    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.metadata !== undefined) updateData.metadata = body.metadata

    const [updated] = await db
      .update(serviceZone)
      .set(updateData)
      .where(and(eq(serviceZone.id, zoneId), eq(serviceZone.fulfillment_set_id, fulfillmentSetId)))
      .returning()
    if (!updated) throw new HTTPException(404, { message: "未找到服务区域" })

    const [fs] = await db.select().from(fulfillmentSet).where(eq(fulfillmentSet.id, fulfillmentSetId)).limit(1)
    const zones = await db.select().from(serviceZone).where(eq(serviceZone.fulfillment_set_id, fulfillmentSetId))
    return { fulfillment_set: { ...fs, service_zones: zones } }
  },

  async delete(fulfillmentSetId: string, zoneId: string) {
    const db = getDb()
    await db.delete(geoZone).where(eq(geoZone.service_zone_id, zoneId))
    const [deleted] = await db
      .delete(serviceZone)
      .where(and(eq(serviceZone.id, zoneId), eq(serviceZone.fulfillment_set_id, fulfillmentSetId)))
      .returning({ id: serviceZone.id })
    if (!deleted) throw new HTTPException(404, { message: "未找到服务区域" })
    return { id: deleted.id, object: "service_zone", deleted: true }
  },
}
