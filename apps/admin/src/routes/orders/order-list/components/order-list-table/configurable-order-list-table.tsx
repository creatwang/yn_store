// @ts-nocheck
import { useTranslation } from "react-i18next"
import { Outlet, useLocation } from "react-router-dom"

import { ConfigurableDataTable } from "../../../../../components/table/configurable-data-table"
import { ordersQueryKeys } from "../../../../../hooks/api/orders"
import { useMedusaDataTableBatchDelete } from "../../../../../hooks/table/use-medusa-data-table-batch-delete"
import { sdk } from "../../../../../lib/api/client"
import { queryClient } from "../../../../../lib/query/query-client"
import { useOrderTableAdapter } from "./order-table-adapter"

export const ConfigurableOrderListTable = () => {
  const { t } = useTranslation()
  const location = useLocation()
  const adapter = useOrderTableAdapter()

  const batchDelete = useMedusaDataTableBatchDelete({
    deleteFn: (ids) => sdk.admin.order.batchDelete({ ids }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ordersQueryKeys.lists() }),
    warningKey: "orders.batchDeleteWarning",
    toastPrefix: "orders.toasts.batchDelete",
  })

  return (
    <>
      <ConfigurableDataTable
        adapter={adapter}
        heading={t("orders.domain")}
        actions={[
          {
            label: t("draftOrders.create.createDraftOrder"),
            to: "/draft-orders/create",
          },
          { label: t("actions.export"), to: `export${location.search}` },
        ]}
        commands={batchDelete.commands}
        rowSelection={batchDelete.rowSelection}
      />
      <Outlet />
    </>
  )
}
