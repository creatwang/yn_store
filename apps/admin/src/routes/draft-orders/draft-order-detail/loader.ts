// @ts-nocheck
import { LoaderFunctionArgs } from "react-router-dom"

import { draftOrdersQueryKeys } from "../../../hooks/api/draft-orders"
import { sdk } from "../../../lib/client"
import { queryClient } from "../../../lib/query-client"

const draftOrderDetailQuery = (id: string) => ({
  queryKey: draftOrdersQueryKeys.detail(id),
  queryFn: async () => sdk.admin.draftOrder.retrieve(id),
})

export const draftOrderLoader = async ({ params }: LoaderFunctionArgs) => {
  const id = params.id
  const query = draftOrderDetailQuery(id!)

  return queryClient.ensureQueryData(query)
}
