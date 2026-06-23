import { createElement } from "react"
import type { UIMatch } from "react-router-dom"

type DetailRouteModule = {
  Component: React.ComponentType
  Breadcrumb?: React.ComponentType<UIMatch>
  loader?: (...args: unknown[]) => unknown
}

export function lazyDetailRoute(importer: () => Promise<DetailRouteModule>) {
  return async () => {
    const mod = await importer()
    const route: {
      Component: React.ComponentType
      loader?: (...args: unknown[]) => unknown
      handle?: { breadcrumb: (match?: UIMatch) => ReturnType<typeof createElement> }
    } = {
      Component: mod.Component,
    }

    if (mod.loader) {
      route.loader = mod.loader
    }

    if (mod.Breadcrumb) {
      const Breadcrumb = mod.Breadcrumb
      route.handle = {
        breadcrumb: (match?: UIMatch) =>
          createElement(Breadcrumb, (match ?? {}) as UIMatch),
      }
    }

    return route
  }
}
