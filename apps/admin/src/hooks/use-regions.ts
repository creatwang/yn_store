import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, parseJsonResponse, toRpcQuery } from "@/lib/api/api"
import type {
  CreateRegionInput,
  UpdateRegionInput,
  CreateSalesChannelInput,
  UpdateSalesChannelInput,
} from "@my-store/validators"
import type {
  AdminGetRegionsParamsType,
  AdminGetSalesChannelsParamsType,
} from "@my-store/validators/admin-list-params"

const defaultListQuery: AdminGetRegionsParamsType = {
  limit: 50,
  offset: 0,
  order: undefined,
}
const defaultSalesChannelQuery: AdminGetSalesChannelsParamsType = {
  limit: 50,
  offset: 0,
  order: undefined,
}

export function useRegions(params: AdminGetRegionsParamsType = defaultListQuery) {
  return useQuery({
    queryKey: ["regions", params],
    queryFn: async () => {
      const res = await api.admin.regions.$get({ query: toRpcQuery(params) })
      return parseJsonResponse(res)
    },
  })
}

export function useRegion(id: string) {
  return useQuery({
    queryKey: ["region", id],
    queryFn: async () => {
      const res = await api.admin.regions[":id"].$get({ param: { id } })
      return parseJsonResponse(res)
    },
  })
}

export function useCreateRegion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateRegionInput) => {
      const res = await api.admin.regions.$post({ json: data })
      return parseJsonResponse(res)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["regions"] })
    },
  })
}

export function useUpdateRegion(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UpdateRegionInput) => {
      const res = await api.admin.regions[":id"].$post({ param: { id }, json: data })
      return parseJsonResponse(res)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["regions"] })
      queryClient.invalidateQueries({ queryKey: ["region", id] })
    },
  })
}

export function useDeleteRegion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.admin.regions[":id"].$delete({ param: { id } })
      return parseJsonResponse(res)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["regions"] })
    },
  })
}

export function useSalesChannels(
  params: AdminGetSalesChannelsParamsType = defaultSalesChannelQuery,
) {
  return useQuery({
    queryKey: ["sales-channels", params],
    queryFn: async () => {
      const res = await api.admin["sales-channels"].$get({ query: toRpcQuery(params) })
      return parseJsonResponse(res)
    },
  })
}

export function useSalesChannel(id: string) {
  return useQuery({
    queryKey: ["sales-channel", id],
    queryFn: async () => {
      const res = await api.admin["sales-channels"][":id"].$get({ param: { id } })
      return parseJsonResponse(res)
    },
  })
}

export function useCreateSalesChannel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateSalesChannelInput) => {
      const res = await api.admin["sales-channels"].$post({ json: data })
      return parseJsonResponse(res)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-channels"] })
    },
  })
}

export function useUpdateSalesChannel(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UpdateSalesChannelInput) => {
      const res = await api.admin["sales-channels"][":id"].$post({ param: { id }, json: data })
      return parseJsonResponse(res)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-channels"] })
      queryClient.invalidateQueries({ queryKey: ["sales-channel", id] })
    },
  })
}

export function useDeleteSalesChannel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.admin["sales-channels"][":id"].$delete({ param: { id } })
      return parseJsonResponse(res)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-channels"] })
    },
  })
}
