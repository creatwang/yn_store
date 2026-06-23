import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, parseJsonResponse } from "@/lib/api"
import { authStorage } from "@/lib/auth"
import { featureFlagsQueryKey } from "@/hooks/api/feature-flags"
import type { LoginInput } from "@my-store/validators"

type LoginResponse = {
  token: string
  user: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
  }
}

type SessionResponse = {
  user: LoginResponse["user"]
}

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: LoginInput) => {
      const res = await api.auth.user.emailpass.$post({ json: data })
      const result = await parseJsonResponse<LoginResponse>(res)
      if (!result.token) {
        throw new Error("登录失败")
      }
      authStorage.setToken(result.token)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session"] })
      queryClient.invalidateQueries({ queryKey: featureFlagsQueryKey })
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return () => {
    authStorage.clear()
    queryClient.removeQueries({ queryKey: ["session"] })
    queryClient.clear()
  }
}

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const token = authStorage.getToken()
      if (!token) {
        throw new Error("未登录")
      }
      const res = await api.auth.session.$get()
      return parseJsonResponse<SessionResponse>(res)
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
}
