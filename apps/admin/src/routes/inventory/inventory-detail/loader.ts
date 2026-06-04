// @ts-nocheck
import { LoaderFunctionArgs } from "react-router-dom"

import { inventoryItemsQueryKeys } from "../../../hooks/api/inventory"
import { sdk } from "../../../lib/client"
import { queryClient } from "../../../lib/query-client"
import { inventoryDetailQuery } from "./constants"

const inventoryDetailQueryParams = inventoryDetailQuery

const buildInventoryDetailQuery = (id: string) => ({
  queryKey: inventoryItemsQueryKeys.detail(id, inventoryDetailQueryParams),
  queryFn: async () =>
    sdk.admin.inventoryItem.retrieve(id, inventoryDetailQueryParams),
})

export const inventoryItemLoader = async ({ params }: LoaderFunctionArgs) => {
  const id = params.id
  const query = buildInventoryDetailQuery(id!)

  return queryClient.ensureQueryData(query)
}
