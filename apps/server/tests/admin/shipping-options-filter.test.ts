/**
 * Shipping options — is_return / admin_only 服务端筛选 + 批量分配库存
 */
import { describe, it, expect } from "vitest"
import { apiGet, apiPost, apiPostRetry } from "../setup"

describe("Shipping options — boolean filters", () => {
  it("GET /admin/shipping-options?is_return=false 排除退货选项", async () => {
    const allRes = await apiGet("/admin/shipping-options", { limit: 200 })
    expect(allRes.status).toBe(200)
    const all = ((await allRes.json()).shipping_options ?? []) as {
      id: string
      rules?: { attribute: string; value: string }[]
    }[]

    const returnRes = await apiGet("/admin/shipping-options", {
      is_return: "true",
      limit: 200,
    })
    expect(returnRes.status).toBe(200)
    const returns = ((await returnRes.json()).shipping_options ?? []) as {
      id: string
    }[]

    const nonReturnRes = await apiGet("/admin/shipping-options", {
      is_return: "false",
      limit: 200,
    })
    expect(nonReturnRes.status).toBe(200)
    const nonReturns = ((await nonReturnRes.json()).shipping_options ?? []) as {
      id: string
    }[]

    for (const so of returns) {
      const row = all.find((a) => a.id === so.id)
      expect(
        row?.rules?.some(
          (r) => r.attribute === "is_return" && r.value === "true",
        ),
      ).toBe(true)
    }

    for (const so of nonReturns) {
      expect(returns.some((r) => r.id === so.id)).toBe(false)
    }
  })
})

describe("Reservations — bulk allocate", () => {
  it("POST /admin/reservations/batch 创建多条预留", async () => {
    const prodRes = await apiPostRetry("/admin/products", {
      title: `Alloc_${Date.now()}`,
    })
    const productId = (await prodRes.json()).product.id as string

    const orderRes = await apiPostRetry("/admin/orders", {
      email: `alloc_${Date.now()}@test.com`,
      items: [{ variant_id: productId, quantity: 1 }],
    })
    expect(orderRes.status).toBe(201)
    const order = (await orderRes.json()).order as {
      id: string
      items?: { id: string }[]
    }
    const lineItemId = order.items?.[0]?.id
    expect(lineItemId).toBeTruthy()

    const locRes = await apiPostRetry("/admin/stock-locations", {
      name: `LOC_ALLOC_${Date.now()}`,
    })
    const locationId = (await locRes.json()).stock_location.id as string

    const invRes = await apiGet("/admin/inventory-items", { limit: 5 })
    let inventoryItemId = (
      (await invRes.json()).inventory_items?.[0]?.id as string | undefined
    )
    if (!inventoryItemId) {
      const createInv = await apiPost("/admin/inventory-items", {
        sku: `SKU_${Date.now()}`,
        title: "Alloc test",
      })
      expect(createInv.status).toBe(201)
      inventoryItemId = (await createInv.json()).inventory_item.id
    }

    const batchRes = await apiPost("/admin/reservations/batch", {
      location_id: locationId,
      items: [
        {
          line_item_id: lineItemId,
          inventory_item_id: inventoryItemId,
          quantity: 1,
        },
      ],
    })
    expect(batchRes.status).toBe(201)
    const body = await batchRes.json()
    expect(body.count).toBeGreaterThanOrEqual(1)
    expect(body.reservations?.length).toBeGreaterThanOrEqual(1)
  })
})
