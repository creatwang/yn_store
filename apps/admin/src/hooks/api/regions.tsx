// @ts-nocheck
import { HttpTypes, PaginatedResponse } from "@medusajs/types"
import {
  QueryKey,
  UseMutationOptions,
  UseQueryOptions,
  useMutation,
  useQuery,
} from "@tanstack/react-query"
import { sdk } from "../../lib/api/client"
import { queryClient } from "../../lib/query/query-client"
import { queryKeysFactory } from "../../lib/query/query-key-factory"
import { pricePreferencesQueryKeys } from "./price-preferences"
import { FetchError } from "@medusajs/js-sdk"

const REGIONS_QUERY_KEY = "regions" as const
export const regionsQueryKeys = queryKeysFactory(REGIONS_QUERY_KEY)

type RegionListCache = PaginatedResponse<{ regions: HttpTypes.AdminRegion[] }>

async function refreshRegionLists(deletedId?: string) {
  if (deletedId) {
    queryClient.setQueriesData<RegionListCache>(
      { queryKey: regionsQueryKeys.lists() },
      (old) => {
        if (!old?.regions) {
          return old
        }
        const regions = old.regions.filter((region) => region.id !== deletedId)
        const removed = old.regions.length - regions.length
        return {
          ...old,
          regions,
          count:
            typeof old.count === "number"
              ? Math.max(0, old.count - removed)
              : regions.length,
        }
      },
    )
  }

  await queryClient.invalidateQueries({ queryKey: regionsQueryKeys.lists() })
  await queryClient.refetchQueries({
    queryKey: regionsQueryKeys.lists(),
    type: "active",
  })
}

export const useRegion = (
  id: string,
  query?: Record<string, any>,
  options?: Omit<
    UseQueryOptions<
      { region: HttpTypes.AdminRegion },
      FetchError,
      { region: HttpTypes.AdminRegion },
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: regionsQueryKeys.detail(id, query),
    queryFn: async () => sdk.admin.region.retrieve(id, query),
    ...options,
  })

  return { ...data, ...rest }
}

export const useRegions = (
  query?: Record<string, any>,
  options?: Omit<
    UseQueryOptions<
      PaginatedResponse<{ regions: HttpTypes.AdminRegion[] }>,
      FetchError,
      PaginatedResponse<{ regions: HttpTypes.AdminRegion[] }>,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryFn: () => sdk.admin.region.list(query),
    queryKey: regionsQueryKeys.list(query),
    ...options,
  })

  return { ...data, ...rest }
}

export const useCreateRegion = (
  options?: UseMutationOptions<
    { region: HttpTypes.AdminRegion },
    FetchError,
    HttpTypes.AdminCreateRegion
  >
) => {
  return useMutation({
    ...options,
    mutationFn: (payload) => sdk.admin.region.create(payload),
    onSuccess: (data, variables, context) => {
      void refreshRegionLists()

      queryClient.invalidateQueries({
        queryKey: pricePreferencesQueryKeys.list(),
      })
      queryClient.invalidateQueries({
        queryKey: pricePreferencesQueryKeys.details(),
      })

      options?.onSuccess?.(data, variables, context)
    },
  })
}

export const useUpdateRegion = (
  id: string,
  options?: UseMutationOptions<
    { region: HttpTypes.AdminRegion },
    FetchError,
    HttpTypes.AdminUpdateRegion
  >
) => {
  return useMutation({
    ...options,
    mutationFn: (payload) => sdk.admin.region.update(id, payload),
    onSuccess: (data, variables, context) => {
      void refreshRegionLists()
      queryClient.invalidateQueries({ queryKey: regionsQueryKeys.details() })

      queryClient.invalidateQueries({
        queryKey: pricePreferencesQueryKeys.list(),
      })
      queryClient.invalidateQueries({
        queryKey: pricePreferencesQueryKeys.details(),
      })

      options?.onSuccess?.(data, variables, context)
    },
  })
}

export const useDeleteRegion = (
  id: string,
  options?: UseMutationOptions<
    HttpTypes.AdminRegionDeleteResponse,
    FetchError,
    void
  >
) => {
  return useMutation({
    ...options,
    mutationFn: () => sdk.admin.region.delete(id),
    onSuccess: (data, variables, context) => {
      void refreshRegionLists(id)
      queryClient.removeQueries({ queryKey: regionsQueryKeys.detail(id) })

      options?.onSuccess?.(data, variables, context)
    },
  })
}
