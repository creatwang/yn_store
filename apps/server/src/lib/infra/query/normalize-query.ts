/**
 * Ported from medusajs/medusa v2.15.3
 * packages/core/framework/src/http/utils/validate-query.ts (normalizeQuery)
 */
export function normalizeQuery(
  query: Record<string, unknown>,
): Record<string, unknown> {
  return Object.entries(query).reduce<Record<string, unknown>>(
    (acc, [key, val]) => {
      let normalizedValue = val
      if (Array.isArray(val) && val.length === 1 && typeof val[0] === "string") {
        normalizedValue = val[0].split(",")
      }

      if (key.includes(".")) {
        const [parent, child, ...others] = key.split(".")
        if (others.length > 0) {
          throw new Error(
            `Key accessor more than 2 levels deep: ${key}`,
          )
        }

        const parentVal = acc[parent]
        acc[parent] = {
          ...(typeof parentVal === "object" &&
          parentVal != null &&
          !Array.isArray(parentVal)
            ? (parentVal as Record<string, unknown>)
            : {}),
          [child]: normalizedValue,
        }
      } else {
        acc[key] = normalizedValue
      }

      return acc
    },
    {},
  )
}
