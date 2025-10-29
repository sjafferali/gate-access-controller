/**
 * Utility functions for generating access link URLs with configured domains
 */

import { settingsApi } from '@/services/api'

// Cache for settings to avoid repeated API calls
let settingsCache: { links_url: string | null; lastFetch: number } | null = null
const CACHE_DURATION = 60000 // 1 minute

/**
 * Get the configured links URL domain from settings
 * Uses caching to minimize API calls
 */
async function getLinksUrlDomain(): Promise<string | null> {
  const now = Date.now()

  // Return cached value if available and fresh
  if (settingsCache && now - settingsCache.lastFetch < CACHE_DURATION) {
    return settingsCache.links_url
  }

  try {
    const settings = await settingsApi.getSettings()
    settingsCache = {
      links_url: settings.links_url,
      lastFetch: now,
    }
    return settings.links_url
  } catch (error) {
    console.error('Failed to fetch settings for links URL:', error)
    return null
  }
}

/**
 * Generate the full URL for an access link
 * If links_url is configured, uses that domain. Otherwise, uses current domain.
 *
 * @param linkCode - The access link code
 * @returns Full URL for the access link (e.g., "http://x.com/ABC123" or "https://x.com/ABC123")
 */
export async function generateLinkUrl(linkCode: string): Promise<string> {
  const linksUrl = await getLinksUrlDomain()

  if (linksUrl) {
    // Use configured links URL domain
    // Respect the protocol if specified, don't force HTTPS
    let domain: string
    if (linksUrl.startsWith('http://') || linksUrl.startsWith('https://')) {
      // Protocol already specified, use as-is
      domain = linksUrl
    } else {
      // No protocol specified, default to https for security
      // but allow users to explicitly specify http:// if needed
      domain = `https://${linksUrl}`
    }
    // Remove trailing slash if present
    const baseDomain = domain.replace(/\/$/, '')
    return `${baseDomain}/l/${linkCode}`
  }

  // Fall back to current domain
  const currentDomain = window.location.origin
  return `${currentDomain}/l/${linkCode}`
}

/**
 * Synchronous version that uses cached settings only
 * Use this when you need immediate URL generation without async
 * Falls back to current domain if no cached settings available
 *
 * @param linkCode - The access link code
 * @returns Full URL for the access link
 */
export function generateLinkUrlSync(linkCode: string): string {
  const linksUrl = settingsCache?.links_url

  if (linksUrl) {
    // Use configured links URL domain
    // Respect the protocol if specified, don't force HTTPS
    let domain: string
    if (linksUrl.startsWith('http://') || linksUrl.startsWith('https://')) {
      // Protocol already specified, use as-is
      domain = linksUrl
    } else {
      // No protocol specified, default to https for security
      // but allow users to explicitly specify http:// if needed
      domain = `https://${linksUrl}`
    }
    const baseDomain = domain.replace(/\/$/, '')
    return `${baseDomain}/l/${linkCode}`
  }

  // Fall back to current domain
  const currentDomain = window.location.origin
  return `${currentDomain}/l/${linkCode}`
}

/**
 * Clear the settings cache
 * Useful when settings are updated
 */
export function clearLinkUrlCache(): void {
  settingsCache = null
}

/**
 * Preload the links URL settings into cache
 * Call this on app initialization or after settings update
 */
export async function preloadLinkUrlSettings(): Promise<void> {
  await getLinksUrlDomain()
}
