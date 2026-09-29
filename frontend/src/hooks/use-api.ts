import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ApiKey, CreatedApiKey, Email, EmailStatus, Page, Usage } from '@/lib/types'

export function useApiKeys() {
  return useQuery({
    queryKey: ['api-keys'],
    queryFn: () => api<{ data: ApiKey[] }>('/dashboard/api-keys').then((r) => r.data),
  })
}

export function useCreateApiKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => api<CreatedApiKey>('/dashboard/api-keys', { method: 'POST', body: { name } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['api-keys'] }),
  })
}

export function useRevokeApiKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api<void>(`/dashboard/api-keys/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['api-keys'] }),
  })
}

export function useEmails(status?: EmailStatus) {
  return useInfiniteQuery({
    queryKey: ['emails', status ?? 'all'],
    initialPageParam: '',
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '20' })
      if (status) params.set('status', status)
      if (pageParam) params.set('cursor', pageParam)
      return api<Page<Email>>(`/dashboard/emails?${params}`)
    },
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    // Queued emails change status within seconds, so keep the list fresh while it's open.
    refetchInterval: 5_000,
  })
}

export function useUsage() {
  return useQuery({
    queryKey: ['usage'],
    queryFn: () => api<Usage>('/dashboard/usage'),
  })
}

export function useSendTestEmail() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api<{ data: { id: string }[] }>('/dashboard/test-email', { method: 'POST' }),
    // Refresh usage on failure too: a 429 means the count is already at the limit.
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['emails'] })
      qc.invalidateQueries({ queryKey: ['usage'] })
    },
  })
}
