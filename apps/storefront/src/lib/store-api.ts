const API_BASE =
  (typeof process !== "undefined" ? process.env.PUBLIC_API_URL : undefined) ||
  import.meta.env.PUBLIC_API_URL ||
  "http://localhost:9000"

export function storeApiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`
  return `${API_BASE}/api${p}`
}

export async function fetchStoreJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(storeApiUrl(path), init)
  if (!res.ok) {
    throw new Error(`Store API ${res.status}: ${path}`)
  }
  return res.json() as Promise<T>
}

export async function fetchAllPaginated<T>(
  path: string,
  key: string,
  limit = 100,
): Promise<T[]> {
  const all: T[] = []
  let offset = 0

  for (;;) {
    const sep = path.includes("?") ? "&" : "?"
    const body = await fetchStoreJson<Record<string, unknown>>(
      `${path}${sep}limit=${limit}&offset=${offset}`,
    )
    const batch = (body[key] ?? []) as T[]
    all.push(...batch)
    if (batch.length < limit) break
    offset += limit
  }

  return all
}
