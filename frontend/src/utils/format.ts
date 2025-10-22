import { LinkStatus } from '../types'

/**
 * Format a LinkStatus enum value for display with proper capitalization
 * @param status - The LinkStatus enum value to format
 * @returns Capitalized status string for display
 */
export function formatLinkStatus(status: LinkStatus): string {
  const statusLabels: Record<LinkStatus, string> = {
    [LinkStatus.ACTIVE]: 'ACTIVE',
    [LinkStatus.INACTIVE]: 'INACTIVE',
    [LinkStatus.DISABLED]: 'DISABLED',
  }
  return statusLabels[status] || status
}

/**
 * Format a datetime string in the user's timezone with friendly formatting
 * @param dateString - ISO datetime string to format
 * @returns Formatted datetime string like "October 23, 2025 at 10:44 AM EDT"
 */
export function formatDateTimeInUserTimezone(dateString: string): string {
  try {
    // Load timezone from localStorage
    const storedSettings = localStorage.getItem('gateAccessSettings')
    let timezone = 'America/New_York' // Default to Eastern Time

    if (storedSettings) {
      try {
        const settings = JSON.parse(storedSettings) as { timezone?: string }
        timezone = settings.timezone ?? 'America/New_York'
      } catch {
        console.error('Failed to parse settings from localStorage')
      }
    }

    // Parse the date
    const date = new Date(dateString)

    // Format options for Intl.DateTimeFormat
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone,
      timeZoneName: 'short',
    }

    // Format the date in the user's timezone
    const formatter = new Intl.DateTimeFormat('en-US', options)
    const formatted = formatter.format(date)

    // Replace the second comma (before time) with " at" for better readability
    // "October 23, 2025, 10:44 AM EDT" → "October 23, 2025 at 10:44 AM EDT"
    const parts = formatted.split(', ')
    if (parts.length >= 3) {
      return `${parts[0]}, ${parts[1]} at ${parts.slice(2).join(', ')}`
    }
    return formatted
  } catch (error) {
    console.error('Error formatting datetime:', error)
    // Fallback to simple formatting if anything goes wrong
    return new Date(dateString).toLocaleString()
  }
}
