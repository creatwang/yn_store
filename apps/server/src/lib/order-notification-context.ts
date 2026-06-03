import { and, eq, isNull } from "drizzle-orm"
import { getDb, order } from "@my-store/db"

export type OrderNotificationContext = {
  email: string
  displayId: string
  orderId: string
}

/** 客户邮件上下文；订单级 no_notification 为 true 时返回 null */
export async function getOrderNotificationContext(
  orderId: string,
  options?: { no_notification?: boolean },
): Promise<OrderNotificationContext | null> {
  if (options?.no_notification === true) return null

  const db = getDb()
  const [ord] = await db
    .select({
      email: order.email,
      display_id: order.display_id,
      no_notification: order.no_notification,
    })
    .from(order)
    .where(and(eq(order.id, orderId), isNull(order.deleted_at)))
    .limit(1)

  if (!ord?.email || ord.no_notification) return null

  return {
    email: ord.email,
    displayId: String(ord.display_id ?? orderId),
    orderId,
  }
}
