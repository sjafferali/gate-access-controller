import { useQuery } from '@tanstack/react-query'
import { authApi } from '@/services/api'
import type { User } from '@/types'

/**
 * Hook to get current user information
 *
 * This hook fetches the current user from the backend and caches it.
 * It automatically retries on failure and refetches when the window gains focus.
 */
export function useUser() {
  return useQuery<User>({
    queryKey: ['currentUser'],
    queryFn: () => authApi.getCurrentUser(),
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    retry: 1, // Only retry once on failure
  })
}
