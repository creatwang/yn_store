// @ts-nocheck
import { LoaderFunctionArgs } from "react-router-dom"
import { productsQueryKeys } from "../../../hooks/api/products"
import { sdk } from "../../../lib/api/client"
import { queryClient } from "../../../lib/query/query-client"

const customerDetailQuery = (id: string) => ({
  queryKey: productsQueryKeys.detail(id),
  queryFn: async () =>
    sdk.admin.customer.retrieve(id, {
      fields: "+*addresses",
    }),
})

export const customerLoader = async ({ params }: LoaderFunctionArgs) => {
  const id = params.id
  const query = customerDetailQuery(id!)

  return queryClient.ensureQueryData(query)
}
