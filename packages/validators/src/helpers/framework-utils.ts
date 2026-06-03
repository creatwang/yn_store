/** Enums & helpers from @medusajs/utils@2.15.3 — used by synced validators */

export enum ProductStatus {
  DRAFT = "draft",
  PROPOSED = "proposed",
  PUBLISHED = "published",
  REJECTED = "rejected",
}

export enum OrderStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  DRAFT = "draft",
  ARCHIVED = "archived",
  CANCELED = "canceled",
  REQUIRES_ACTION = "requires_action",
}

export enum ReturnStatus {
  OPEN = "open",
  REQUESTED = "requested",
  RECEIVED = "received",
  PARTIALLY_RECEIVED = "partially_received",
  CANCELED = "canceled",
}

export enum ClaimType {
  REFUND = "refund",
  REPLACE = "replace",
}

export enum ClaimReason {
  MISSING_ITEM = "missing_item",
  WRONG_ITEM = "wrong_item",
  PRODUCTION_FAILURE = "production_failure",
  OTHER = "other",
}

export enum PromotionType {
  STANDARD = "standard",
  BUYGET = "buyget",
}

export enum PromotionStatus {
  DRAFT = "draft",
  ACTIVE = "active",
  INACTIVE = "inactive",
}

export enum ApplicationMethodType {
  FIXED = "fixed",
  PERCENTAGE = "percentage",
}

export enum ApplicationMethodTargetType {
  ORDER = "order",
  SHIPPING_METHODS = "shipping_methods",
  ITEMS = "items",
}

export enum ApplicationMethodAllocation {
  EACH = "each",
  ACROSS = "across",
  ONCE = "once",
}

export enum PromotionRuleOperator {
  GTE = "gte",
  LTE = "lte",
  GT = "gt",
  LT = "lt",
  EQ = "eq",
  NE = "ne",
  IN = "in",
}

export enum CampaignBudgetType {
  SPEND = "spend",
  USAGE = "usage",
  USE_BY_ATTRIBUTE = "use_by_attribute",
  SPEND_BY_ATTRIBUTE = "spend_by_attribute",
}

export enum PricingRuleOperator {
  GTE = "gte",
  LTE = "lte",
  GT = "gt",
  LT = "lt",
  EQ = "eq",
}

export enum RuleOperator {
  IN = "in",
  EQ = "eq",
  NE = "ne",
  GT = "gt",
  GTE = "gte",
  LT = "lt",
  LTE = "lte",
  NIN = "nin",
}

export enum ShippingOptionPriceType {
  CALCULATED = "calculated",
  FLAT = "flat",
}

export enum ApiKeyType {
  PUBLISHABLE = "publishable",
  SECRET = "secret",
}

export enum PriceListStatus {
  DRAFT = "draft",
  ACTIVE = "active",
}

export enum PriceListType {
  SALE = "sale",
  OVERRIDE = "override",
}

export enum TransactionHandlerType {
  INVOKE = "invoke",
  COMPENSATE = "compensate",
}

export function isDefined<T>(val: T): val is NonNullable<T> {
  return val !== undefined && val !== null
}

export function isString(val: unknown): val is string {
  return val != null && typeof val === "string"
}

export function isPresent(value: unknown): boolean {
  if (value === undefined || value === null) return false
  if (isString(value) || Array.isArray(value)) return value.length > 0
  if (value instanceof Map || value instanceof Set) return value.size > 0
  if (typeof value === "object") return Object.keys(value as object).length > 0
  return true
}
