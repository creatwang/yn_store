// @ts-nocheck
import { useQuery } from "@tanstack/react-query"
import { authStorage } from "../../lib/auth"
import { sdk } from "../../lib/api/client"

export type FeatureFlags = {
  view_configurations?: boolean
  translation?: boolean
  [key: string]: boolean | undefined
}

/** 与本项目 server feature-flags 默认值对齐 */
export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  translation: true,
  view_configurations: false,
}

export const featureFlagsQueryKey = ["admin", "feature-flags"] as const

export const useFeatureFlags = () => {
  const hasToken = !!authStorage.getToken()

  return useQuery<FeatureFlags>({
    queryKey: featureFlagsQueryKey,
    enabled: hasToken,
    queryFn: async () => {
      const response = await sdk.admin.featureFlags.list()
      return response.feature_flags ?? DEFAULT_FEATURE_FLAGS
    },
    placeholderData: DEFAULT_FEATURE_FLAGS,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}
