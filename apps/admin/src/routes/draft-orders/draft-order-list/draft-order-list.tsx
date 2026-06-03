// @ts-nocheck
import { SingleColumnPage } from "../../../components/layout/pages"
import { useExtension } from "../../../providers/extension-provider"
import { DraftOrderListTable } from "./components/draft-order-list-table"

export const DraftOrderList = () => {
  const { getWidgets } = useExtension()

  return (
    <SingleColumnPage
      widgets={{
        after: getWidgets("draft_order.list.after"),
        before: getWidgets("draft_order.list.before"),
      }}
      hasOutlet={false}
    >
      <DraftOrderListTable />
    </SingleColumnPage>
  )
}
