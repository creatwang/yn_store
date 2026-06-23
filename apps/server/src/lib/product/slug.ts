/**
 * Slugify a string into a URL-safe handle.
 *
 * Matches Medusa's `toHandle()`:
 * - Preserves Unicode letters (`\p{L}`) and numbers (`\p{N}`)
 * - Collapses whitespace/underscores into hyphens
 * - Collapses multiple consecutive hyphens
 * - Strips leading/trailing hyphens
 * - Falls back to `product-XXXXXX` when result is empty
 */
export function slugify(text: string): string {
  const handle = text
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")

  if (!handle) {
    return `product-${Math.random().toString(36).substring(2, 8)}`
  }

  return handle
}

/**
 * Generate a unique handle with random suffix.
 * Called when slugified title alone may not be unique.
 */
export function generateUniqueHandle(base: string): string {
  return `${base}-${Math.random().toString(36).substring(2, 8)}`
}
