import type { Loader } from "astro/loaders"

export function noopLoader(name: string): Loader {
  return {
    name,
    load: async ({ store }) => {
      store.clear()
    },
  }
}
