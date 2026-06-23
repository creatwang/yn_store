import { and, asc, desc, eq, isNull, sql } from "drizzle-orm"
import {
  generateId, getDb, order, orderChange, orderChangeAction,
  orderLineItem, orderItem, orderSummary,
} from "@my-store/db"
import { HTTPException } from "hono/http-exception"
import { eventBus } from "../lib/infra/events/events"
import { runInTransaction } from "../lib/infra/db/transaction"
import { notificationService } from "./notification.service"
import { sendOrderUpdatedEmail } from "../lib/mail/mail"
import { loadActionsGroupedByChangeId } from "../lib/order/order-change-actions-batch"
import { buildAdminOrderPreview } from "./order/admin-order-preview"
import { variantService } from "./variant.service"

// ── helpers ─────────────────────────────────────────────────

function moneyRaw(amount: number) {
  return { amount, precision: 2 }
}

async function variantSnapshotForItemAdd(variantId: string) {
  let title = "Item"
  let productId: string | null = null
  let variantSku: string | null = null
  let variantTitle: string | null = null
  let thumbnail: string | null = null

  try {
    const variant = await variantService.getVariantById(variantId)
    title = variant.title?.trim() || title
    productId = variant.product_id ?? null
    variantSku = variant.sku ?? null
    variantTitle = variant.title ?? null
    thumbnail = variant.thumbnail ?? null
  } catch {
    /* variant 可能已删，仍写入 variant_id */
  }

  return { title, productId, variantSku, variantTitle, thumbnail }
}

function resolveItemUnitPrice(
  action: typeof orderChangeAction.$inferSelect,
  details: Record<string, unknown>,
) {
  if (action.amount != null && action.amount !== "") {
    return Number(action.amount)
  }
  if (details.unit_price != null && Number.isFinite(Number(details.unit_price))) {
    return Number(details.unit_price)
  }
  return 0
}

function findAction(editId: string, actionId: string) {
  const db = getDb()
  return db.select().from(orderChangeAction)
    .where(and(
      eq(orderChangeAction.id, actionId),
      eq(orderChangeAction.order_change_id, editId),
    ))
    .limit(1)
    .then(r => r[0] ?? null)
}

/** Fetch all actions for a change, ordered */
async function listActions(changeId: string) {
  const db = getDb()
  return db.select().from(orderChangeAction)
    .where(eq(orderChangeAction.order_change_id, changeId))
    .orderBy(asc(orderChangeAction.ordering), asc(orderChangeAction.created_at))
}

/** Load an order change with its actions */
async function loadEdit(id: string) {
  const db = getDb()
  const [edit] = await db.select().from(orderChange)
    .where(and(eq(orderChange.id, id), eq(orderChange.change_type, "edit")))
    .limit(1)
  if (!edit) throw new HTTPException(404, { message: "Order edit not found" })
  const actions = await listActions(id)
  return { edit, actions, order_change: { ...edit, actions }, order_edit: { ...edit, actions } }
}

// ── service ─────────────────────────────────────────────────

export const orderEditService = {
  /** List all edits for an order */
  async list(orderId: string) {
    const db = getDb()
    const edits = await db.select().from(orderChange)
      .where(and(eq(orderChange.order_id, orderId), eq(orderChange.change_type, "edit")))
      .orderBy(desc(orderChange.created_at))

    const actionsByEdit = await loadActionsGroupedByChangeId(
      db,
      edits.map((e) => e.id),
    )
    const result = edits.map((edit) => ({
      ...edit,
      actions: actionsByEdit.get(edit.id) ?? [],
    }))
    return { order_edits: result }
  },

  /** Get a single edit with actions */
  async getById(id: string) {
    const { order_change } = await loadEdit(id)
    return { order_edit: order_change }
  },

  /** Begin a new order edit */
  async create(orderId: string) {
    const db = getDb()
    const [ord] = await db.select().from(order)
      .where(and(eq(order.id, orderId), isNull(order.deleted_at)))
      .limit(1)
    if (!ord) throw new HTTPException(404, { message: "Order not found" })

    const newVersion = (ord.version ?? 1) + 1
    const changeId = generateId("ordch")
    const [created] = await db.insert(orderChange).values({
      id: changeId, order_id: orderId, version: newVersion,
      change_type: "edit", status: "pending", created_by: "admin",
    }).returning()

    return { order_edit: { ...created, actions: [] } }
  },

  // ── Item actions ──────────────────────────────────────────

  /** Add new items to an order edit */
  async addItems(editId: string, items: Array<{ variant_id: string; quantity: number; unit_price?: number }>) {
    const db = getDb()
    const { edit } = await loadEdit(editId)

    const nextOrdering = await db.select().from(orderChangeAction)
      .where(eq(orderChangeAction.order_change_id, editId))
      .then(rows => rows.length)

    const created: any[] = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const actionId = generateId("ordchact")
      const amount = item.unit_price ? String(item.unit_price) : null

      await db.insert(orderChangeAction).values({
        id: actionId,
        order_id: edit.order_id,
        order_change_id: editId,
        ordering: nextOrdering + i,
        version: edit.version,
        action: "ITEM_ADD",
        reference: "product_variant",
        reference_id: item.variant_id,
        details: { quantity: item.quantity, unit_price: item.unit_price },
        amount,
        raw_amount: amount ? { value: amount, precision: 20 } : null,
        created_at: sql`now()`, updated_at: sql`now()`,
      })
      created.push({ id: actionId, action: "ITEM_ADD", reference_id: item.variant_id })
    }

    return buildAdminOrderPreview(edit.order_id)
  },

  /** Update an original item's quantity/price (creates ITEM_UPDATE action) */
  async updateOriginalItem(editId: string, itemId: string, payload: { quantity?: number; unit_price?: number }) {
    const db = getDb()
    const { edit } = await loadEdit(editId)

    // Look for existing ITEM_UPDATE action for this item
    const [existing] = await db.select().from(orderChangeAction)
      .where(and(
        eq(orderChangeAction.order_change_id, editId),
        eq(orderChangeAction.action, "ITEM_UPDATE"),
        eq(orderChangeAction.reference_id, itemId),
      ))
      .limit(1)

    if (existing) {
      const details = { ...(existing.details as Record<string, unknown> ?? {}), ...payload }
      const amount = payload.unit_price ? String(payload.unit_price) : null
      await db.update(orderChangeAction).set({
        details,
        ...(amount ? { amount, raw_amount: { value: amount, precision: 20 } } : {}),
        updated_at: sql`now()`,
      }).where(eq(orderChangeAction.id, existing.id))
    } else {
      const nextOrdering = await db.select().from(orderChangeAction)
        .where(eq(orderChangeAction.order_change_id, editId))
        .then(rows => rows.length)
      const amount = payload.unit_price ? String(payload.unit_price) : null
      await db.insert(orderChangeAction).values({
        id: generateId("ordchact"),
        order_id: edit.order_id,
        order_change_id: editId,
        ordering: nextOrdering,
        version: edit.version,
        action: "ITEM_UPDATE",
        reference: "order_item",
        reference_id: itemId,
        details: payload,
        amount,
        raw_amount: amount ? { value: amount, precision: 20 } : null,
        created_at: sql`now()`, updated_at: sql`now()`,
      })
    }

    return loadEdit(editId).then(r => ({ order_edit: r.order_change }))
  },

  /** Update a previously added item (ITEM_UPDATE on the action itself) */
  async updateAddedItem(editId: string, actionId: string, payload: { quantity?: number }) {
    const db = getDb()
    const action = await findAction(editId, actionId)
    if (!action) throw new HTTPException(404, { message: "Action not found" })

    const details = { ...(action.details as Record<string, unknown> ?? {}), ...payload }
    await db.update(orderChangeAction).set({
      details, updated_at: sql`now()`,
    }).where(eq(orderChangeAction.id, actionId))

    return loadEdit(editId).then(r => ({ order_edit: r.order_change }))
  },

  /** Remove an added item (deletes the ITEM_ADD action) */
  async removeAddedItem(editId: string, actionId: string) {
    const db = getDb()
    const action = await findAction(editId, actionId)
    if (!action) throw new HTTPException(404, { message: "Action not found" })

    await db.delete(orderChangeAction).where(eq(orderChangeAction.id, actionId))
    return loadEdit(editId).then(r => ({ order_edit: r.order_change }))
  },

  // ── Shipping method actions ───────────────────────────────

  async addShippingMethod(editId: string, data: { shipping_option_id: string; amount?: number; name?: string }) {
    const db = getDb()
    const { edit } = await loadEdit(editId)

    const nextOrdering = await db.select().from(orderChangeAction)
      .where(eq(orderChangeAction.order_change_id, editId))
      .then(rows => rows.length)

    const amount = data.amount ? String(data.amount) : null
    await db.insert(orderChangeAction).values({
      id: generateId("ordchact"),
      order_id: edit.order_id,
      order_change_id: editId,
      ordering: nextOrdering,
      version: edit.version,
      action: "SHIPPING_ADD",
      reference: "shipping_option",
      reference_id: data.shipping_option_id,
      details: { name: data.name, amount: data.amount },
      amount,
      raw_amount: amount ? { value: amount, precision: 20 } : null,
      created_at: sql`now()`, updated_at: sql`now()`,
    })

    return loadEdit(editId).then(r => ({ order_edit: r.order_change }))
  },

  async updateShippingMethod(editId: string, actionId: string, data: Record<string, unknown>) {
    const db = getDb()
    const action = await findAction(editId, actionId)
    if (!action) throw new HTTPException(404, { message: "Shipping action not found" })

    const details = { ...(action.details as Record<string, unknown> ?? {}), ...data }
    const amount = data.amount ? String(data.amount) : undefined
    await db.update(orderChangeAction).set({
      details,
      ...(amount ? { amount, raw_amount: { value: amount, precision: 20 } } : {}),
      updated_at: sql`now()`,
    }).where(eq(orderChangeAction.id, actionId))

    return loadEdit(editId).then(r => ({ order_edit: r.order_change }))
  },

  async removeShippingMethod(editId: string, actionId: string) {
    const db = getDb()
    const action = await findAction(editId, actionId)
    if (!action) throw new HTTPException(404, { message: "Shipping action not found" })

    await db.delete(orderChangeAction).where(eq(orderChangeAction.id, actionId))
    return loadEdit(editId).then(r => ({ order_edit: r.order_change }))
  },

  // ── Lifecycle ─────────────────────────────────────────────

  /** Request confirmation of the edit */
  async request(
    editId: string,
    input?: { internal_note?: string; send_notification?: boolean },
  ) {
    const db = getDb()
    const [existing] = await db
      .select()
      .from(orderChange)
      .where(and(eq(orderChange.id, editId), isNull(orderChange.canceled_at)))
      .limit(1)
    if (!existing) {
      throw new HTTPException(404, { message: "Order edit not found" })
    }

    const meta = {
      ...(((existing.metadata as Record<string, unknown>) ?? {})),
    }
    if (input?.send_notification != null) {
      meta.send_notification = input.send_notification
    }

    const [updated] = await db
      .update(orderChange)
      .set({
        status: "requested",
        internal_note: input?.internal_note ?? existing.internal_note,
        requested_at: sql`now()`,
        requested_by: "admin",
        metadata: meta,
      })
      .where(eq(orderChange.id, editId))
      .returning()
    if (!updated) {
      throw new HTTPException(404, { message: "Order edit not found" })
    }
    await eventBus.emit("order-edit.requested", {
      order_edit_id: editId,
      order_id: updated.order_id,
    })
    return loadEdit(editId).then((r) => ({ order_edit: r.order_change }))
  },

  /** Confirm & apply all pending actions（对齐官方 confirmOrderEditRequestWorkflow） */
  async confirm(editId: string) {
    const db = getDb()
    const { edit, actions } = await loadEdit(editId)
    if (actions.length === 0) {
      throw new HTTPException(400, { message: "No changes to confirm" })
    }
    if (edit.confirmed_at) {
      throw new HTTPException(400, { message: "Order edit already confirmed" })
    }

    const [ord] = await db
      .select({ version: order.version })
      .from(order)
      .where(eq(order.id, edit.order_id))
      .limit(1)
    if (!ord) {
      throw new HTTPException(404, { message: "Order not found" })
    }

    const currentOrderVersion = ord.version ?? 1
    const targetOrderVersion = edit.version

    const variantSnapshots = new Map<string, Awaited<ReturnType<typeof variantSnapshotForItemAdd>>>()
    for (const action of actions) {
      if (action.action !== "ITEM_ADD" || action.reference === "order_line_item") {
        continue
      }
      const variantId = action.reference_id
      if (!variantId || variantSnapshots.has(variantId)) continue
      variantSnapshots.set(variantId, await variantSnapshotForItemAdd(variantId))
    }

    await runInTransaction(async (tx) => {
      for (const action of actions) {
        switch (action.action) {
          case "ITEM_ADD": {
            if (action.reference === "order_line_item") {
              break
            }
            const variantId = action.reference_id
            if (!variantId) break

            const details = (action.details ?? {}) as Record<string, unknown>
            const qty = Number(details.quantity ?? 1)
            const unitPrice = resolveItemUnitPrice(action, details)
            const snap = variantSnapshots.get(variantId) ?? {
              title: "Item",
              productId: null,
              variantSku: null,
              variantTitle: null,
              thumbnail: null,
            }
            const lineItemId = generateId("olitm")
            const orderItemId = generateId("orditm")
            const rawUnit = moneyRaw(unitPrice)

            await tx.insert(orderLineItem).values({
              id: lineItemId,
              title: snap.title,
              variant_id: variantId,
              product_id: snap.productId,
              variant_sku: snap.variantSku,
              variant_title: snap.variantTitle,
              thumbnail: snap.thumbnail,
              requires_shipping: true,
              is_giftcard: false,
              is_discountable: true,
              is_tax_inclusive: false,
              is_custom_price: unitPrice > 0 && details.unit_price != null,
              unit_price: String(unitPrice),
              raw_unit_price: rawUnit,
            })
            await tx.insert(orderItem).values({
              id: orderItemId,
              version: targetOrderVersion,
              order_id: edit.order_id,
              item_id: lineItemId,
              quantity: String(qty),
              raw_quantity: moneyRaw(qty),
              unit_price: String(unitPrice),
              raw_unit_price: rawUnit,
              fulfilled_quantity: "0",
              shipped_quantity: "0",
              delivered_quantity: "0",
              return_requested_quantity: "0",
              return_received_quantity: "0",
              return_dismissed_quantity: "0",
              written_off_quantity: "0",
            })
            break
          }
          case "ITEM_UPDATE": {
            const details = (action.details ?? {}) as Record<string, unknown>
            const setData: Record<string, unknown> = {}
            if (details.quantity != null) {
              const q = Number(details.quantity)
              setData.quantity = String(q)
              setData.raw_quantity = moneyRaw(q)
            }
            if (action.amount != null) {
              const p = Number(action.amount)
              setData.unit_price = String(p)
              setData.raw_unit_price = moneyRaw(p)
            }
            await tx
              .update(orderItem)
              .set(setData)
              .where(
                and(
                  eq(orderItem.order_id, edit.order_id),
                  eq(orderItem.item_id, action.reference_id!),
                  eq(orderItem.version, currentOrderVersion),
                ),
              )
            break
          }
          default:
            break
        }
      }
      await tx
        .update(orderChange)
        .set({
          status: "confirmed",
          confirmed_at: sql`now()`,
          confirmed_by: "admin",
        })
        .where(eq(orderChange.id, editId))
      await tx
        .update(order)
        .set({ version: targetOrderVersion, updated_at: sql`now()` })
        .where(eq(order.id, edit.order_id))
      const [summary] = await tx
        .select()
        .from(orderSummary)
        .where(eq(orderSummary.order_id, edit.order_id))
        .limit(1)
      if (summary) {
        await tx
          .update(orderSummary)
          .set({
            version: targetOrderVersion,
            totals: {
              ...((summary.totals as Record<string, unknown>) ?? {}),
              version: targetOrderVersion,
            },
          })
          .where(eq(orderSummary.id, summary.id))
      }
    })

    await eventBus.emit("order-edit.confirmed", {
      order_edit_id: editId,
      order_id: edit.order_id,
    })

    const meta = (edit.metadata as Record<string, unknown>) ?? {}
    if (meta.send_notification === true) {
      const db = getDb()
      const [ord] = await db
        .select({ email: order.email, display_id: order.display_id })
        .from(order)
        .where(eq(order.id, edit.order_id))
        .limit(1)
      if (ord?.email) {
        const displayId = String(ord.display_id ?? edit.order_id)
        notificationService.send({
          to: ord.email,
          template: "order.updated",
          data: {
            display_id: displayId,
            order_id: edit.order_id,
            internal_note: edit.internal_note,
          },
          trigger_type: "order-edit.confirmed",
          resource_id: editId,
          resource_type: "order_change",
          idempotency_key: `order-edit-confirm-${editId}`,
          sender: () =>
            sendOrderUpdatedEmail(
              ord.email!,
              displayId,
              edit.order_id,
              edit.internal_note,
            ),
        })
      }
    }

    return buildAdminOrderPreview(edit.order_id)
  },

  /** Cancel the edit and revert all pending actions */
  async cancel(editId: string) {
    const { edit, actions } = await loadEdit(editId)

    await runInTransaction(async (tx) => {
      await tx
        .delete(orderChangeAction)
        .where(eq(orderChangeAction.order_change_id, editId))

      await tx
        .update(orderChange)
        .set({
          status: "canceled",
          canceled_at: sql`now()`,
          canceled_by: "admin",
        })
        .where(eq(orderChange.id, editId))
    })

    if (actions.length > 0) {
      await eventBus.emit("order-edit.canceled", {
        order_edit_id: editId,
        order_id: edit.order_id,
      })
    }

    const db = getDb()
    const [updated] = await db
      .select()
      .from(orderChange)
      .where(eq(orderChange.id, editId))
      .limit(1)

    if (!updated) throw new HTTPException(404, { message: "Order edit not found" })
    return { order_edit: { ...updated, actions: [] } }
  },

  // ── Internal helpers (kept for backward compat) ──────────
  async _getMeta(editId: string) {
    return loadEdit(editId)
  },

  async _saveMeta(_editId: string, _meta: Record<string, unknown>) {
    return this.getById(_editId)
  },
}
