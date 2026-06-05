/**
 * 结账预留 + 履约扣减库存 — 对齐 Medusa 两阶段库存
 */
import { describe, it, expect } from "vitest"
import { apiGet, apiPost, apiPostRetry, storePost } from "../setup"

async function setupVariantWithStock(stockedQty: number) {
  const sku = `INV_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  const locRes = await apiPostRetry("/admin/stock-locations", {
    name: `INV_LOC_${sku}`,
  })
  const locationId = (await locRes.json()).stock_location.id as string

  const prodRes = await apiPostRetry("/admin/products", {
    title: `InvCheckout_${sku}`,
  })
  const productId = (await prodRes.json()).product.id as string

  const variantRes = await apiPost(`/admin/products/${productId}/variants`, {
    title: "Default",
    sku,
    manage_inventory: true,
  })
  expect(variantRes.status).toBe(201)
  const variantId = (await variantRes.json()).variant.id as string

  const invRes = await apiGet("/admin/inventory-items", { sku })
  const inventoryItemId = (
    (await invRes.json()).inventory_items as { id: string }[]
  )[0].id

  const levelRes = await apiPost(
    `/admin/inventory-items/${inventoryItemId}/location-levels/batch`,
    {
      create: [{ location_id: locationId, stocked_quantity: stockedQty }],
      update: [],
      delete: [],
    },
  )
  expect(levelRes.status).toBe(200)

  return { variantId, inventoryItemId, locationId, sku }
}

async function getLevelAtLocation(
  inventoryItemId: string,
  locationId: string,
) {
  const res = await apiGet(
    `/admin/inventory-items/${inventoryItemId}/location-levels`,
  )
  const levels = (await res.json()).inventory_levels as {
    location_id: string
    stocked_quantity: number
    reserved_quantity: number
  }[]
  return levels.find((l) => l.location_id === locationId)
}

describe("结账库存预留与履约扣减", () => {
  it("结账后 reserved_quantity 增加、stocked 不变", { timeout: 120_000 }, async () => {
    const { variantId, inventoryItemId, locationId } =
      await setupVariantWithStock(10)

    const before = await getLevelAtLocation(inventoryItemId, locationId)
    expect(before?.stocked_quantity).toBe(10)
    expect(before?.reserved_quantity ?? 0).toBe(0)

    const cartRes = await storePost("/store/carts", {
      currency_code: "USD",
      email: `inv_${Date.now()}@test.com`,
    })
    const cartId = (await cartRes.json()).cart.id as string
    await storePost(`/store/carts/${cartId}/line-items`, {
      variant_id: variantId,
      quantity: 2,
    })

    const completeRes = await storePost(`/store/carts/${cartId}/complete`)
    expect(completeRes.status).toBe(200)

    const after = await getLevelAtLocation(inventoryItemId, locationId)
    expect(after?.stocked_quantity).toBe(10)
    expect(after?.reserved_quantity).toBe(2)
  })

  it("履约后 stocked 与 reserved 同步减少", { timeout: 120_000 }, async () => {
    const { variantId, inventoryItemId, locationId } =
      await setupVariantWithStock(10)

    const cartRes = await storePost("/store/carts", {
      currency_code: "USD",
      email: `ful_${Date.now()}@test.com`,
    })
    const cartId = (await cartRes.json()).cart.id as string
    await storePost(`/store/carts/${cartId}/line-items`, {
      variant_id: variantId,
      quantity: 3,
    })
    const completeRes = await storePost(`/store/carts/${cartId}/complete`)
    expect(completeRes.status).toBe(200)
    const orderId = (await completeRes.json()).order.id as string

    const orderRes = await apiGet(`/admin/orders/${orderId}`)
    const lineItemId = (await orderRes.json()).order.items[0].id as string

    const fulfillRes = await apiPost(`/admin/orders/${orderId}/fulfillments`, {
      order_id: orderId,
      location_id: locationId,
      items: [{ item_id: lineItemId, quantity: 3 }],
    })
    expect(fulfillRes.status).toBe(201)

    const after = await getLevelAtLocation(inventoryItemId, locationId)
    expect(after?.stocked_quantity).toBe(7)
    expect(after?.reserved_quantity).toBe(0)
  })

  it("库存不足时结账失败", { timeout: 120_000 }, async () => {
    const { variantId } = await setupVariantWithStock(5)

    const cartRes = await storePost("/store/carts", {
      currency_code: "USD",
      email: `oos_${Date.now()}@test.com`,
    })
    const cartId = (await cartRes.json()).cart.id as string
    await storePost(`/store/carts/${cartId}/line-items`, {
      variant_id: variantId,
      quantity: 100,
    })

    const completeRes = await storePost(`/store/carts/${cartId}/complete`)
    expect(completeRes.status).toBe(400)
  })
})
