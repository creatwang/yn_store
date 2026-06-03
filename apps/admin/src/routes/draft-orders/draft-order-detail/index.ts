// @ts-nocheck
import { createElement } from "react"

import { DraftOrderDetailBreadcrumb } from "./breadcrumb"

export { DraftOrderDetailBreadcrumb as Breadcrumb } from "./breadcrumb"
export { draftOrderLoader as loader } from "./loader"
export { DraftOrderDetail as Component } from "./draft-order-detail"

export const handle = {
  breadcrumb: (match) => createElement(DraftOrderDetailBreadcrumb, match),
}
