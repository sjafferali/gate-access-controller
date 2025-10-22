import { LinkStatus } from '../types'

/**
 * Format a LinkStatus enum value for display with proper capitalization
 * @param status - The LinkStatus enum value to format
 * @returns Capitalized status string for display
 */
export function formatLinkStatus(status: LinkStatus): string {
  const statusLabels: Record<LinkStatus, string> = {
    [LinkStatus.ACTIVE]: 'Active',
    [LinkStatus.INACTIVE]: 'Inactive',
    [LinkStatus.DISABLED]: 'Disabled',
  }
  return statusLabels[status] || status
}
