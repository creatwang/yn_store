/**
 * Medusa JS-SDK compatible shim — translates sdk.admin.* calls to Hono RPC.
 */
import { api, toRpcQuery, parseJsonResponse } from "./api"

const noop = (..._args: any[]) => Promise.resolve({} as any)

function entityClient(entity: string) {
  const rpc = (api as any).admin[entity]

  const base = {
    list: async (query?: Record<string, any>) => {
      const res = await rpc.$get({ query: toRpcQuery(query ?? {}) })
      return parseJsonResponse(res)
    },
    retrieve: async (id: string, query?: Record<string, any>) => {
      const res = await rpc[":id"].$get({ param: { id }, query: toRpcQuery(query ?? {}) })
      return parseJsonResponse(res)
    },
    create: async (data: any) => {
      const res = await rpc.$post({ json: data })
      return parseJsonResponse(res)
    },
    update: async (id: string, data: any, _query?: Record<string, any>) => {
      const res = await rpc[":id"].$post({ param: { id }, json: data })
      return parseJsonResponse(res)
    },
    delete: async (id: string) => {
      const res = await rpc[":id"].$delete({ param: { id } })
      return parseJsonResponse(res)
    },
  }

  return {
    ...base,
    // Variants
    listVariants: async (productId: string, query?: Record<string, any>) => {
      const res = await (api as any).admin.products[":productId"].variants.$get({ param: { productId }, query: toRpcQuery(query ?? {}) })
      return parseJsonResponse(res)
    },
    retrieveVariant: async (productId: string, variantId: string) => {
      const res = await (api as any).admin.products[":productId"].variants[":variantId"].$get({ param: { productId, variantId } })
      return parseJsonResponse(res)
    },
    createVariant: async (productId: string, data: any) => {
      const res = await (api as any).admin.products[":productId"].variants.$post({ param: { productId }, json: data })
      return parseJsonResponse(res)
    },
    updateVariant: async (productId: string, variantId: string, data: any) => {
      const res = await (api as any).admin.products[":productId"].variants[":variantId"].$post({ param: { productId, variantId }, json: data })
      return parseJsonResponse(res)
    },
    deleteVariant: async (productId: string, variantId: string) => {
      const res = await (api as any).admin.products[":productId"].variants[":variantId"].$delete({ param: { productId, variantId } })
      return parseJsonResponse(res)
    },
    batchVariants: async (productId: string, payload: any) => {
      if (payload?.update?.length) {
        const results = await Promise.all(
          payload.update.map((v: any) =>
            (api as any).admin.products[":productId"].variants[":variantId"].$post({
              param: { productId, variantId: v.id },
              json: v,
            }).then(parseJsonResponse)
          )
        )
        return { variants: results.map((r: any) => r.variant) }
      }
      return { variants: [] }
    },
    // Options
    createOption: async (productId: string, data: any) => {
      const res = await (api as any).admin.products[":productId"].options.$post({ param: { productId }, json: data })
      return parseJsonResponse(res)
    },
    updateOption: async (productId: string, optionId: string, data: any) => {
      const res = await (api as any).admin.products[":productId"].options[":optionId"].$post({ param: { productId, optionId }, json: data })
      return parseJsonResponse(res)
    },
    deleteOption: async (productId: string, optionId: string) => {
      const res = await (api as any).admin.products[":productId"].options[":optionId"].$delete({ param: { productId, optionId } })
      return parseJsonResponse(res)
    },
    // Images
    listImages: async (productId: string) => {
      const res = await (api as any).admin.products[":productId"].images.$get({ param: { productId } })
      return parseJsonResponse(res)
    },
    createImage: async (productId: string, data: any) => {
      const res = await (api as any).admin.products[":productId"].images.$post({ param: { productId }, json: data })
      return parseJsonResponse(res)
    },
    deleteImage: async (productId: string, imageId: string) => {
      const res = await (api as any).admin.products[":productId"].images[":imageId"].$delete({ param: { productId, imageId } })
      return parseJsonResponse(res)
    },
    batchImageVariants: noop,
    batchVariantImages: noop,
    batchVariantInventoryItems: noop,
    // Import/export
    export: noop,
    createImport: noop,
    confirmImport: noop,
    // Collections (Admin SDK uses productCollection)
    listCollections: noop,
    retrieveCollection: noop,
    createCollection: noop,
    updateCollection: noop,
    deleteCollection: noop,
    // Categories
    listCategories: noop,
    retrieveCategory: noop,
    createCategory: noop,
    updateCategory: noop,
    deleteCategory: noop,
    // Types
    listTypes: noop,
    retrieveType: noop,
    createType: noop,
    updateType: noop,
    deleteType: noop,
    // Tags
    listTags: noop,
    retrieveTag: noop,
    createTag: noop,
    updateTag: noop,
    deleteTag: noop,
  }
}

function ordersClient(entity: string) {
  const rpc = (api as any).admin[entity]
  return {
    list: async (query?: Record<string, any>) => {
      const res = await rpc.$get({ query: toRpcQuery(query ?? {}) })
      return parseJsonResponse(res)
    },
    retrieve: async (id: string, query?: Record<string, any>) => {
      const res = await rpc[":id"].$get({ param: { id }, query: toRpcQuery(query ?? {}) })
      return parseJsonResponse(res)
    },
    create: async (data: any) => {
      const res = await rpc.$post({ json: data })
      return parseJsonResponse(res)
    },
    update: async (id: string, data: any) => {
      const res = await rpc[":id"].$post({ param: { id }, json: data })
      return parseJsonResponse(res)
    },
    cancel: async (id: string) => {
      const res = await rpc[":id"].cancel.$post({ param: { id } })
      return parseJsonResponse(res)
    },
    delete: noop, requestItemReturn: noop, createClaim: noop, createExchange: noop,
    createFulfillment: noop, cancelFulfillment: noop, createShipment: noop,
    archive: noop, complete: noop, listChanges: noop, listTransactions: noop,
    transferCancel: noop, addItems: noop, updateItem: noop, removeItem: noop,
    addShippingMethod: noop, removeShippingMethod: noop,
    listFulfillments: noop, retrieveFulfillment: noop, createFulfillmentSet: noop, deleteFulfillmentSet: noop,
    listShippingOptions: noop, retrieveShippingOption: noop, createShippingOption: noop,
    updateShippingOption: noop, deleteShippingOption: noop,
    listReturns: noop, retrieveReturn: noop, initiateReturn: noop, cancelReturn: noop, receiveReturn: noop,
    listPayments: noop, retrievePayment: noop, capturePayment: noop, refundPayment: noop,
    listDraftOrders: noop, retrieveDraftOrder: noop, createDraftOrder: noop,
    updateDraftOrder: noop, deleteDraftOrder: noop,
  }
}

export const sdk = {
  admin: {
    product: entityClient("products"),
    order: ordersClient("orders"),
    customer: {
      ...entityClient("customers"),
      batchCustomerGroups: noop, createAddress: noop, updateAddress: noop, deleteAddress: noop,
      listAddresses: async () => ({ addresses: [], count: 0 }),
      retrieveAddress: async () => ({ address: {} }),
    },
    region: entityClient("regions"),
    salesChannel: { ...entityClient("sales-channels"), batchProducts: noop, updateProducts: noop },
    // SDK entity keys used by hooks
    productCollection: {
      list: async () => ({ collections: [], count: 0 }),
      retrieve: async (id: string) => ({ collection: { id, title: "", handle: "" } }),
      create: noop, update: noop, delete: noop, updateProducts: noop,
    },
    productCategory: {
      list: async () => ({ product_categories: [], count: 0 }),
      retrieve: async (id: string) => ({ product_category: { id, name: "", handle: "" } }),
      create: noop, update: noop, delete: noop, updateProducts: noop,
    },
    productType: {
      list: async () => ({ product_types: [], count: 0 }),
      retrieve: async (id: string) => ({ product_type: { id, value: "" } }),
      create: noop, update: noop, delete: noop,
    },
    productTag: {
      list: async () => ({ product_tags: [], count: 0 }),
      retrieve: async (id: string) => ({ product_tag: { id, value: "" } }),
      create: noop, update: noop, delete: noop,
    },
    // Fallback entity keys (aliased to same stubs)
    collection: { list: noop, retrieve: noop, create: noop, update: noop, delete: noop },
    category: { list: noop, retrieve: noop, create: noop, update: noop, delete: noop },

    priceList: { list: noop, retrieve: noop, create: noop, update: noop, delete: noop, listPrices: noop, addPrices: noop, removePrices: noop },
    promotion: { list: noop, retrieve: noop, create: noop, update: noop, delete: noop, listRules: noop, addRules: noop, removeRules: noop },
    campaign: { list: noop, retrieve: noop, create: noop, update: noop, delete: noop, batchPromotions: noop },
    claim: { list: noop, retrieve: noop, create: noop, update: noop, delete: noop, cancel: noop, addItems: noop, updateItem: noop, removeItem: noop, addShippingMethod: noop, removeShippingMethod: noop, createShipment: noop, requestReturn: noop },
    return: { list: noop, retrieve: noop, initiate: noop, cancel: noop, receive: noop, request: noop, dismiss: noop },
    taxRegion: { list: noop, retrieve: noop, create: noop, update: noop, delete: noop },
    taxRate: { list: noop, retrieve: noop, create: noop, update: noop, delete: noop },
    stockLocation: {
      list: async (query?: Record<string, any>) => {
        try {
          const res = await (api as any).admin["stock-locations"].$get({ query: toRpcQuery(query ?? {}) })
          return parseJsonResponse(res)
        } catch { return { stock_locations: [], count: 0 } }
      },
      retrieve: noop, create: noop, update: noop, delete: noop,
      createFulfillmentSet: noop, updateFulfillmentProviders: noop, updateSalesChannels: noop,
    },
    fulfillmentProvider: { list: noop, listOptions: noop },
    fulfillmentSet: { list: noop, retrieve: noop, create: noop, update: noop, delete: noop },
    shippingOption: { list: noop, retrieve: noop, create: noop, update: noop, delete: noop },
    shippingProfile: { list: noop, retrieve: noop, create: noop, update: noop, delete: noop },
    customerGroup: { list: noop, retrieve: noop, create: noop, update: noop, delete: noop, batchCustomers: noop },
    invite: { list: noop, create: noop, resend: noop, delete: noop, accept: noop },
    user: {
      list: noop, retrieve: noop, create: noop, update: noop, delete: noop,
      me: async () => {
        try {
          const res = await (api as any).auth.session.$get()
          const data = await parseJsonResponse<any>(res)
          return { user: data.user || data }
        } catch { return { user: null } }
      },
    },
    store: {
      list: async () => ({ stores: [{ id: "store_01", name: "My Store", default_sales_channel_id: "sc_01", default_region_id: "reg_01", default_location_id: "loc_01", metadata: {} }], count: 1 }),
      retrieve: async (id: string) => ({ store: { id, name: "My Store", default_sales_channel_id: "sc_01", default_region_id: "reg_01", default_location_id: "loc_01", metadata: {} } }),
      update: noop, listCurrencies: async () => ({ currencies: [], count: 0 }), addCurrencies: noop, removeCurrencies: noop,
    },
    payment: { list: noop, retrieve: noop, capture: noop, refund: noop },
    paymentCollection: { list: noop, retrieve: noop, markAsPaid: noop },
    fulfillment: { list: noop, retrieve: noop, create: noop, cancel: noop, createShipment: noop },
    inventoryItem: {
      list: async (query?: Record<string, any>) => {
        try {
          const res = await (api as any).admin["inventory-items"].$get({ query: toRpcQuery(query ?? {}) })
          return parseJsonResponse(res)
        } catch { return { inventory_items: [], count: 0 } }
      },
      retrieve: noop, create: noop, update: noop, delete: noop,
      listLevels: noop, batchLevels: noop, bulkCreateLevels: noop,
      deleteLevel: noop, updateLevel: noop,
      batchInventoryItemLocationLevels: noop,
      batchInventoryItemsLocationLevels: noop,
    },
    reservation: { list: noop, retrieve: noop, create: noop, update: noop, delete: noop },
    returnReason: { list: noop, retrieve: noop, create: noop, update: noop, delete: noop },
    refundReason: { list: noop, retrieve: noop, create: noop, update: noop, delete: noop },
    workflowExecution: { list: noop, retrieve: noop },
    apiKey: { list: noop, retrieve: noop, create: noop, update: noop, delete: noop, revoke: noop, batchSalesChannels: noop },
    currency: { list: noop, retrieve: noop },
    upload: {
      create: async (data: any) => {
        if (data?.files?.length) {
          const formData = new FormData()
          formData.append("file", data.files[0])
          try {
            const res = await fetch("/api/admin/uploads", { method: "POST", body: formData })
            return parseJsonResponse(res)
          } catch { return { files: [{ url: URL.createObjectURL(data.files[0]) }] } }
        }
        return { files: [] }
      },
      retrieve: noop, delete: noop,
    },
    notification: { list: noop, markAsRead: noop },
  },
  auth: {
    login: async (provider: string, method: string, payload: any) => {
      const res = await (api as any).auth.user.emailpass.$post({ json: payload })
      const data = await parseJsonResponse<any>(res)
      return data.token || JSON.stringify(data)
    },
    getSession: async () => {
      const res = await (api as any).auth.session.$get()
      return parseJsonResponse(res)
    },
    refreshToken: async (token: string) => {
      const res = await (api as any).auth.token.refresh.$post({ json: { refresh_token: token } })
      return parseJsonResponse(res)
    },
    refresh: async () => {
      const res = await (api as any).auth.token.refresh.$post({ json: {} })
      return parseJsonResponse(res)
    },
    callback: noop, logout: noop, resetPassword: noop, confirmResetPassword: noop,
    createInvite: noop, acceptInvite: noop,
    register: async (_p: string, _m: string, payload: any) => {
      const res = await (api as any).auth.user.emailpass.$post({ json: payload })
      return parseJsonResponse(res)
    },
    updateProvider: noop,
  },
  client: {
    fetch: async (url: string, init?: any) => {
      const res = await fetch(url, init)
      return res.json()
    },
  },
}
