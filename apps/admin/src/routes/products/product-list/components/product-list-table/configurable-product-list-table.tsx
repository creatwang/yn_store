// @ts-nocheck
import { useTranslation } from "react-i18next"
import { Outlet, useLocation } from "react-router-dom"

import { ConfigurableDataTable } from "../../../../../components/table/configurable-data-table"
import { productsQueryKeys } from "../../../../../hooks/api/products"
import { useMedusaDataTableBatchDelete } from "../../../../../hooks/table/use-medusa-data-table-batch-delete"
import { sdk } from "../../../../../lib/api/client"
import { queryClient } from "../../../../../lib/query/query-client"
import { useProductTableAdapter } from "./product-table-adapter"

export const ConfigurableProductListTable = () => {
  const { t } = useTranslation()
  const location = useLocation()
  const adapter = useProductTableAdapter()

  const batchDelete = useMedusaDataTableBatchDelete({
    deleteFn: (ids) => sdk.admin.product.batchDelete({ ids }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: productsQueryKeys.lists() }),
    warningKey: "products.batchDeleteWarning",
    toastPrefix: "products.toasts.batchDelete",
  })

  return (
    <>
      <ConfigurableDataTable
        adapter={adapter}
        heading={t("products.domain")}
        actions={[
          { label: t("actions.export"), to: `export${location.search}` },
          { label: t("actions.import"), to: `import${location.search}` },
          { label: t("actions.create"), to: "create" },
        ]}
        commands={batchDelete.commands}
        rowSelection={batchDelete.rowSelection}
      />
      <Outlet />
    </>
  )
}
