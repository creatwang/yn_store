/**
 * Medusa JS-SDK compatible shim — translates sdk.admin.* calls to Hono RPC.
 *
 * 方法签名对齐 @medusajs/js-sdk v2.15.3（见 demo/dashboard/node_modules/@medusajs/js-sdk/dist/）
 * 所有方法均忽略 headers 参数（由 api.ts 的 getAuthHeaders 自动注入）
 */
import { api, toRpcQuery, parseJsonResponse } from "./api"

// ---------------------------------------------------------------------------
// 工具
// ---------------------------------------------------------------------------
const noop = (..._args: any[]) => Promise.resolve({} as any)

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

    batchImageVariants: noop,
    batchVariantImages: noop,
    batchVariantInventoryItems: noop,

    // ── Import / Export ──────────────────────────────────────
    export: noop,
    createImport: noop,
    confirmImport: noop,
    import: noop,
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
    retrieveShippingOption: noop,
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
    createFulfillmentSet: noop, deleteFulfillmentSet: noop,
    createShippingOption: noop, updateShippingOption: noop, deleteShippingOption: noop,
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
    retrieve: (id: string) => rpcGet(rpc[":id"], { id }),
    initiate: (body?: any) => rpcPost(rpc, body),
    cancel: (id: string) => rpcPost(rpc[":id"].cancel, undefined, { id }),
    receive: (id: string, body?: any) => rpcPost(rpc[":id"].receive.confirm, body, { id }),
    // Not yet implemented
    request: noop, dismiss: noop, initiateRequest: noop, cancelRequest: noop,
    addReturnItem: noop, updateReturnItem: noop, removeReturnItem: noop,
    addReturnShipping: noop, updateReturnShipping: noop, deleteReturnShipping: noop,
    updateRequest: noop, confirmRequest: noop,
    initiateReceive: noop, receiveItems: noop, updateReceiveItem: noop, removeReceiveItem: noop,
    dismissItems: noop, updateDismissItem: noop, removeDismissItem: noop,
  }
}

/** claims 客户端 */
function claimClient() {
  const rpc = (api as any).admin.claims
  return {
    list: (query?: Record<string, any>) => rpcGet(rpc, undefined, query),
    retrieve: (id: string) => rpcGet(rpc[":id"], { id }),
    create: (body?: any) => rpcPost(rpc, body),
    cancel: (id: string) => rpcPost(rpc[":id"].cancel, undefined, { id }),
    // Not yet implemented
    update: noop, delete: noop, addItems: noop, updateItem: noop, removeItem: noop,
    addShippingMethod: noop, removeShippingMethod: noop, createShipment: noop, requestReturn: noop,
  }
}

/** draft orders 客户端 */
function draftOrderClient() {
  const rpc = (api as any).admin["draft-orders"]
  const editRpc = (id: string) => rpc[":id"].edit
  return {
    list: (query?: any) => rpcGet(rpc, undefined, query),
    retrieve: (id: string) => rpcGet(rpc[":id"], { id }),
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
    removeItem: (id: string, actionId: string) => rpcDelete(rpc[":id"].edit.items[":actionId"], { id, actionId }),
    // ── Shipping ──
    addShippingMethod: (id: string, body?: any) => rpcPost(rpc[":id"].edit["shipping-methods"], body, { id }),
    updateShippingMethod: (id: string, actionId: string, body?: any) => rpcPost(rpc[":id"].edit["shipping-methods"][":actionId"], body, { id, actionId }),
    removeShippingMethod: (id: string, actionId: string) => rpcDelete(rpc[":id"].edit["shipping-methods"][":actionId"], { id, actionId }),
    // ── Promotions ──
    addPromotions: (id: string, body?: any) => rpcPost(rpc[":id"].edit.promotions, body, { id }),
    removePromotions: (id: string, actionId: string) => rpcDelete(rpc[":id"].edit.promotions[":actionId"], { id, actionId }),
    // ── Aliases for compatibility ──
    addItemsAction: noop, updateItemAction: noop, removeItemAction: noop,
    request: (id: string) => rpcPost(rpc[":id"].edit.request, undefined, { id }),
    confirm: (id: string) => rpcPost(rpc[":id"].edit.confirm, undefined, { id }),
    cancel: (id: string) => rpcDelete(rpc[":id"].edit, { id }),
    updateActionMethod: noop, addShippingMethodAction: noop,
    updateShippingMethodAction: noop, removeShippingMethodAction: noop,
    addPromotionAction: noop, removePromotionAction: noop,
  }
}

/** order edits 客户端 */
function orderEditClient() {
  const rpc = (api as any).admin["order-edits"]
  return {
    list: (orderId: string, query?: any) => rpcGet(rpc, undefined, { ...query, order_id: orderId }),
    retrieve: (id: string) => rpcGet(rpc[":id"], { id }),
    create: (body?: any) => rpcPost(rpc, body),
    request: (id: string) => rpcPost(rpc[":id"].request, undefined, { id }),
    confirm: (id: string) => rpcPost(rpc[":id"].confirm, undefined, { id }),
    cancelRequest: (id: string) => rpcPost(rpc[":id"].cancel, undefined, { id }),
    addItems: (id: string, body?: any) => rpcPost(rpc[":id"].items, body, { id }),
    updateOriginalItem: (id: string, itemId: string, body?: any) => rpcPost(rpc[":id"].items[":itemId"], body, { id, itemId }),
    updateAddedItem: (id: string, itemId: string, body?: any) => rpcPost(rpc[":id"].items[":itemId"].update, body, { id, itemId }),
    removeAddedItem: (id: string, itemId: string) => rpcDelete(rpc[":id"].items[":itemId"], { id, itemId }),
    update: (id: string, body?: any) => rpcPost(rpc[":id"].changes, body, { id }),
    // Not yet implemented
    delete: noop, initiateRequest: noop,
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
    // Not yet implemented
    addInboundItems: noop, updateInboundItem: noop, removeInboundItem: noop,
    addInboundShipping: noop, updateInboundShipping: noop, deleteInboundShipping: noop,
    addOutboundItems: noop, updateOutboundItem: noop, removeOutboundItem: noop,
    addOutboundShipping: noop, updateOutboundShipping: noop, deleteOutboundShipping: noop,
    request: noop, cancelRequest: noop,
  }
}

// ---------------------------------------------------------------------------
// sdk 对象（对齐官方 @medusajs/js-sdk 结构）
// ---------------------------------------------------------------------------
export const sdk = {
  admin: {
    // ── 核心实体 ──────────────────────────────────────────────
    product: productEntity(),
    order: ordersClient(),
    region: entityClient("regions"),
    customer: {
      ...entityClient("customers"),
      batchCustomerGroups: noop,
      createAddress: noop, updateAddress: noop, deleteAddress: noop,
      listAddresses: async () => ({ addresses: [], count: 0 }),
      retrieveAddress: async () => ({ address: {} }),
    },
    user: {
      list: async () => ({ users: [], count: 0 }),
      retrieve: async () => ({ user: {} }),
      create: noop, update: noop, delete: noop,
      me: async () => {
        try {
          const res = await (api as any).auth.session.$get()
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
      batchProducts: noop,
      updateProducts: noop,
    },

    // ── Collections / Categories / Tags / Types ──────────────
    // 注意：后端尚未实现这些路由，保留安全兜底
    productCollection: {
      list: async () => ({ collections: [], count: 0 }),
      retrieve: async (id: string) => ({ collection: { id, title: "", handle: "" } }),
      create: noop, update: noop, delete: noop, updateProducts: noop,
    },
    collection: { list: noop, retrieve: noop, create: noop, update: noop, delete: noop },

    productCategory: {
      list: async () => ({ product_categories: [], count: 0 }),
      retrieve: async (id: string) => ({ product_category: { id, name: "", handle: "" } }),
      create: noop, update: noop, delete: noop, updateProducts: noop,
    },
    category: { list: noop, retrieve: noop, create: noop, update: noop, delete: noop },

    productTag: {
      list: async () => ({ product_tags: [], count: 0 }),
      retrieve: async (id: string) => ({ product_tag: { id, value: "" } }),
      create: noop, update: noop, delete: noop,
    },
    productType: {
      list: async () => ({ product_types: [], count: 0 }),
      retrieve: async (id: string) => ({ product_type: { id, value: "" } }),
      create: noop, update: noop, delete: noop,
    },

    // ── Inventory ──────────────────────────────────────────────
    inventoryItem: {
      ...entityClient("inventory-items"),
      listLevels: noop,
      retrieveLevel: noop,
      updateLevel: noop,
      deleteLevel: noop,
      batchUpdateLevels: noop,
      batchInventoryItemLocationLevels: noop,
      batchInventoryItemsLocationLevels: noop,
    },
    stockLocation: {
      ...entityClient("stock-locations"),
      createFulfillmentSet: noop,
      updateFulfillmentProviders: noop,
      updateSalesChannels: noop,
    },
    reservation: { list: noop, retrieve: noop, create: noop, update: noop, delete: noop },

    // ── Pricing ────────────────────────────────────────────────
    priceList: { list: noop, retrieve: noop, create: noop, update: noop, delete: noop, listPrices: noop, addPrices: noop, removePrices: noop, linkProducts: noop, batchPrices: noop },
    pricePreference: { list: async () => ({ price_preferences: [], count: 0 }), retrieve: noop, create: noop, update: noop, delete: noop },
    currency: { list: noop, retrieve: noop },

    // ── Promotions ─────────────────────────────────────────────
    promotion: { list: noop, retrieve: noop, create: noop, update: noop, delete: noop, listRules: noop, addRules: noop, removeRules: noop },
    campaign: { list: noop, retrieve: noop, create: noop, update: noop, delete: noop, batchPromotions: noop },

    // ── Orders / Claims / Returns ─────────────────────────────
    claim: claimClient(),
    return: returnClient(),
    returnReason: { list: noop, retrieve: noop, create: noop, update: noop, delete: noop },
    refundReason: { list: noop, retrieve: noop, create: noop, update: noop, delete: noop },
    orderEdit: orderEditClient(),
    draftOrder: draftOrderClient(),
    exchange: exchangeClient(),

    // ── Fulfillment ────────────────────────────────────────────
    fulfillment: { list: noop, retrieve: noop, create: noop, cancel: noop, createShipment: noop },
    fulfillmentSet: { list: noop, retrieve: noop, create: noop, update: noop, delete: noop },
    fulfillmentProvider: { list: noop, listFulfillmentOptions: noop },
    shippingOption: { list: noop, retrieve: noop, create: noop, update: noop, delete: noop, updateRules: noop },
    shippingOptionType: { list: noop, retrieve: noop, create: noop, update: noop, delete: noop },
    shippingProfile: {
      list: async () => ({ shipping_profiles: [], count: 0 }),
      retrieve: async (id: string) => ({ shipping_profile: { id, name: "" } }),
      create: noop, update: noop, delete: noop,
    },

    // ── Payment ────────────────────────────────────────────────
    payment: { list: noop, retrieve: noop, capture: noop, refund: noop },
    paymentCollection: { list: noop, retrieve: noop, markAsPaid: noop, createPaymentSession: noop },

    // ── Store ──────────────────────────────────────────────────
    store: {
      ...entityClient("stores"),
      listCurrencies: async () => ({ currencies: [], count: 0 }),
      addCurrencies: noop,
      removeCurrencies: noop,
    },

    // ── Upload ────────────────────────────────────────────────
    upload: {
      create: async (data: any) => {
        if (data?.files?.length) {
          const formData = new FormData()
          formData.append("file", data.files[0])
          try {
            const res = await fetch("/api/admin/uploads", { method: "POST", body: formData })
            return parseJsonResponse(res)
          } catch {
            return { files: [{ url: URL.createObjectURL(data.files[0]) }] }
          }
        }
        return { files: [] }
      },
      retrieve: noop,
      delete: noop,
    },

    // ── Others ────────────────────────────────────────────────
    invite: { list: noop, retrieve: noop, create: noop, resend: noop, delete: noop, accept: noop },
    apiKey: { list: noop, retrieve: noop, create: noop, update: noop, delete: noop, revoke: noop, batchSalesChannels: noop },
    notification: { list: noop, retrieve: noop, markAsRead: noop },
    payment: paymentsClient(),
    taxRegion: { list: noop, retrieve: noop, create: noop, update: noop, delete: noop },
    taxRate: { list: noop, retrieve: noop, create: noop, update: noop, delete: noop },
    taxProvider: { list: noop },
    workflowExecution: { list: noop, retrieve: noop },
    customerGroup: { list: noop, retrieve: noop, create: noop, update: noop, delete: noop, batchCustomers: noop },
    locale: { list: noop, retrieve: noop },
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
    logout: noop,
    createInvite: noop,
    acceptInvite: noop,
    confirmResetPassword: noop,
  },

  // ── Client（底层 fetch，方便调试） ──────────────────────────
  client: {
    fetch: async (url: string, init?: any) => {
      const res = await fetch(url, init)
      return res.json()
    },
  },
}
