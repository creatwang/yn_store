// @ts-nocheck
import { LoaderFunctionArgs } from "react-router-dom"

import { categoriesQueryKeys } from "../../../hooks/api/categories"
import { sdk } from "../../../lib/api/client"
import { queryClient } from "../../../lib/query/query-client"

const categoryDetailQuery = (id: string) => ({
  queryKey: categoriesQueryKeys.detail(id),
  queryFn: async () => sdk.admin.productCategory.retrieve(id),
})

export const categoryLoader = async ({ params }: LoaderFunctionArgs) => {
  const id = params.id
  const query = categoryDetailQuery(id!)

  return queryClient.ensureQueryData(query)
}
