import { useQuery, useQueryClient } from '@tanstack/react-query'
import { authClient } from '@/lib/auth'

export const sessionKey = ['session'] as const

export function useSession() {
  return useQuery({
    queryKey: sessionKey,
    queryFn: async () => {
      const { data } = await authClient.getSession()
      return data?.user ? data : null
    },
    staleTime: 30_000,
  })
}

export function useSignOut() {
  const qc = useQueryClient()
  return async () => {
    await authClient.signOut()
    qc.clear()
  }
}
