/**
 * Workflow: fulfillment.create — Admin 发货/履约 + 物流面单
 *
 * 【库存 — 阶段 ②，仅此 workflow 触发（需 input.location_id）】
 * create-fulfillment 内调用 deductInventoryForFulfillment：
 * stocked ↓、reserved ↓、消耗 reservation_item（结账时写的预留）。
 * 无 location_id 时只更新订单行履约数量，不改 inventory_level。
 * WMS/ERP 出库同步见 lib/inventory-external-hook.ts（当前 NOOP）。
 */
import { and, eq, isNull, sql } from "drizzle-orm"
import { generateId, getDb, fulfillment, fulfillmentItem, fulfillmentLabel, order, orderItem } from "@my-store/db"
import { createWorkflow, step } from "../lib/workflow"
import { eventBus } from "../lib/events"
import { providers } from "../lib/providers"
import {
  deductInventoryForFulfillment,
  restoreInventoryDeductions,
} from "../services/inventory-reservation.service"

export const fulfillmentCreateWorkflow = createWorkflow("fulfillment-create", [
  step("validate-order", async ({ input }) => {
    const db = getDb()
    const [ord] = await db.select({ id: order.id, status: order.status, email: order.email, no_notification: order.no_notification, display_id: order.display_id }).from(order)
      .where(and(eq(order.id, input.order_id), isNull(order.deleted_at))).limit(1)
    if (!ord) throw new Error("Order not found")
    if (ord.status === "canceled" || ord.status === "archived") throw new Error(`Cannot fulfill order: ${ord.status}`)
    return { order: ord }
  }),

  step("create-fulfillment", async ({ input, output }) => {
    const db = getDb()
    const fId = generateId("ful")
    await db.insert(fulfillment).values({
      id: fId, location_id: input.location_id ?? "", created_by: "admin",
      requires_shipping: true, metadata: input.metadata ?? null,
      provider_id: null, shipping_option_id: input.shipping_option_id ?? null,
    })
    for (const item of input.items) {
      await db.insert(fulfillmentItem).values({
        id: generateId("fulitem"), title: "", sku: "", barcode: "",
        quantity: String(item.quantity), raw_quantity: { amount: item.quantity, precision: 0 },
        line_item_id: item.item_id, fulfillment_id: fId,
      })
      await db.update(orderItem).set({
        fulfilled_quantity: sql`COALESCE(fulfilled_quantity::numeric, 0) + ${item.quantity}`,
      }).where(and(eq(orderItem.item_id, item.item_id), eq(orderItem.order_id, input.order_id)))
    }
    if (input.tracking_numbers?.length) {
      for (const tn of input.tracking_numbers) {
        await db.insert(fulfillmentLabel).values({
          id: generateId("fLabel"), tracking_number: tn,
          tracking_url: input.tracking_url ?? "", label_url: "",
          fulfillment_id: fId,
        })
      }
    }
    // 阶段 ② 履约扣减：与结账无关；运营在后台点发货时才执行
    let inventoryDeductions: Awaited<
      ReturnType<typeof deductInventoryForFulfillment>
    > = []
    if (input.location_id?.trim()) {
      inventoryDeductions = await deductInventoryForFulfillment({
        location_id: input.location_id,
        items: input.items.map((i) => ({
          line_item_id: i.item_id,
          quantity: i.quantity,
        })),
      })
    }

    if (inventoryDeductions.length) {
      const prevMeta = (input.metadata ?? {}) as Record<string, unknown>
      await db
        .update(fulfillment)
        .set({
          metadata: {
            ...prevMeta,
            inventory_deductions: inventoryDeductions,
          },
        })
        .where(eq(fulfillment.id, fId))
    }

    return {
      fulfillmentId: fId,
      order: output["validate-order"]?.order,
      inventoryDeductions,
    }
  }, async ({ output }) => {
    const db = getDb()
    const created = output["create-fulfillment"] ?? {}
    const { fulfillmentId, inventoryDeductions } = created as {
      fulfillmentId?: string
      inventoryDeductions?: Awaited<
        ReturnType<typeof deductInventoryForFulfillment>
      >
    }
    if (inventoryDeductions?.length) {
      await restoreInventoryDeductions(inventoryDeductions)
    }
    if (fulfillmentId) {
      await db.delete(fulfillmentItem).where(eq(fulfillmentItem.fulfillment_id, fulfillmentId))
      await db.delete(fulfillmentLabel).where(eq(fulfillmentLabel.fulfillment_id, fulfillmentId))
      await db.delete(fulfillment).where(eq(fulfillment.id, fulfillmentId))
    }
  }),

  step("create-label", async ({ output }) => {
    const { fulfillmentId } = output["create-fulfillment"]
    const sp = providers.shipping.get("noop")!
    const label = await sp.createLabel({ fulfillment_id: fulfillmentId })
    return { tracking_number: label.tracking_number, label_url: label.label_url }
  }, async ({ output }) => {
    const db = getDb()
    const { fulfillmentId } = output["create-fulfillment"] ?? {}
    if (fulfillmentId) await db.update(fulfillment).set({ canceled_at: sql`now()` }).where(eq(fulfillment.id, fulfillmentId))
  }),

  step("finalize", async ({ output }) => {
    const { fulfillmentId, order } = output["create-fulfillment"]
    await eventBus.emit("fulfillment.created", { fulfillment_id: fulfillmentId, order_id: order?.id })
    return { fulfillmentId, email: order?.email, displayId: order?.display_id }
  }),
], { providers })
