import { and, count, desc, eq, isNull, sql } from "drizzle-orm"
import { generateId, getDb, notification } from "@my-store/db"
import { HTTPException } from "hono/http-exception"

// ── Service ────────────────────────────────────────────────

export const notificationService = {
  /**
   * 写 DB 记录 + 异步发送。
   * 调用方提供 sender 回调，notificationService 负责：idempotency → DB pending → sender() → status sent/failed。
   */
  async send(params: {
    to: string
    channel?: string
    template: string
    data?: Record<string, unknown>
    trigger_type?: string
    resource_id?: string
    resource_type?: string
    idempotency_key?: string
    no_notification?: boolean
    sender: () => Promise<void>
  }) {
    if (params.no_notification) return null

    const db = getDb()
    const channel = params.channel ?? "email"

    // Idempotency
    if (params.idempotency_key) {
      const [dup] = await db.select({ id: notification.id }).from(notification)
        .where(eq(notification.idempotency_key, params.idempotency_key))
        .limit(1)
      if (dup) return { id: dup.id, skipped: true }
    }

    const id = generateId("noti")
    await db.insert(notification).values({
      id,
      to: params.to,
      channel,
      template: params.template,
      data: params.data ?? null,
      trigger_type: params.trigger_type ?? null,
      resource_id: params.resource_id ?? null,
      resource_type: params.resource_type ?? null,
      idempotency_key: params.idempotency_key ?? null,
      status: "pending",
      created_at: sql`now()`,
      updated_at: sql`now()`,
    })

    // Fire-and-forget send
    params.sender()
      .then(async () => {
        await db.update(notification).set({ status: "sent", updated_at: sql`now()` })
          .where(eq(notification.id, id))
      })
      .catch(async (err: any) => {
        await db.update(notification).set({
          provider_data: { error: err?.message ?? String(err) },
          updated_at: sql`now()`,
        }).where(eq(notification.id, id))
      })

    return { id, template: params.template, status: "pending" }
  },

  /** List notifications (admin CRUD) */
  async list(query: { limit?: number; offset?: number; id?: string; channel?: string } = {}) {
    const db = getDb()
    const limit = query.limit ?? 50
    const offset = query.offset ?? 0
    const conditions = [isNull(notification.deleted_at)]
    if (query.id) conditions.push(eq(notification.id, query.id))
    if (query.channel) conditions.push(eq(notification.channel, query.channel))
    const [rows, [{ total }]] = await Promise.all([
      db.select().from(notification).where(and(...conditions))
        .orderBy(desc(notification.created_at)).limit(limit).offset(offset),
      db.select({ total: count() }).from(notification).where(and(...conditions)),
    ])
    return { notifications: rows, count: Number(total), limit, offset }
  },

  /** Get single notification */
  async getById(id: string) {
    const db = getDb()
    const [item] = await db.select().from(notification)
      .where(and(eq(notification.id, id), isNull(notification.deleted_at)))
      .limit(1)
    if (!item) throw new HTTPException(404, { message: "Notification not found" })
    return { notification: item }
  },

  /** Resend a notification */
  async resend(id: string) {
    const { notification: item } = await this.getById(id)
    const newId = generateId("noti")
    const db = getDb()
    await db.insert(notification).values({
      id: newId,
      to: item.to,
      channel: item.channel ?? "email",
      template: item.template,
      data: item.data as Record<string, unknown> | null,
      trigger_type: item.trigger_type,
      resource_id: item.resource_id,
      resource_type: item.resource_type,
      original_notification_id: item.id,
      idempotency_key: null,
      status: "pending",
      created_at: sql`now()`,
      updated_at: sql`now()`,
    })
    return { notification: { id: newId, status: "pending" } }
  },
}
