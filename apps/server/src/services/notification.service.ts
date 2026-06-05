import { and, count, desc, eq, isNull, sql } from "drizzle-orm"
import { generateId, getDb, notification } from "@my-store/db"
import { HTTPException } from "hono/http-exception"
import type { FeedNotificationData } from "../lib/notification-feed"
import { buildResendSender } from "../lib/notification-resend"

const FEED_TO = "admin"

export const notificationService = {
  /**
   * 写 DB 记录 + 异步发送。
   * 调用方提供 sender 回调，notificationService 负责：idempotency → DB pending → sender() → status success/failure（Medusa v2 官方枚举）。
   */
  async send(params: {
    to: string
    channel?: string
    template: string
    data?: Record<string, unknown>
    trigger_type?: string
    resource_id?: string
    resource_type?: string
    receiver_id?: string | null
    idempotency_key?: string
    no_notification?: boolean
    sender: () => Promise<void>
  }) {
    if (params.no_notification) return null

    const db = getDb()
    const channel = params.channel ?? "email"

    if (params.idempotency_key) {
      const [dup] = await db
        .select({ id: notification.id })
        .from(notification)
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
      receiver_id: params.receiver_id ?? null,
      idempotency_key: params.idempotency_key ?? null,
      status: "pending",
      created_at: sql`now()`,
      updated_at: sql`now()`,
    })

    params
      .sender()
      .then(async () => {
        await db
          .update(notification)
          .set({ status: "sent", updated_at: sql`now()` })
          .where(eq(notification.id, id))
      })
      .catch(async (err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        await db
          .update(notification)
          .set({
            status: "failure",
            provider_data: { error: message },
            updated_at: sql`now()`,
          })
          .where(eq(notification.id, id))
      })

    return { id, template: params.template, status: "pending" }
  },

  /** Admin 铃铛 feed（无外部 sender，立即标记 sent） */
  async sendFeed(params: {
    title: string
    description?: string
    file?: FeedNotificationData["file"]
    receiver_id?: string | null
    trigger_type?: string
    resource_id?: string
    resource_type?: string
    idempotency_key?: string
  }) {
    const data: FeedNotificationData = {
      title: params.title,
      ...(params.description ? { description: params.description } : {}),
      ...(params.file ? { file: params.file } : {}),
    }

    return this.send({
      to: params.receiver_id ?? FEED_TO,
      channel: "feed",
      template: "admin.feed",
      data: data as unknown as Record<string, unknown>,
      trigger_type: params.trigger_type ?? "admin.feed",
      resource_id: params.resource_id,
      resource_type: params.resource_type,
      receiver_id: params.receiver_id,
      idempotency_key: params.idempotency_key,
      sender: async () => {},
    })
  },

  async list(
    query: {
      limit?: number
      offset?: number
      id?: string
      channel?: string
    } = {},
  ) {
    const db = getDb()
    const limit = query.limit ?? 50
    const offset = query.offset ?? 0
    const conditions = [isNull(notification.deleted_at)]
    if (query.id) conditions.push(eq(notification.id, query.id))
    if (query.channel) conditions.push(eq(notification.channel, query.channel))
    const [rows, [{ total }]] = await Promise.all([
      db
        .select()
        .from(notification)
        .where(and(...conditions))
        .orderBy(desc(notification.created_at))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(notification)
        .where(and(...conditions)),
    ])
    return { notifications: rows, count: Number(total), limit, offset }
  },

  async getById(id: string) {
    const db = getDb()
    const [item] = await db
      .select()
      .from(notification)
      .where(and(eq(notification.id, id), isNull(notification.deleted_at)))
      .limit(1)
    if (!item) {
      throw new HTTPException(404, { message: "Notification not found" })
    }
    return { notification: item }
  },

  async resend(id: string) {
    const { notification: item } = await this.getById(id)
    const sender = buildResendSender(item)
    if (!sender) {
      throw new HTTPException(400, {
        message: `Cannot resend notification template: ${item.template ?? "unknown"}`,
      })
    }

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
      receiver_id: item.receiver_id,
      original_notification_id: item.id,
      idempotency_key: null,
      status: "pending",
      created_at: sql`now()`,
      updated_at: sql`now()`,
    })

    sender()
      .then(async () => {
        await db
          .update(notification)
          .set({ status: "sent", updated_at: sql`now()` })
          .where(eq(notification.id, newId))
      })
      .catch(async (err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        await db
          .update(notification)
          .set({
            status: "failure",
            provider_data: { error: message },
            updated_at: sql`now()`,
          })
          .where(eq(notification.id, newId))
      })

    return { notification: { id: newId, status: "pending" } }
  },
}
