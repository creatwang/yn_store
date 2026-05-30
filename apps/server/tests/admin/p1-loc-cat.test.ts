/**
 * P1 联调 — Locations service zone + 分类/合集关联产品
 */
import { describe, it, expect } from "vitest"
import { apiGet, apiPost, apiPostRetry } from "../setup"

describe("Locations — fulfillment set + service zone", () => {
  it("库存地点 → fulfillment set → service zone CRUD happy path", async () => {
    const locRes = await apiPostRetry("/admin/stock-locations", {
      name: `LOC_${Date.now()}`,
    })
    expect(locRes.status).toBe(201)
    const locationId = (await locRes.json()).stock_location.id as string

    const fsRes = await apiPost(`/admin/stock-locations/${locationId}/fulfillment-sets`, {
      name: `FS_${Date.now()}`,
      type: "shipping",
    })
    expect(fsRes.status).toBe(201)
    const fulfillmentSetId = (await fsRes.json()).fulfillment_set.id as string

    const zoneName = `Zone_${Date.now()}`
    const zoneRes = await apiPost(`/admin/fulfillment-sets/${fulfillmentSetId}/service-zones`, {
      name: zoneName,
      geo_zones: [{ type: "country", country_code: "us" }],
    })
    expect(zoneRes.status).toBe(201)
    const zones = (await zoneRes.json()).fulfillment_set.service_zones as { id: string; name: string }[]
    expect(zones.some((z) => z.name === zoneName)).toBe(true)
    const zoneId = zones.find((z) => z.name === zoneName)!.id

    const getRes = await apiGet(`/admin/fulfillment-sets/${fulfillmentSetId}/service-zones/${zoneId}`)
    expect(getRes.status).toBe(200)
    const zone = (await getRes.json()).service_zone
    expect(zone.name).toBe(zoneName)
    expect(zone.geo_zones?.length).toBeGreaterThanOrEqual(1)

    const updatedName = `${zoneName}_updated`
    const updRes = await apiPost(`/admin/fulfillment-sets/${fulfillmentSetId}/service-zones/${zoneId}`, {
      name: updatedName,
    })
    expect(updRes.status).toBe(200)
    expect(
      (await updRes.json()).fulfillment_set.service_zones.some((z: { name: string }) => z.name === updatedName),
    ).toBe(true)

    const locDetail = await (await apiGet(`/admin/stock-locations/${locationId}`)).json()
    expect(locDetail.stock_location?.fulfillment_sets?.length).toBeGreaterThanOrEqual(1)

    const profiles = (await (await apiGet("/admin/shipping-profiles")).json()).shipping_profiles ?? []
    let profileId = profiles[0]?.id as string | undefined
    if (!profileId) {
      const pr = await apiPost("/admin/shipping-profiles", { name: `SP_${Date.now()}`, type: "default" })
      expect(pr.status).toBe(201)
      profileId = (await pr.json()).shipping_profile.id
    }

    const types = (await (await apiGet("/admin/shipping-option-types")).json()).shipping_option_types ?? []
    let typeId = types[0]?.id as string | undefined
    if (!typeId) {
      const tr = await apiPost("/admin/shipping-option-types", {
        label: "Standard",
        code: "standard",
      })
      expect(tr.status).toBe(201)
      typeId = (await tr.json()).shipping_option_type.id
    }

    const providers = (await (await apiGet("/admin/fulfillment-providers")).json()).fulfillment_providers ?? []
    const providerId = (providers[0]?.id as string | undefined) ?? "manual_manual"

    const soRes = await apiPost("/admin/shipping-options", {
      name: `SO_${Date.now()}`,
      service_zone_id: zoneId,
      shipping_profile_id: profileId,
      type_id: typeId,
      provider_id: providerId,
      price_type: "flat",
      prices: [{ currency_code: "usd", amount: 10 }],
      rules: [
        { attribute: "is_return", operator: "eq", value: "false" },
        { attribute: "enabled_in_store", operator: "eq", value: "true" },
      ],
    })
    expect(soRes.status).toBe(201)
    const { shipping_option: so } = await soRes.json()
    expect(so.id).toMatch(/^so_/)
    expect(so.rules?.length).toBeGreaterThanOrEqual(2)
    expect(so.prices?.length).toBeGreaterThanOrEqual(1)
  })
})

describe("分类/合集 — 关联产品", () => {
  it("POST /admin/product-categories/:id/products — 产品可见分类", async () => {
    const catRes = await apiPostRetry("/admin/product-categories", {
      name: `CAT_${Date.now()}`,
    })
    expect(catRes.status).toBe(201)
    const categoryId = (await catRes.json()).product_category.id as string

    const prodRes = await apiPostRetry("/admin/products", { title: `CatProd_${Date.now()}` })
    const productId = (await prodRes.json()).product.id as string

    const linkRes = await apiPost(`/admin/product-categories/${categoryId}/products`, {
      product_ids: [productId],
    })
    expect(linkRes.status).toBe(200)

    const detail = await (await apiGet(`/admin/products/${productId}`, { fields: "*categories" })).json()
    const ids = (detail.product?.categories ?? []).map((c: { id: string }) => c.id)
    expect(ids).toContain(categoryId)
  })

  it("POST /admin/collections/:id/products — 产品 collection_id 更新", async () => {
    const colRes = await apiPostRetry("/admin/collections", {
      title: `COL_${Date.now()}`,
    })
    expect(colRes.status).toBe(201)
    const collectionId = (await colRes.json()).collection.id as string

    const prodRes = await apiPostRetry("/admin/products", { title: `ColProd_${Date.now()}` })
    const productId = (await prodRes.json()).product.id as string

    const linkRes = await apiPost(`/admin/collections/${collectionId}/products`, {
      product_ids: [productId],
    })
    expect(linkRes.status).toBe(200)

    const detail = await (await apiGet(`/admin/products/${productId}`)).json()
    expect(detail.product?.collection_id).toBe(collectionId)
  })
})
