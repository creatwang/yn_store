import type { notification as notificationTable } from "@my-store/db"
import {
  sendFulfillmentCreatedEmail,
  sendOrderCanceledEmail,
  sendOrderConfirmationEmail,
  sendOrderDeliveredEmail,
  sendOrderUpdatedEmail,
  sendReturnRequestedEmail,
  sendClaimRequestedEmail,
  sendExchangeRequestedEmail,
  sendShipmentEmail,
} from "./mail"
import { isFeedNotification } from "./notification-feed"

type NotificationRow = typeof notificationTable.$inferSelect

export function buildResendSender(
  item: NotificationRow,
): (() => Promise<void>) | null {
  if (isFeedNotification(item)) {
    return async () => {}
  }

  const data = (item.data ?? {}) as Record<string, unknown>
  const email = item.to
  const displayId = data.display_id as string | number | undefined
  const orderId = data.order_id as string | undefined

  if (!email || displayId == null || !orderId) return null

  switch (item.template) {
    case "order.confirmed":
      return () =>
        sendOrderConfirmationEmail(email, displayId, orderId)
    case "order.canceled":
      return () => sendOrderCanceledEmail(email, displayId, orderId)
    case "order.updated":
      return () =>
        sendOrderUpdatedEmail(
          email,
          displayId,
          orderId,
          (data.internal_note as string | null) ?? null,
        )
    case "fulfillment.created":
      return () =>
        sendFulfillmentCreatedEmail(email, displayId, orderId)
    case "fulfillment.shipped":
      return () =>
        sendShipmentEmail(
          email,
          displayId,
          orderId,
          data.tracking_numbers as string[] | undefined,
          data.tracking_urls as string[] | undefined,
        )
    case "fulfillment.delivered":
      return () => sendOrderDeliveredEmail(email, displayId, orderId)
    case "return.requested":
      return () => sendReturnRequestedEmail(email, displayId, orderId)
    case "claim.requested":
      return () => sendClaimRequestedEmail(email, displayId, orderId)
    case "exchange.requested":
      return () => sendExchangeRequestedEmail(email, displayId, orderId)
    default:
      return null
  }
}
