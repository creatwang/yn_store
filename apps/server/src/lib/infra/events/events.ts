/**
 * 轻量事件总线 — 对齐 Medusa EventBus 模式
 * 用法：
 *   eventBus.emit("order.fulfillment.created", { order_id, fulfillment_id })
 */

type EventHandler = (data: any) => Promise<void> | void

class EventBus {
  private handlers = new Map<string, EventHandler[]>()

  on(event: string, handler: EventHandler) {
    const list = this.handlers.get(event) || []
    list.push(handler)
    this.handlers.set(event, list)
  }

  async emit(event: string, data: any) {
    const list = this.handlers.get(event) || []
    for (const handler of list) {
      try {
        await handler(data)
      } catch {
        // 单个 handler 失败不影响其他
      }
    }
  }

  off(event: string, handler: EventHandler) {
    const list = this.handlers.get(event) || []
    this.handlers.set(event, list.filter((h) => h !== handler))
  }
}

export const eventBus = new EventBus()
