// @ts-nocheck
import { LoaderFunctionArgs } from "react-router-dom"

import { productTypesQueryKeys } from "../../../hooks/api/product-types"
import { sdk } from "../../../lib/api/client"
import { queryClient } from "../../../lib/query/query-client"

const productTypeDetailQuery = (id: string) => ({
  queryKey: productTypesQueryKeys.detail(id),
  queryFn: async () => sdk.admin.productType.retrieve(id),
})

export const productTypeLoader = async ({ params }: LoaderFunctionArgs) => {
  const id = params.id
  const query = productTypeDetailQuery(id!)

  return queryClient.ensureQueryData(query)
}
