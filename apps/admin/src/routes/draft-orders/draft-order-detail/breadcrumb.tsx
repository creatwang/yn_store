// @ts-nocheck
import { UIMatch } from "react-router-dom"

import { useDraftOrder } from "../../../hooks/api/draft-orders"

type DraftOrderDetailBreadcrumbProps = UIMatch<{
  draft_order: { display_id?: number | string | null }
}>

export const DraftOrderDetailBreadcrumb = (
  props: DraftOrderDetailBreadcrumbProps,
) => {
  const { id } = props.params || {}

  const { draft_order } = useDraftOrder(id!, {
    initialData: props.data,
    enabled: Boolean(id),
  })

  if (!draft_order) {
    return null
  }

  return <span>#{draft_order.display_id}</span>
}
