/**
 * Global settings cache utility for caching API settings
 * Used to avoid repeated API calls and provide sync access to settings
 */

import { SystemSettings } from '@/types'
import { settingsApi } from '@/services/api'

// Cache for settings to avoid repeated API calls
let settingsCache: { data: SystemSettings | null; lastFetch: number } | null = null
const CACHE_DURATION = 60000 // 1 minute

/**
 * Get settings from cache or fetch from API
 * Uses caching to minimize API calls
 */
export async function getCachedSettings(): Promise<SystemSettings | null> {
  const now = Date.now()

  // Return cached value if available and fresh
  if (settingsCache && settingsCache.data && now - settingsCache.lastFetch < CACHE_DURATION) {
    return settingsCache.data
  }

  try {
    const settings = await settingsApi.getSettings()
    settingsCache = {
      data: settings,
      lastFetch: now,
    }
    return settings
  } catch (error) {
    console.error('Failed to fetch settings:', error)
    return settingsCache?.data || null
  }
}

/**
 * Get settings from cache synchronously
 * Returns null if no cached settings available
 */
export function getCachedSettingsSync(): SystemSettings | null {
  return settingsCache?.data || null
}

/**
 * Get timezone from settings with fallback chain:
 * 1. API settings (cached)
 * 2. LocalStorage settings
 * 3. Default (America/Los_Angeles)
 */
export function getUserTimezone(): string {
  // Try cached API settings first
  const apiSettings = getCachedSettingsSync()
  if (apiSettings?.timezone) {
    return apiSettings.timezone
  }

  // Fall back to localStorage
  try {
    const storedSettings = localStorage.getItem('gateAccessSettings')
    if (storedSettings) {
      const settings = JSON.parse(storedSettings) as { timezone?: string }
      if (settings.timezone) {
        return settings.timezone
      }
    }
  } catch {
    // Ignore parse errors
  }

  // Default timezone
  return 'America/Los_Angeles'
}

/**
 * Clear the settings cache
 * Useful when settings are updated
 */
export function clearSettingsCache(): void {
  settingsCache = null
}

/**
 * Preload settings into cache
 * Call this on app initialization or after settings update
 */
export async function preloadSettings(): Promise<void> {
  await getCachedSettings()
}

/**
 * Update the cache with new settings
 * Use this after saving settings to avoid refetch
 */
export function updateSettingsCache(settings: SystemSettings): void {
  settingsCache = {
    data: settings,
    lastFetch: Date.now(),
  }
}
