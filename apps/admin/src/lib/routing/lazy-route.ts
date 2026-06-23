import { createElement, type ComponentType } from "react"
import type { LazyRouteFunction, NonIndexRouteObject, UIMatch } from "react-router-dom"

type DetailRouteModule = {
  Component: ComponentType
  Breadcrumb?: ComponentType<any>
  loader?: (...args: any[]) => unknown
}

export function lazyDetailRoute(
  importer: () => Promise<DetailRouteModule>,
): LazyRouteFunction<NonIndexRouteObject> {
  const load = async () => {
    const mod = await importer()
    const route: NonIndexRouteObject = {
      Component: mod.Component,
    }

    if (mod.loader) {
      route.loader = mod.loader as NonIndexRouteObject["loader"]
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

  return load as LazyRouteFunction<NonIndexRouteObject>
}
