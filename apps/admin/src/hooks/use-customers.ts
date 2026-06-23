import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, parseJsonResponse, toRpcQuery } from "@/lib/api/api"
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
} from "@my-store/validators"
import type { AdminCustomersParamsType } from "@my-store/validators/admin-list-params"
import type {
  CustomerDetailResponse,
  CustomerListResponse,
} from "@/types/api"

const defaultListQuery: AdminCustomersParamsType = {
  limit: 50,
  offset: 0,
  order: undefined,
}

export function useCustomers(
  params: AdminCustomersParamsType = defaultListQuery,
) {
  return useQuery({
    queryKey: ["customers", params],
    queryFn: async () => {
      const res = await api.admin.customers.$get({ query: toRpcQuery(params) })
      return parseJsonResponse<CustomerListResponse>(res)
    },
  })
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ["customer", id],
    queryFn: async () => {
      const res = await api.admin.customers[":id"].$get({ param: { id } })
      return parseJsonResponse<CustomerDetailResponse>(res)
    },
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateCustomerInput) => {
      const res = await api.admin.customers.$post({ json: data })
      return parseJsonResponse<CustomerDetailResponse>(res)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] })
    },
  })
}

export function useUpdateCustomer(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UpdateCustomerInput) => {
      const res = await api.admin.customers[":id"].$post({ param: { id }, json: data })
      return parseJsonResponse<CustomerDetailResponse>(res)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] })
      queryClient.invalidateQueries({ queryKey: ["customer", id] })
    },
  })
}
