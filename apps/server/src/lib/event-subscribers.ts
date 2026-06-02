/**
 * 事件订阅者 — 注册 eventBus 订阅处理跨模块联动
 * 在 app.ts / entry.ts 中调用 registerSubscribers() 加载
 *
 * 订阅者不做邮件发送（邮件在 service 层通过 notificationService 直接触发），
 * 仅负责审计日志和未来扩展点（搜索索引、Webhook 等）。
 */
import { eventBus } from "./events"

export function registerSubscribers() {
  eventBus.on("order.placed", async ({ order_id }) => {
    console.log("[event] order.placed:", order_id)
  })

  eventBus.on("order.canceled", async ({ order_id }) => {
    console.log("[event] order.canceled:", order_id)
  })

  eventBus.on("order.completed", async ({ order_id }) => {
    console.log("[event] order.completed:", order_id)
  })

  eventBus.on("fulfillment.created", async ({ fulfillment_id }) => {
    console.log("[event] fulfillment.created:", fulfillment_id)
  })

  eventBus.on("fulfillment.shipped", async ({ fulfillment_id, order_id }) => {
    console.log("[event] fulfillment.shipped:", fulfillment_id, "order:", order_id)
  })

  eventBus.on("fulfillment.canceled", async ({ fulfillment_id }) => {
    console.log("[event] fulfillment.canceled:", fulfillment_id)
  })

  eventBus.on("fulfillment.delivered", async ({ fulfillment_id, order_id }) => {
    console.log("[event] fulfillment.delivered:", fulfillment_id, "order:", order_id)
  })

  eventBus.on("return.requested", async ({ return_id, order_id }) => {
    console.log("[event] return.requested:", return_id, "order:", order_id)
  })

  eventBus.on("claim.created", async ({ claim_id, order_id }) => {
    console.log("[event] claim.created:", claim_id, "order:", order_id)
  })

  eventBus.on("exchange.created", async ({ exchange_id, order_id }) => {
    console.log("[event] exchange.created:", exchange_id, "order:", order_id)
  })
}
