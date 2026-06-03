/**
 * Medusa JS-SDK compatible shim — translates sdk.admin.* calls to Hono RPC.
 *
 * 方法签名对齐 @medusajs/js-sdk v2.15.3（见 demo/dashboard/node_modules/@medusajs/js-sdk/dist/）
 * 所有方法均忽略 headers 参数（由 api.ts 的 getAuthHeaders 自动注入）
 */
import { api, toRpcQuery, parseJsonResponse, getAuthHeaders } from "./api"

const baseUrl = import.meta.env.VITE_API_URL || ""

async function rpcGet(rpc: any, params?: Record<string, any>, query?: Record<string, any>) {
  const res = await rpc.$get({ param: params, query: toRpcQuery(query ?? {}) })
  return parseJsonResponse(res)
}

async function rpcPost(rpc: any, body?: any, params?: Record<string, any>, query?: Record<string, any>) {
  const res = await rpc.$post({ param: params, json: body ?? {}, query: toRpcQuery(query ?? {}) })
  return parseJsonResponse(res)
}

async function rpcDelete(rpc: any, params?: Record<string, any>) {
  const res = await rpc.$delete({ param: params })
  return parseJsonResponse(res)
}

/** /admin/{entity} 基础 CRUD */
function entityClient(entity: string) {
  const rpc = (api as any).admin[entity]
  return {
    list: (query?: Record<string, any>) => rpcGet(rpc, undefined, query),
    retrieve: (id: string, query?: Record<string, any>) => rpcGet(rpc[":id"], { id }, query),
    create: (body?: any, query?: Record<string, any>) => rpcPost(rpc, body, undefined, query),
    update: (id: string, body?: any, query?: Record<string, any>) => rpcPost(rpc[":id"], body, { id }, query),
    delete: (id: string) => rpcDelete(rpc[":id"], { id }),
  }
}

/** product 的 variants / options / images 子路由 */
function productEntity() {
  const rpc = (api as any).admin.products
  const base = entityClient("products")

  return {
    ...base,
    // ── Variants ──────────────────────────────────────────────
    listVariants: (productId: string, query?: Record<string, any>) =>
      rpcGet(rpc[":productId"].variants, { productId }, query),
    retrieveVariant: (productId: string, variantId: string, query?: Record<string, any>) =>
      rpcGet(rpc[":productId"].variants[":variantId"], { productId, variantId }, query),
    createVariant: (productId: string, body?: any, query?: Record<string, any>) =>
      rpcPost(rpc[":productId"].variants, body, { productId }, query),
    updateVariant: (productId: string, variantId: string, body?: any, query?: Record<string, any>) =>
      rpcPost(rpc[":productId"].variants[":variantId"], body, { productId, variantId }, query),
    deleteVariant: (productId: string, variantId: string) =>
      rpcDelete(rpc[":productId"].variants[":variantId"], { productId, variantId }),
    batchVariants: (productId: string, body?: any, query?: Record<string, any>) =>
      rpcPost(rpc[":productId"].variants.batch, body, { productId }, query),

    // ── Options ────────────────────────────────────────────────
    listOptions: (productId: string, query?: Record<string, any>) =>
      rpcGet(rpc[":productId"].options, { productId }, query),
    retrieveOption: (productId: string, optionId: string, query?: Record<string, any>) =>
      rpcGet(rpc[":productId"].options[":optionId"], { productId, optionId }, query),
    createOption: (productId: string, body?: any, query?: Record<string, any>) =>
      rpcPost(rpc[":productId"].options, body, { productId }, query),
    updateOption: (productId: string, optionId: string, body?: any, query?: Record<string, any>) =>
      rpcPost(rpc[":productId"].options[":optionId"], body, { productId, optionId }, query),
    deleteOption: (productId: string, optionId: string) =>
      rpcDelete(rpc[":productId"].options[":optionId"], { productId, optionId }),

    // ── Images ────────────────────────────────────────────────
    listImages: (productId: string) =>
      rpcGet(rpc[":productId"].images, { productId }),
    createImage: (productId: string, body?: any) =>
      rpcPost(rpc[":productId"].images, body, { productId }),
    deleteImage: (productId: string, imageId: string) =>
      rpcDelete(rpc[":productId"].images[":imageId"], { productId, imageId }),

    // 对齐官方 batchImageVariantsWorkflow: POST /admin/products/:id/images/:imageId/variants/batch
    batchImageVariants: (productId: string, imageId: string, body?: any) =>
      rpcPost(rpc[":productId"].images[":imageId"].variants.batch, body, { productId, imageId }),

    // 对齐官方 batchVariantImagesWorkflow: POST /admin/products/:id/variants/:variantId/images/batch
    batchVariantImages: (productId: string, variantId: string, body?: any) =>
      rpcPost(rpc[":productId"].variants[":variantId"].images.batch, body, { productId, variantId }),
    batchVariantInventoryItems: async (productId: string, variantId: string, body?: any) => {
      const res = await (api as any).admin.products[":productId"].variants[":variantId"]["inventory-items"].batch.$post({ param: { productId, variantId }, json: body })
      return parseJsonResponse(res)
    },

    // ── Import / Export ──────────────────────────────────────
    export: async (query?: any) => {
      const res = await (api as any).admin.products.export.$post({ json: query ?? {} })
      return parseJsonResponse(res)
    },
    createImport: async (body?: { file?: File }) => {
      const baseUrl = import.meta.env.VITE_API_URL || ""
      const form = new FormData()
      if (body?.file) form.append("file", body.file)
      const res = await fetch(`${baseUrl}/api/admin/products/import`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: form,
      })
      return parseJsonResponse(res)
    },
    confirmImport: async (transactionId: string, body?: any) => {
      const res = await (api as any).admin.products.import[":transactionId"].confirm.$post({
        param: { transactionId },
        json: body,
      })
      return parseJsonResponse(res)
    },
    import: async (body?: any) => {
      const res = await (api as any).admin.products.import.$post({ json: body })
      return parseJsonResponse(res)
    },
  }
}

/** order 客户端（含子路由方法） */
function ordersClient() {
  const rpc = (api as any).admin.orders
  const paymentsRpc = (api as any).admin.payments
  return {
    list: (query?: Record<string, any>) => rpcGet(rpc, undefined, query),
    retrieve: (id: string, query?: Record<string, any>) => rpcGet(rpc[":id"], { id }, query),
    create: (body?: any) => rpcPost(rpc, body),
    update: (id: string, body?: any) => rpcPost(rpc[":id"], body, { id }),
    addNote: (id: string, body: { value: string }) =>
      rpcPost(rpc[":id"].notes, body, { id }),
    cancel: (id: string) => rpcPost(rpc[":id"].cancel, undefined, { id }),
    archive: (id: string) => rpcPost(rpc[":id"].archive, undefined, { id }),
    complete: (id: string) => rpcPost(rpc[":id"].complete, undefined, { id }),
    // ── Fulfillments ────────────────────────────────────────
    createFulfillment: (orderId: string, body?: any) => rpcPost(rpc[":id"].fulfillments, body, { id: orderId }),
    cancelFulfillment: (orderId: string, fulfillmentId: string, body?: any) =>
      rpcPost(rpc[":id"].fulfillments[":fulfillmentId"].cancel, body, { id: orderId, fulfillmentId }),
    createShipment: (orderId: string, fulfillmentId: string, body?: any) =>
      rpcPost(rpc[":id"].fulfillments[":fulfillmentId"].shipments, body, { id: orderId, fulfillmentId }),
    listFulfillments: (orderId: string) => rpcGet(rpc[":id"].fulfillments, { id: orderId }),
    markAsDelivered: (orderId: string, fulfillmentId: string, body?: any) =>
      rpcPost(rpc[":id"].fulfillments[":fulfillmentId"]["mark-as-delivered"], body, { id: orderId, fulfillmentId }),
    retrieveFulfillment: (orderId: string, fulfillmentId: string) =>
      rpcGet(rpc[":id"].fulfillments[":fulfillmentId"], { id: orderId, fulfillmentId }),
    // ── Changes / Preview / Credit Lines / Transfer ─────────
    listChanges: (id: string, query?: Record<string, any>) => rpcGet(rpc[":id"].changes, { id }, query),
    retrievePreview: (id: string) => rpcGet(rpc[":id"].preview, { id }),
    createCreditLine: (orderId: string, body?: any) => rpcPost(rpc[":id"]["credit-lines"], body, { id: orderId }),
    requestTransfer: (orderId: string, body?: any) => rpcPost(rpc[":id"].transfer, body, { id: orderId }),
    cancelTransfer: (orderId: string) => rpcPost(rpc[":id"].transfer.cancel, undefined, { id: orderId }),
    // ── Line Items / Shipping Options ─────────────────────
    listLineItems: (id: string) => rpcGet(rpc[":id"]["line-items"], { id }),
    listShippingOptions: (id: string) => rpcGet(rpc[":id"]["shipping-options"], { id }),
    // ── Payments (delegate to payments client) ──────────────
    capturePayment: (id: string, body?: any) => rpcPost(paymentsRpc[":id"].capture, body, { id }),
    refundPayment: (id: string, body?: any) => rpcPost(paymentsRpc[":id"].refund, body, { id }),
    listPayments: (query?: Record<string, any>) => rpcGet(paymentsRpc, undefined, query),
    retrievePayment: (id: string) => rpcGet(paymentsRpc[":id"], { id }),
    createClaim: (body?: any) => claimClient().create(body),
    createExchange: (body?: any) => exchangeClient().create(body),
    delete: (id: string) => rpcDelete(rpc[":id"], { id }),
    listTransactions: (id: string) => rpcGet(rpc[":id"].transactions, { id }),
    addItems: (id: string, body?: any) => rpcPost(rpc[":id"]["line-items"], body, { id }),
    updateItem: (id: string, itemId: string, body?: any) => rpcPost(rpc[":id"]["line-items"][":itemId"], body, { id, itemId }),
    removeItem: (id: string, itemId: string) => rpcDelete(rpc[":id"]["line-items"][":itemId"], { id, itemId }),
    addShippingMethod: (id: string, body?: any) => rpcPost(rpc[":id"]["shipping-options"], body, { id }),
    removeShippingMethod: (id: string, methodId: string) => rpcDelete(rpc[":id"]["shipping-options"][":methodId"], { id, methodId }),
    retrieveShippingOption: async (orderId: string, optionId: string) => {
      const res = await (api as any).admin.orders[":id"]["shipping-options"].$get({ param: { id: orderId } })
      const data = await parseJsonResponse<any>(res)
      const option = (data.shipping_options ?? []).find((o: any) => o.id === optionId)
      return { shipping_option: option ?? null }
    },
    requestItemReturn: (id: string, body?: any) => returnClient().receive(id, body),
    listReturns: (query?: any) => returnClient().list(query),
    retrieveReturn: (id: string) => returnClient().retrieve(id),
    initiateReturn: (body?: any) => returnClient().initiate(body),
    cancelReturn: (id: string) => returnClient().cancel(id),
    receiveReturn: (id: string, body?: any) => returnClient().receive(id, body),
    listDraftOrders: (query?: any) => draftOrderClient().list(query),
    retrieveDraftOrder: (id: string) => draftOrderClient().retrieve(id),
    createDraftOrder: (body?: any) => draftOrderClient().create(body),
    updateDraftOrder: (id: string, body?: any) => draftOrderClient().update(id, body),
    deleteDraftOrder: (id: string) => draftOrderClient().delete(id),
    updateOrderChange: (changeId: string, body?: any) => orderEditClient().update(changeId, body),
    export: (query?: any) => rpcPost(rpc.export, undefined, query),
    createFulfillmentSet: async (locationId: string, body?: any) => {
      const res = await (api as any).admin["stock-locations"][":id"]["fulfillment-sets"].$post({
        param: { id: locationId },
        json: body,
      })
      return parseJsonResponse(res)
    },
    deleteFulfillmentSet: async (_locationId: string, setId: string) => {
      const res = await (api as any).admin["fulfillment-sets"][":id"].$delete({ param: { id: setId } })
      return parseJsonResponse(res)
    },
    createShippingOption: (body?: any) => rpcPost((api as any).admin["shipping-options"], body),
    updateShippingOption: (id: string, body?: any) =>
      rpcPost((api as any).admin["shipping-options"][":id"], body, { id }),
    deleteShippingOption: (id: string) =>
      rpcDelete((api as any).admin["shipping-options"][":id"], { id }),
  }
}

function paymentsClient() {
  const rpc = (api as any).admin.payments
  return {
    list: (query?: Record<string, any>) => rpcGet(rpc, undefined, query),
    retrieve: (id: string) => rpcGet(rpc[":id"], { id }),
    capture: (id: string, body?: any) => rpcPost(rpc[":id"].capture, body, { id }),
    refund: (id: string, body?: any) => rpcPost(rpc[":id"].refund, body, { id }),
  }
}

/** returns 客户端 */
function returnClient() {
  const rpc = (api as any).admin.returns
  return {
    list: (query?: Record<string, any>) => rpcGet(rpc, undefined, query),
    retrieve: (id: string, query?: Record<string, any>) => rpcGet(rpc[":id"], { id }, query),
    initiate: (body?: any) => rpcPost(rpc, body),
    initiateRequest: (body?: any) => rpcPost(rpc, body),
    cancel: (id: string) => rpcPost(rpc[":id"].cancel, undefined, { id }),
    receive: (id: string, body?: any) => rpcPost(rpc[":id"]["receive/confirm"], body, { id }),
    request: (id: string, body?: any) => rpcPost(rpc[":id"].request, body, { id }),
    dismiss: (id: string, body?: any) => rpcPost(rpc[":id"]["receive-items"], body, { id }),
    cancelRequest: (id: string) => rpcPost(rpc[":id"].request.cancel, undefined, { id }),
    addReturnItem: (id: string, body?: any) => rpcPost(rpc[":id"]["request-items"], body, { id }),
    updateReturnItem: (id: string, actionId: string, body?: any) =>
      rpcPost(rpc[":id"]["request-items"][":actionId"], body, { id, actionId }),
    removeReturnItem: (id: string, actionId: string) =>
      rpcDelete(rpc[":id"]["request-items"][":actionId"], { id, actionId }),
    addReturnShipping: (id: string, body?: any) =>
      rpcPost(rpc[":id"]["shipping-method"], body, { id }),
    updateReturnShipping: (id: string, actionId: string, body?: any) =>
      rpcPost(rpc[":id"]["shipping-method"][":actionId"], body, { id, actionId }),
    deleteReturnShipping: (id: string, actionId: string) =>
      rpcDelete(rpc[":id"]["shipping-method"][":actionId"], { id, actionId }),
    updateRequest: (id: string, body?: any) => rpcPost(rpc[":id"], body, { id }),
    confirmRequest: (id: string, body?: any) => rpcPost(rpc[":id"].request, body, { id }),
    initiateReceive: (id: string, body?: any) => rpcPost(rpc[":id"].receive, body, { id }),
    receiveItems: (id: string, body?: any) => rpcPost(rpc[":id"]["receive-items"], body, { id }),
    updateReceiveItem: (id: string, actionId: string, body?: any) =>
      rpcPost(rpc[":id"]["receive-items"][":actionId"], body, { id, actionId }),
    removeReceiveItem: (id: string, actionId: string) =>
      rpcDelete(rpc[":id"]["receive-items"][":actionId"], { id, actionId }),
    dismissItems: (id: string, body?: any) => rpcPost(rpc[":id"]["receive-items"], body, { id }),
    updateDismissItem: (id: string, actionId: string, body?: any) =>
      rpcPost(rpc[":id"]["receive-items"][":actionId"], body, { id, actionId }),
    removeDismissItem: (id: string, actionId: string) =>
      rpcDelete(rpc[":id"]["receive-items"][":actionId"], { id, actionId }),
    confirmReceive: (id: string, body?: any) => rpcPost(rpc[":id"]["receive/confirm"], body, { id }),
    cancelReceive: (id: string) => rpcPost(rpc[":id"].receive.cancel, undefined, { id }),
  }
}

/** claims 客户端 — 对齐 exchange inbound/outbound 命名 */
function claimClient() {
  const rpc = (api as any).admin.claims
  return {
    list: (query?: Record<string, any>) => rpcGet(rpc, undefined, query),
    retrieve: (id: string, query?: Record<string, any>) => rpcGet(rpc[":id"], { id }, query),
    create: (body?: any) => rpcPost(rpc, body),
    cancel: (id: string) => rpcPost(rpc[":id"].cancel, undefined, { id }),
    update: (id: string, body?: any) => rpcPost(rpc[":id"], body, { id }),
    delete: (id: string) => rpcPost(rpc[":id"].cancel, undefined, { id }),
    // inbound
    addInboundItems: (id: string, body?: any) => rpcPost(rpc[":id"].inbound.items, body, { id }),
    updateInboundItem: (id: string, actionId: string, body?: any) =>
      rpcPost(rpc[":id"].inbound.items[":actionId"], body, { id, actionId }),
    removeInboundItem: (id: string, actionId: string) =>
      rpcDelete(rpc[":id"].inbound.items[":actionId"], { id, actionId }),
    addInboundShipping: (id: string, body?: any) =>
      rpcPost(rpc[":id"].inbound["shipping-method"], body, { id }),
    updateInboundShipping: (id: string, actionId: string, body?: any) =>
      rpcPost(rpc[":id"].inbound["shipping-method"][":actionId"], body, { id, actionId }),
    deleteInboundShipping: (id: string, actionId: string) =>
      rpcDelete(rpc[":id"].inbound["shipping-method"][":actionId"], { id, actionId }),
    // outbound
    addOutboundItems: (id: string, body?: any) => rpcPost(rpc[":id"].outbound.items, body, { id }),
    updateOutboundItem: (id: string, actionId: string, body?: any) =>
      rpcPost(rpc[":id"].outbound.items[":actionId"], body, { id, actionId }),
    removeOutboundItem: (id: string, actionId: string) =>
      rpcDelete(rpc[":id"].outbound.items[":actionId"], { id, actionId }),
    addOutboundShipping: (id: string, body?: any) =>
      rpcPost(rpc[":id"].outbound["shipping-method"], body, { id }),
    updateOutboundShipping: (id: string, actionId: string, body?: any) =>
      rpcPost(rpc[":id"].outbound["shipping-method"][":actionId"], body, { id, actionId }),
    deleteOutboundShipping: (id: string, actionId: string) =>
      rpcDelete(rpc[":id"].outbound["shipping-method"][":actionId"], { id, actionId }),
    request: (id: string, body?: any) => rpcPost(rpc[":id"].request, body, { id }),
    cancelRequest: (id: string) => rpcPost(rpc[":id"].request.cancel, undefined, { id }),
    // 兼容旧别名
    addItems: (id: string, body?: any) => rpcPost(rpc[":id"].inbound.items, body, { id }),
    updateItem: (id: string, actionId: string, body?: any) =>
      rpcPost(rpc[":id"].inbound.items[":actionId"], body, { id, actionId }),
    removeItem: (id: string, actionId: string) =>
      rpcDelete(rpc[":id"].inbound.items[":actionId"], { id, actionId }),
    addShippingMethod: (id: string, body?: any) =>
      rpcPost(rpc[":id"].inbound["shipping-method"], body, { id }),
    removeShippingMethod: (id: string, actionId: string) =>
      rpcDelete(rpc[":id"].inbound["shipping-method"][":actionId"], { id, actionId }),
    createShipment: (id: string, body?: any) => rpcPost(rpc[":id"].request, body, { id }),
    requestReturn: (id: string) => rpcPost(rpc[":id"].request, undefined, { id }),
  }
}

/** fulfillment sets + service zones */
function fulfillmentSetClient() {
  const rpc = (api as any).admin["fulfillment-sets"]
  const base = entityClient("fulfillment-sets")
  return {
    ...base,
    createServiceZone: (fulfillmentSetId: string, body?: any) =>
      rpcPost(rpc[":id"]["service-zones"], body, { id: fulfillmentSetId }),
    retrieveServiceZone: (fulfillmentSetId: string, zoneId: string, query?: Record<string, any>) =>
      rpcGet(rpc[":id"]["service-zones"][":zoneId"], { id: fulfillmentSetId, zoneId }, query),
    updateServiceZone: (fulfillmentSetId: string, zoneId: string, body?: any) =>
      rpcPost(rpc[":id"]["service-zones"][":zoneId"], body, { id: fulfillmentSetId, zoneId }),
    deleteServiceZone: (fulfillmentSetId: string, zoneId: string) =>
      rpcDelete(rpc[":id"]["service-zones"][":zoneId"], { id: fulfillmentSetId, zoneId }),
  }
}

/** 分类/合集关联产品 */
function linkProductsClient(entity: "product-categories" | "collections") {
  const base = entityClient(entity)
  return {
    ...base,
    updateProducts: async (id: string, body?: any) => {
      const res = await (api as any).admin[entity][":id"].products.$post({ param: { id }, json: body })
      return parseJsonResponse(res)
    },
  }
}

/** draft orders 客户端 */
function draftOrderClient() {
  const rpc = (api as any).admin["draft-orders"]
  const editRpc = (id: string) => rpc[":id"].edit
  return {
    list: (query?: any) => rpcGet(rpc, undefined, query),
    retrieve: (id: string, query?: any) => rpcGet(rpc[":id"], { id }, query),
    create: (body?: any) => rpcPost(rpc, body),
    update: (id: string, body?: any) => rpcPost(rpc[":id"], body, { id }),
    delete: (id: string) => rpcDelete(rpc[":id"], { id }),
    // ── Convert ──
    convertToOrder: (id: string) => rpcPost(rpc[":id"]["convert-to-order"], undefined, { id }),
    // ── Edit workflow ──
    beginEdit: (id: string) => rpcPost(rpc[":id"].edit, undefined, { id }),
    cancelEdit: (id: string) => rpcDelete(rpc[":id"].edit, { id }),
    requestEdit: (id: string) => rpcPost(rpc[":id"].edit.request, undefined, { id }),
    confirmEdit: (id: string) => rpcPost(rpc[":id"].edit.confirm, undefined, { id }),
    // ── Items ──
    addItems: (id: string, body?: any) => rpcPost(rpc[":id"].edit.items, body, { id }),
    updateItem: (id: string, actionId: string, body?: any) => rpcPost(rpc[":id"].edit.items[":actionId"], body, { id, actionId }),
    removeItem: (id: string, actionId: string) =>
      rpcDelete(rpc[":id"].edit.items[":actionId"], { id, actionId }),
    removeActionItem: (id: string, actionId: string) =>
      rpcDelete(rpc[":id"].edit.items[":actionId"], { id, actionId }),
    updateActionItem: (id: string, actionId: string, body?: any) =>
      rpcPost(rpc[":id"].edit.items[":actionId"], body, { id, actionId }),
    // ── Shipping ──
    addShippingMethod: (id: string, body?: any) => rpcPost(rpc[":id"].edit["shipping-methods"], body, { id }),
    updateShippingMethod: (id: string, actionId: string, body?: any) => rpcPost(rpc[":id"].edit["shipping-methods"][":actionId"], body, { id, actionId }),
    removeShippingMethod: (id: string, actionId: string) =>
      rpcDelete(rpc[":id"].edit["shipping-methods"][":actionId"], { id, actionId }),
    removeActionShippingMethod: (id: string, actionId: string) =>
      rpcDelete(rpc[":id"].edit["shipping-methods"][":actionId"], { id, actionId }),
    updateActionShippingMethod: (id: string, actionId: string, body?: any) =>
      rpcPost(rpc[":id"].edit["shipping-methods"][":actionId"], body, {
        id,
        actionId,
      }),
    // ── Promotions ──
    addPromotions: (id: string, body?: any) => rpcPost(rpc[":id"].edit.promotions, body, { id }),
    removePromotions: (id: string, actionOrBody?: any) => {
      const actionId =
        typeof actionOrBody === "string"
          ? actionOrBody
          : actionOrBody?.action_id ?? actionOrBody?.promotion_id
      return rpcDelete(rpc[":id"].edit.promotions[":actionId"], {
        id,
        actionId,
      })
    },
    // ── Aliases for compatibility ──
    addItemsAction: (id: string, body?: any) => rpcPost(rpc[":id"].edit.items, body, { id }),
    updateItemAction: (id: string, actionId: string, body?: any) =>
      rpcPost(rpc[":id"].edit.items[":actionId"], body, { id, actionId }),
    removeItemAction: (id: string, actionId: string) =>
      rpcDelete(rpc[":id"].edit.items[":actionId"], { id, actionId }),
    request: (id: string) => rpcPost(rpc[":id"].edit.request, undefined, { id }),
    confirm: (id: string) => rpcPost(rpc[":id"].edit.confirm, undefined, { id }),
    cancel: (id: string) => rpcDelete(rpc[":id"].edit, { id }),
    updateActionMethod: (id: string, actionId: string, body?: any) =>
      rpcPost(rpc[":id"].edit["shipping-methods"][":actionId"], body, { id, actionId }),
    addShippingMethodAction: (id: string, body?: any) =>
      rpcPost(rpc[":id"].edit["shipping-methods"], body, { id }),
    updateShippingMethodAction: (id: string, actionId: string, body?: any) =>
      rpcPost(rpc[":id"].edit["shipping-methods"][":actionId"], body, { id, actionId }),
    removeShippingMethodAction: (id: string, actionId: string) =>
      rpcDelete(rpc[":id"].edit["shipping-methods"][":actionId"], { id, actionId }),
    addPromotionAction: (id: string, body?: any) =>
      rpcPost(rpc[":id"].edit.promotions, body, { id }),
    removePromotionAction: (id: string, actionId: string) =>
      rpcDelete(rpc[":id"].edit.promotions[":actionId"], { id, actionId }),
  }
}

/** order edits 客户端 */
function orderEditClient() {
  const rpc = (api as any).admin["order-edits"]
  return {
    list: (orderId: string, query?: any) => rpcGet(rpc, undefined, { ...query, order_id: orderId }),
    retrieve: (id: string) => rpcGet(rpc[":id"], { id }),
    create: (body?: any) => rpcPost(rpc, body),
    request: (
      id: string,
      body?: { internal_note?: string; send_notification?: boolean },
    ) => rpcPost(rpc[":id"].request, body ?? {}, { id }),
    confirm: (id: string) => rpcPost(rpc[":id"].confirm, undefined, { id }),
    cancelRequest: (id: string) => rpcPost(rpc[":id"].cancel, undefined, { id }),
    addItems: (id: string, body?: any) => rpcPost(rpc[":id"].items, body, { id }),
    updateOriginalItem: (id: string, itemId: string, body?: any) => rpcPost(rpc[":id"].items[":itemId"], body, { id, itemId }),
    updateAddedItem: (id: string, itemId: string, body?: any) => rpcPost(rpc[":id"].items[":itemId"].update, body, { id, itemId }),
    removeAddedItem: (id: string, itemId: string) => rpcDelete(rpc[":id"].items[":itemId"], { id, itemId }),
    addShippingMethod: (id: string, body?: any) => rpcPost(rpc[":id"]["shipping-method"], body, { id }),
    updateShippingMethod: (id: string, actionId: string, body?: any) =>
      rpcPost(rpc[":id"]["shipping-method"][":actionId"], body, { id, actionId }),
    removeShippingMethod: (id: string, actionId: string) =>
      rpcDelete(rpc[":id"]["shipping-method"][":actionId"], { id, actionId }),
    update: (id: string, body?: any) => rpcPost(rpc[":id"].changes, body, { id }),
    delete: (id: string) => rpcDelete(rpc[":id"], { id }),
    initiateRequest: (payload?: any) => rpcPost(rpc, payload),
  }
}

/** exchanges 客户端 */
function exchangeClient() {
  const rpc = (api as any).admin.exchanges
  return {
    list: (query?: Record<string, any>) => rpcGet(rpc, undefined, query),
    retrieve: (id: string) => rpcGet(rpc[":id"], { id }),
    create: (body?: any) => rpcPost(rpc, body),
    cancel: (id: string) => rpcPost(rpc[":id"].cancel, undefined, { id }),
    addInboundItems: (id: string, body?: any) => rpcPost(rpc[":id"].inbound.items, body, { id }),
    updateInboundItem: (id: string, actionId: string, body?: any) =>
      rpcPost(rpc[":id"].inbound.items[":actionId"], body, { id, actionId }),
    removeInboundItem: (id: string, actionId: string) =>
      rpcDelete(rpc[":id"].inbound.items[":actionId"], { id, actionId }),
    addInboundShipping: (id: string, body?: any) =>
      rpcPost(rpc[":id"].inbound["shipping-method"], body, { id }),
    updateInboundShipping: (id: string, actionId: string, body?: any) =>
      rpcPost(rpc[":id"].inbound["shipping-method"][":actionId"], body, { id, actionId }),
    deleteInboundShipping: (id: string, actionId: string) =>
      rpcDelete(rpc[":id"].inbound["shipping-method"][":actionId"], { id, actionId }),
    addOutboundItems: (id: string, body?: any) => rpcPost(rpc[":id"].outbound.items, body, { id }),
    updateOutboundItem: (id: string, actionId: string, body?: any) =>
      rpcPost(rpc[":id"].outbound.items[":actionId"], body, { id, actionId }),
    removeOutboundItem: (id: string, actionId: string) =>
      rpcDelete(rpc[":id"].outbound.items[":actionId"], { id, actionId }),
    addOutboundShipping: (id: string, body?: any) =>
      rpcPost(rpc[":id"].outbound["shipping-method"], body, { id }),
    updateOutboundShipping: (id: string, actionId: string, body?: any) =>
      rpcPost(rpc[":id"].outbound["shipping-method"][":actionId"], body, { id, actionId }),
    deleteOutboundShipping: (id: string, actionId: string) =>
      rpcDelete(rpc[":id"].outbound["shipping-method"][":actionId"], { id, actionId }),
    request: (id: string) => rpcPost(rpc[":id"].request, undefined, { id }),
    cancelRequest: (id: string) => rpcPost(rpc[":id"].request.cancel, undefined, { id }),
  }
}

// ---------------------------------------------------------------------------
// sdk 对象（对齐官方 @medusajs/js-sdk 结构）
// ---------------------------------------------------------------------------
export const sdk = {
  admin: {
    // ── 核心实体 ──────────────────────────────────────────────
    product: productEntity(),
    productVariant: entityClient("product-variants"),
    order: ordersClient(),
    region: entityClient("regions"),
    customer: {
      ...entityClient("customers"),
      batchCustomerGroups: async (id: string, body?: any) => { const res = await (api as any).admin.customers[":id"]["customer-groups"].$post({ param: { id }, json: body }); return parseJsonResponse(res) },
      listAddresses: async (customerId: string, query?: any) => {
        const res = await (api as any).admin.customers[":id"].addresses.$get({ param: { id: customerId }, query: toRpcQuery(query ?? {}) })
        return parseJsonResponse(res)
      },
      retrieveAddress: async (customerId: string, addressId: string) => {
        const res = await (api as any).admin.customers[":id"].addresses[":addressId"].$get({ param: { id: customerId, addressId } })
        return parseJsonResponse(res)
      },
      createAddress: async (customerId: string, body?: any) => {
        const res = await (api as any).admin.customers[":id"].addresses.$post({ param: { id: customerId }, json: body })
        return parseJsonResponse(res)
      },
      updateAddress: async (customerId: string, addressId: string, body?: any) => {
        const res = await (api as any).admin.customers[":id"].addresses[":addressId"].$post({ param: { id: customerId, addressId }, json: body })
        return parseJsonResponse(res)
      },
      deleteAddress: async (customerId: string, addressId: string) => {
        const res = await (api as any).admin.customers[":id"].addresses[":addressId"].$delete({ param: { id: customerId, addressId } })
        return parseJsonResponse(res)
      },
    },
    user: {
      ...entityClient("users"),
      me: async () => {
        try {
          const res = await (api as any).admin.users.me.$get()
          const data = await parseJsonResponse<any>(res)
          return { user: data.user || data }
        } catch {
          return { user: null }
        }
      },
    },

    // ── Sales Channel ──────────────────────────────────────────
    salesChannel: {
      ...entityClient("sales-channels"),
      retrieve: async (id: string) => {
        try {
          const res = await (api as any).admin["sales-channels"][":id"].$get({ param: { id } })
          return parseJsonResponse(res)
        } catch {
          return { sales_channel: { id, name: "", description: "", is_disabled: false } }
        }
      },
      batchProducts: async (id: string, body?: any) => { const res = await (api as any).admin["sales-channels"][":id"].products.$post({ param: { id }, json: body }); return parseJsonResponse(res) },
      updateProducts: async (id: string, body?: any) => { const res = await (api as any).admin["sales-channels"][":id"].products.$post({ param: { id }, json: body }); return parseJsonResponse(res) },
    },

    // ── Collections / Categories / Tags / Types ──────────────
    productCollection: linkProductsClient("collections"),
    collection: linkProductsClient("collections"),

    productCategory: linkProductsClient("product-categories"),
    category: linkProductsClient("product-categories"),

    productTag: entityClient("product-tags"),
    productType: entityClient("product-types"),

    // ── Inventory ──────────────────────────────────────────────
    inventoryItem: {
      ...entityClient("inventory-items"),
      listLevels: async (id: string) => { const res = await (api as any).admin["inventory-items"][":iid"]["location-levels"].$get({ param: { iid: id } }); return parseJsonResponse(res) },
      retrieveLevel: async (iid: string, lid: string) => { const res = await (api as any).admin["inventory-items"][":iid"]["location-levels"][":lid"].$get({ param: { iid, lid } }); return parseJsonResponse(res) },
      updateLevel: async (iid: string, lid: string, body?: any) => { const res = await (api as any).admin["inventory-items"][":iid"]["location-levels"].$post({ param: { iid }, json: { location_id: lid, ...body } }); return parseJsonResponse(res) },
      deleteLevel: async (iid: string, lid: string) => { const res = await (api as any).admin["inventory-items"][":iid"]["location-levels"][":lid"].$delete({ param: { iid, lid } }); return parseJsonResponse(res) },
      batchUpdateLevels: async (body?: any) => { const res = await (api as any).admin["inventory-items"]["location-levels"].batch.$post({ json: body }); return parseJsonResponse(res) },
      batchInventoryItemLocationLevels: async (id: string, body?: any) => { const res = await (api as any).admin["inventory-items"][":id"]["location-levels"].batch.$post({ param: { id }, json: body }); return parseJsonResponse(res) },
      batchInventoryItemsLocationLevels: async (body?: any) => { const res = await (api as any).admin["inventory-items"]["location-levels"].batch.$post({ json: body }); return parseJsonResponse(res) },
    },
    stockLocation: {
      ...entityClient("stock-locations"),
      createFulfillmentSet: async (id: string, body?: any) => {
        const res = await (api as any).admin["stock-locations"][":id"]["fulfillment-sets"].$post({
          param: { id },
          json: body,
        })
        return parseJsonResponse(res)
      },
      updateFulfillmentProviders: async (id: string, body?: any) => {
        const res = await (api as any).admin["stock-locations"][":id"]["fulfillment-providers"].$post({
          param: { id },
          json: body,
        })
        return parseJsonResponse(res)
      },
      updateSalesChannels: async (id: string, body?: any) => {
        const res = await (api as any).admin["stock-locations"][":id"]["sales-channels"].$post({
          param: { id },
          json: body,
        })
        return parseJsonResponse(res)
      },
    },
    reservation: entityClient("reservations"),

    // ── Pricing ────────────────────────────────────────────────
    priceList: {
      ...entityClient("price-lists"),
      listPrices: async (plid: string) => { const res = await (api as any).admin["price-lists"][":plid"].prices.$get({ param: { plid } }); return parseJsonResponse(res) },
      addPrices: async (plid: string, body?: any) => { const res = await (api as any).admin["price-lists"][":plid"].prices.$post({ param: { plid }, json: body }); return parseJsonResponse(res) },
      removePrices: async (plid: string, pid: string) => { const res = await (api as any).admin["price-lists"][":plid"].prices[":pid"].$delete({ param: { plid, pid } }); return parseJsonResponse(res) },
      linkProducts: async (id: string, body?: any) => { const res = await (api as any).admin["price-lists"][":id"].products.$post({ param: { id }, json: body }); return parseJsonResponse(res) }, batchPrices: async (id: string, body?: any) => { const res = await (api as any).admin["price-lists"][":id"].prices.batch.$post({ param: { id }, json: body }); return parseJsonResponse(res) },
    },
    pricePreference: entityClient("price-preferences"),
    currency: entityClient("currencies"),

    // ── Promotions ─────────────────────────────────────────────
    promotion: entityClient("promotions"),
    campaign: entityClient("campaigns"),

    // ── Orders / Claims / Returns ─────────────────────────────
    claim: claimClient(),
    return: returnClient(),
    returnReason: entityClient("return-reasons"),
    refundReason: entityClient("refund-reasons"),
    orderEdit: orderEditClient(),
    draftOrder: draftOrderClient(),
    exchange: exchangeClient(),

    // ── Fulfillment ────────────────────────────────────────────
    fulfillment: {
      list: (query?: Record<string, any>) => rpcGet((api as any).admin.fulfillments, undefined, query),
      retrieve: (id: string) => rpcGet((api as any).admin.fulfillments[":id"], { id }),
      create: (body?: any) => rpcPost((api as any).admin.fulfillments, body),
      cancel: (id: string) => rpcPost((api as any).admin.fulfillments[":id"].cancel, undefined, { id }),
      createShipment: (fulfillmentId: string, body?: any) =>
        rpcPost((api as any).admin.fulfillments[":id"].shipment, body, { id: fulfillmentId }),
    },
    fulfillmentSet: fulfillmentSetClient(),
    fulfillmentProvider: {
      list: (query?: Record<string, any>) =>
        rpcGet((api as any).admin["fulfillment-providers"], undefined, query),
      listFulfillmentOptions: (id: string) =>
        rpcGet((api as any).admin["fulfillment-providers"][":id"].options, { id }),
    },
    shippingOption: entityClient("shipping-options"),
    shippingOptionType: entityClient("shipping-option-types"),
    shippingProfile: entityClient("shipping-profiles"),

    // ── Payment ────────────────────────────────────────────────
    paymentCollection: entityClient("payment-collections"),

    // ── Store ──────────────────────────────────────────────────
    store: {
      ...entityClient("stores"),
      listCurrencies: async (id: string) => {
        const res = await (api as any).admin.stores[":id"].currencies.$get({ param: { id } })
        return parseJsonResponse(res)
      },
      addCurrencies: async (id: string, body?: any) => {
        const res = await (api as any).admin.stores[":id"].currencies.$post({ param: { id }, json: body })
        return parseJsonResponse(res)
      },
      removeCurrencies: async (id: string, body?: any) => {
        const res = await (api as any).admin.stores[":id"].currencies.$delete({ param: { id }, json: body })
        return parseJsonResponse(res)
      },
    },

    // ── Upload ────────────────────────────────────────────────
    upload: {
      create: async (data: any) => {
        if (!data?.files?.length) {
          return { files: [] }
        }

        const formData = new FormData()
        // 对齐 Medusa 官方: multer upload.array("files")
        for (const file of data.files) {
          formData.append("files", file)
        }

        const headers: Record<string, string> = {
          ...getAuthHeaders(),
          // 不设 Content-Type，浏览器自动设为 multipart/form-data + boundary
        }

        const res = await fetch("/api/admin/uploads", {
          method: "POST",
          body: formData,
          headers,
        })
        return parseJsonResponse(res)
      },
      retrieve: async (id: string) => {
        const res = await (api as any).admin.uploads[":id"].$get({ param: { id } })
        return parseJsonResponse(res)
      },
      delete: async (id: string) => {
        const res = await (api as any).admin.uploads[":id"].$delete({ param: { id } })
        return parseJsonResponse(res)
      },
    },

    // ── Others ────────────────────────────────────────────────
    invite: {
      ...entityClient("invites"),
      accept: async (payload: any, query?: any, extraHeaders?: Record<string, string>) => {
        const inviteToken = payload.invite_token ?? query?.token ?? query?.invite_token
        const { invite_token: _t, ...body } = payload
        const res = await fetch(
          `${baseUrl}/api/admin/invites/accept?${new URLSearchParams({
            token: String(inviteToken ?? ""),
          }).toString()}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...extraHeaders,
            },
            body: JSON.stringify(body),
          },
        )
        return parseJsonResponse(res)
      },
      resend: async (id: string) => {
        const res = await (api as any).admin.invites[":id"].resend.$post({ param: { id } })
        return parseJsonResponse(res)
      },
    },
    apiKey: entityClient("api-keys"),
    notification: entityClient("notifications"),
    payment: paymentsClient(),
    taxRegion: entityClient("tax-regions"),
    taxRate: entityClient("tax-rates"),
    taxProvider: {
      list: (query?: Record<string, any>) =>
        rpcGet((api as any).admin["tax-providers"], undefined, query),
    },
    views: {
      columns: (entity: string) =>
        rpcGet((api as any).admin.views[":entity"].columns, { entity }),
      listConfigurations: (entity: string, query?: Record<string, any>) =>
        rpcGet((api as any).admin.views[":entity"].configurations, { entity }, query),
      retrieveActiveConfiguration: (entity: string) =>
        rpcGet((api as any).admin.views[":entity"].configurations.active, { entity }),
      retrieveConfiguration: (entity: string, id: string, query?: Record<string, any>) =>
        rpcGet((api as any).admin.views[":entity"].configurations[":id"], { entity, id }, query),
      createConfiguration: (entity: string, body?: any) =>
        rpcPost((api as any).admin.views[":entity"].configurations, body, { entity }),
      updateConfiguration: (entity: string, id: string, body?: any) =>
        rpcPost((api as any).admin.views[":entity"].configurations[":id"], body, { entity, id }),
      deleteConfiguration: (entity: string, id: string) =>
        rpcDelete((api as any).admin.views[":entity"].configurations[":id"], { entity, id }),
      setActiveConfiguration: (entity: string, body?: any) =>
        rpcPost((api as any).admin.views[":entity"].configurations.active, body, { entity }),
    },
    workflowExecution: entityClient("workflows-executions"),
    customerGroup: entityClient("customer-groups"),
    propertyLabel: entityClient("property-labels"),
    locale: {
      list: (query?: Record<string, any>) => rpcGet((api as any).admin.locales, undefined, query),
      retrieve: (code: string, query?: Record<string, any>) =>
        rpcGet((api as any).admin.locales[":code"], { code }, query),
    },
  },

  // ── Auth ──────────────────────────────────────────────────
  auth: {
    login: async (actor: string, method: string, payload: any) => {
      // POST /auth/{actor}/{method}（官方 SDK 自动拼 actor + method）
      const res = await (api as any).auth[actor][method].$post({ json: payload })
      const data = await parseJsonResponse<any>(res)
      return data.token || JSON.stringify(data)
    },
    register: async (actor: string, method: string, payload: any) => {
      // POST /auth/{actor}/{method}/register
      const res = await (api as any).auth[actor][method].register.$post({ json: payload })
      const data = await parseJsonResponse<any>(res)
      return data.token || JSON.stringify(data)
    },
    callback: async (actor: string, method: string, query: Record<string, any>) => {
      // GET /auth/{actor}/{method}/callback?...
      const res = await (api as any).auth[actor][method].callback.$get({ query: toRpcQuery(query) })
      const data = await parseJsonResponse<any>(res)
      return data.token || data
    },
    resetPassword: async (actor: string, provider: string, body: any) => {
      // POST /auth/{actor}/{provider}/reset-password
      const res = await (api as any).auth[actor][provider]["reset-password"].$post({ json: body })
      return parseJsonResponse(res)
    },
    updateProvider: async (actor: string, provider: string, body: any, _token?: string) => {
      // POST /auth/{actor}/{provider}/update
      const res = await (api as any).auth[actor][provider].update.$post({ json: body })
      return parseJsonResponse(res)
    },
    refresh: async () => {
      const res = await (api as any).auth["token/refresh"].$post({ json: {} })
      const data = await parseJsonResponse<any>(res)
      return data.token || JSON.stringify(data)
    },
    refreshToken: async (token?: string) => {
      const res = await (api as any).auth["token/refresh"].$post({ json: { refresh_token: token } })
      const data = await parseJsonResponse<any>(res)
      return data.token || JSON.stringify(data)
    },
    getSession: async () => {
      const res = await (api as any).auth.session.$get()
      return parseJsonResponse(res)
    },
    logout: async () => { const res = await (api as any).auth.session.$delete(); return parseJsonResponse(res) },
    createInvite: async (body?: any) => { const res = await (api as any).admin.invites.$post({ json: body }); return parseJsonResponse(res) },
    acceptInvite: async (body?: any) => { const res = await (api as any).admin.invites.accept.$post({ json: body }); return parseJsonResponse(res) },
    confirmResetPassword: async (body?: any) => { const res = await (api as any).auth.password.confirmReset.$post({ json: body }); return parseJsonResponse(res) },
  },

  // ── Client（底层 fetch，方便调试） ──────────────────────────
  client: {
    fetch: async (url: string, init?: any) => {
      const res = await fetch(url, init)
      return res.json()
    },
  },
}
