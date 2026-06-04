// @ts-nocheck
/** 与官方 Dashboard inventory-detail/constants.ts 一致，并保留库位扩展 */
export const INVENTORY_DETAIL_FIELDS =
  "*variants,*variants.product,*variants.options,*location_levels,*location_levels.stock_locations"

/** 详情与子路由抽屉共用的 retrieve 查询参数 */
export const inventoryDetailQuery = {
  fields: INVENTORY_DETAIL_FIELDS,
} as const
