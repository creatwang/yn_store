/** Medusa 默认可翻译 entity 及全部候选字段 */
export const ENTITY_FIELD_CATALOG: Record<string, string[]> = {
  product: ["title", "subtitle", "description", "material"],
  product_variant: ["title"],
  product_collection: ["title"],
  product_category: ["name", "description"],
  product_tag: ["value"],
  product_type: ["value"],
}

export const TRANSLATABLE_ENTITY_TYPES = Object.keys(ENTITY_FIELD_CATALOG)

export function getInactiveFields(entityType: string, activeFields: string[]): string[] {
  const catalog = ENTITY_FIELD_CATALOG[entityType] ?? []
  const active = new Set(activeFields)
  return catalog.filter((f) => !active.has(f))
}
