import {
  sendClaimRequestedEmail,
  sendExchangeRequestedEmail,
  sendReturnRequestedEmail,
} from "./mail"
import { getOrderNotificationContext } from "./order-notification-context"
import { notificationService } from "../services/notification.service"

export async function notifyReturnRequested(
  returnId: string,
  orderId: string,
  no_notification?: boolean,
) {
  const ctx = await getOrderNotificationContext(orderId, { no_notification })
  if (!ctx) return

  await notificationService.send({
    to: ctx.email,
    template: "return.requested",
    data: {
      display_id: ctx.displayId,
      order_id: ctx.orderId,
    },
    trigger_type: "return.requested",
    resource_id: returnId,
    resource_type: "return",
    idempotency_key: `return-request-${returnId}`,
    no_notification,
    sender: () =>
      sendReturnRequestedEmail(ctx.email, ctx.displayId, ctx.orderId),
  })
}

export async function notifyClaimRequested(
  claimId: string,
  orderId: string,
  no_notification?: boolean,
) {
  const ctx = await getOrderNotificationContext(orderId, { no_notification })
  if (!ctx) return

  await notificationService.send({
    to: ctx.email,
    template: "claim.requested",
    data: {
      display_id: ctx.displayId,
      order_id: ctx.orderId,
    },
    trigger_type: "claim.requested",
    resource_id: claimId,
    resource_type: "claim",
    idempotency_key: `claim-request-${claimId}`,
    no_notification,
    sender: () =>
      sendClaimRequestedEmail(ctx.email, ctx.displayId, ctx.orderId),
  })
}

export async function notifyExchangeRequested(
  exchangeId: string,
  orderId: string,
  no_notification?: boolean,
) {
  const ctx = await getOrderNotificationContext(orderId, { no_notification })
  if (!ctx) return

  await notificationService.send({
    to: ctx.email,
    template: "exchange.requested",
    data: {
      display_id: ctx.displayId,
      order_id: ctx.orderId,
    },
    trigger_type: "exchange.requested",
    resource_id: exchangeId,
    resource_type: "exchange",
    idempotency_key: `exchange-request-${exchangeId}`,
    no_notification,
    sender: () =>
      sendExchangeRequestedEmail(ctx.email, ctx.displayId, ctx.orderId),
  })
}
