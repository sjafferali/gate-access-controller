import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  FiSettings,
  FiGlobe,
  FiClock,
  FiShield,
  FiMail,
  FiSave,
  FiRefreshCw,
  FiDatabase,
  FiLink,
  FiBell,
  FiAlertCircle,
  FiLock,
  FiKey,
} from 'react-icons/fi'
import SearchableSelect from '@/components/form/SearchableSelect'
import { settingsApi } from '@/services/api'
import { clearLinkUrlCache } from '@/utils/linkUrl'

interface SettingsData {
  // General Settings
  siteName: string
  timezone: string
  dateFormat: string
  timeFormat: string

  // URL Configuration
  adminUrl: string
  linksUrl: string

  // Access Link Defaults
  defaultExpirationHours: number
  defaultMaxUses: number
  autoDeleteExpiredLinks: boolean
  autoDeleteAfterDays: number

  // Security Settings
  webhookUrl: string
  webhookTimeout: number
  webhookRetries: number
  ipWhitelist: string
  requireAuthentication: boolean

  // OIDC Authentication Settings
  oidcEnabled: boolean
  oidcIssuer: string
  oidcClientId: string
  oidcClientSecret: string
  oidcRedirectUri: string
  oidcScopes: string

  // Notification Settings
  emailNotifications: boolean
  notificationEmail: string
  notifyOnNewLink: boolean
  notifyOnAccess: boolean
  notifyOnDeniedAccess: boolean

  // Data Management
  logRetentionDays: number
  enableDetailedLogging: boolean
  enableGeoLocation: boolean
}

const defaultSettings: SettingsData = {
  // General
  siteName: 'Gate Access Controller',
  timezone: 'America/New_York',
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '12h',

  // URL Configuration
  adminUrl: '',
  linksUrl: '',

  // Access Link Defaults
  defaultExpirationHours: 24,
  defaultMaxUses: 1,
  autoDeleteExpiredLinks: false,
  autoDeleteAfterDays: 30,

  // Security
  webhookUrl: '',
  webhookTimeout: 5000,
  webhookRetries: 3,
  ipWhitelist: '',
  requireAuthentication: false,

  // OIDC Authentication
  oidcEnabled: false,
  oidcIssuer: '',
  oidcClientId: '',
  oidcClientSecret: '',
  oidcRedirectUri: '',
  oidcScopes: 'openid,profile,email',

  // Notifications
  emailNotifications: false,
  notificationEmail: '',
  notifyOnNewLink: false,
  notifyOnAccess: true,
  notifyOnDeniedAccess: true,

  // Data Management
  logRetentionDays: 90,
  enableDetailedLogging: true,
  enableGeoLocation: true,
}

export default function Settings() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeSection, setActiveSection] = useState('general')
  const [initialOidcEnabled, setInitialOidcEnabled] = useState<boolean>(false)

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<SettingsData>({
    defaultValues: defaultSettings,
  })

  const emailNotifications = watch('emailNotifications')
  const autoDeleteExpiredLinks = watch('autoDeleteExpiredLinks')
  const oidcEnabled = watch('oidcEnabled')

  // Load settings from API and localStorage on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Load webhook settings from API
        const apiSettings = await settingsApi.getSettings()

        // Load other settings from localStorage
        const storedSettings = localStorage.getItem('gateAccessSettings')
        let localSettings = {}
        if (storedSettings) {
          try {
            localSettings = JSON.parse(storedSettings) as Partial<SettingsData>
          } catch {
            console.error('Failed to parse localStorage settings')
          }
        }

        // Merge settings: localStorage for non-webhook/OIDC settings, API for webhook and OIDC settings
        const mergedSettings = {
          ...defaultSettings,
          ...localSettings,
          webhookUrl: apiSettings.webhook_url || '',
          webhookTimeout: apiSettings.webhook_timeout * 1000, // Convert seconds to ms for UI
          webhookRetries: apiSettings.webhook_retries,
          adminUrl: apiSettings.admin_url || '',
          linksUrl: apiSettings.links_url || '',
          oidcEnabled: apiSettings.oidc_enabled || false,
          oidcIssuer: apiSettings.oidc_issuer || '',
          oidcClientId: apiSettings.oidc_client_id || '',
          oidcClientSecret: '', // Never populate from API (write-only)
          oidcRedirectUri: apiSettings.oidc_redirect_uri || '',
          oidcScopes: apiSettings.oidc_scopes || 'openid,profile,email',
        }

        // Track initial OIDC enabled state
        setInitialOidcEnabled(apiSettings.oidc_enabled || false)

        reset(mergedSettings)
      } catch (error) {
        console.error('Failed to load settings from API:', error)
        // Fall back to localStorage only
        const storedSettings = localStorage.getItem('gateAccessSettings')
        if (storedSettings) {
          try {
            const parsed = JSON.parse(storedSettings) as Partial<SettingsData>
            reset({ ...defaultSettings, ...parsed })
          } catch {
            console.error('Failed to load settings')
          }
        }
      }
    }

    void loadSettings()
  }, [reset])

  const timezoneOptions = [
    { value: 'America/New_York', label: 'Eastern Time (EST/EDT)' },
    { value: 'America/Chicago', label: 'Central Time (CST/CDT)' },
    { value: 'America/Denver', label: 'Mountain Time (MST/MDT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PST/PDT)' },
    { value: 'UTC', label: 'UTC' },
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEDT/AEST)' },
  ]

  const dateFormatOptions = [
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
    { value: 'DD.MM.YYYY', label: 'DD.MM.YYYY' },
  ]

  const timeFormatOptions = [
    { value: '12h', label: '12-hour (AM/PM)' },
    { value: '24h', label: '24-hour' },
  ]

  const onSubmit = async (data: SettingsData) => {
    setIsSubmitting(true)

    // Check if OIDC enabled state changed
    const oidcEnabledChanged = data.oidcEnabled !== initialOidcEnabled

    try {
      // Save webhook, URL, and OIDC settings to API
      await settingsApi.saveSettings({
        webhook_url: data.webhookUrl || null,
        webhook_token: null, // Not exposed in UI yet, could be added later
        webhook_timeout: Math.floor(data.webhookTimeout / 1000), // Convert ms to seconds
        webhook_retries: data.webhookRetries,
        gate_open_duration_seconds: 5, // Default for now
        admin_url: data.adminUrl || null,
        links_url: data.linksUrl || null,
        oidc_enabled: data.oidcEnabled,
        oidc_issuer: data.oidcIssuer || null,
        oidc_client_id: data.oidcClientId || null,
        oidc_client_secret: data.oidcClientSecret || null, // Only send if changed
        oidc_redirect_uri: data.oidcRedirectUri || null,
        oidc_scopes: data.oidcScopes || null,
      })

      // Save other settings to localStorage
      localStorage.setItem('gateAccessSettings', JSON.stringify(data))

      // Clear the link URL cache so new settings take effect
      clearLinkUrlCache()

      toast.success('Settings saved successfully')

      // Update initial OIDC state for future comparisons
      setInitialOidcEnabled(data.oidcEnabled)
      reset(data) // Reset form to mark as not dirty

      // If OIDC enabled state changed, reload the page to refresh authentication state
      if (oidcEnabledChanged) {
        toast.success('Authentication settings changed. Reloading page...')
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all settings to defaults?')) {
      reset(defaultSettings)
      localStorage.removeItem('gateAccessSettings')
      toast.success('Settings reset to defaults')
    }
  }

  const sections = [
    { id: 'general', name: 'General', icon: FiGlobe },
    { id: 'urls', name: 'URL Configuration', icon: FiLink },
    { id: 'defaults', name: 'Link Defaults', icon: FiLink },
    { id: 'security', name: 'Security', icon: FiShield },
    { id: 'authentication', name: 'Authentication', icon: FiLock },
    { id: 'notifications', name: 'Notifications', icon: FiBell },
    { id: 'data', name: 'Data Management', icon: FiDatabase },
  ]

  return (
    <div className="mx-auto max-w-6xl">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="flex items-center text-3xl font-bold text-gray-900">
          <FiSettings className="mr-3 text-primary-600" />
          Settings
        </h1>
        <p className="mt-2 text-base text-gray-600">
          Configure your gate access controller settings and preferences
        </p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <div className="w-64 flex-shrink-0">
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex w-full items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  activeSection === section.id
                    ? 'bg-primary-100 text-primary-900'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <section.icon className="mr-3 h-5 w-5" />
                {section.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Settings Form */}
        <div className="flex-1">
          <form
            onSubmit={(e) => {
              void handleSubmit(onSubmit)(e)
            }}
            className="space-y-8"
          >
            {/* General Settings */}
            {activeSection === 'general' && (
              <div className="card">
                <div className="mb-6 border-b border-gray-200 pb-4">
                  <h2 className="flex items-center text-lg font-semibold text-gray-900">
                    <FiGlobe className="mr-2 text-primary-600" />
                    General Settings
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Basic configuration for your gate access controller
                  </p>
                </div>

                <div className="space-y-5">
                  <div>
                    <label
                      htmlFor="siteName"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      Site Name
                    </label>
                    <input
                      {...register('siteName', { required: 'Site name is required' })}
                      type="text"
                      className="block w-full rounded-md border border-gray-300 px-3 py-2.5 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:text-sm"
                      placeholder="Enter your site name"
                    />
                    {errors.siteName && (
                      <p className="mt-1 text-sm text-red-600">{errors.siteName.message}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="timezone"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      <FiClock className="mr-1 inline text-gray-500" />
                      Timezone
                    </label>
                    <Controller
                      name="timezone"
                      control={control}
                      render={({ field }) => (
                        <SearchableSelect
                          options={timezoneOptions}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select timezone"
                        />
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="dateFormat"
                        className="mb-1 block text-sm font-medium text-gray-700"
                      >
                        Date Format
                      </label>
                      <Controller
                        name="dateFormat"
                        control={control}
                        render={({ field }) => (
                          <SearchableSelect
                            options={dateFormatOptions}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select date format"
                          />
                        )}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="timeFormat"
                        className="mb-1 block text-sm font-medium text-gray-700"
                      >
                        Time Format
                      </label>
                      <Controller
                        name="timeFormat"
                        control={control}
                        render={({ field }) => (
                          <SearchableSelect
                            options={timeFormatOptions}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select time format"
                          />
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* URL Configuration */}
            {activeSection === 'urls' && (
              <div className="card">
                <div className="mb-6 border-b border-gray-200 pb-4">
                  <h2 className="flex items-center text-lg font-semibold text-gray-900">
                    <FiLink className="mr-2 text-primary-600" />
                    URL Configuration
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Configure separate URLs for admin panel and public access links
                  </p>
                </div>

                <div className="space-y-5">
                  <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <FiAlertCircle className="h-5 w-5 text-blue-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">URL Separation</h3>
                        <div className="mt-2 text-sm text-blue-700">
                          <p>
                            Configure separate URLs for admin management and public link access.
                            When OIDC is enabled, only the admin URL will require authentication.
                            The links URL will always remain publicly accessible.
                          </p>
                          <p className="mt-2">
                            <strong>Example:</strong> admin.example.com for admin panel, x.com for
                            public links
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="adminUrl"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      <FiShield className="mr-1 inline text-gray-500" />
                      Admin URL
                    </label>
                    <input
                      {...register('adminUrl')}
                      type="text"
                      className="block w-full rounded-md border border-gray-300 px-3 py-2.5 placeholder-gray-400 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:text-sm"
                      placeholder="https://admin.example.com or admin.example.com"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Domain for admin panel access. Include http:// or https:// to specify protocol
                      (defaults to https://)
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="linksUrl"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      <FiGlobe className="mr-1 inline text-gray-500" />
                      Links URL
                    </label>
                    <input
                      {...register('linksUrl')}
                      type="text"
                      className="block w-full rounded-md border border-gray-300 px-3 py-2.5 placeholder-gray-400 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:text-sm"
                      placeholder="https://x.com or http://localhost:3000"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Domain for public access links. Include http:// or https:// to specify
                      protocol (defaults to https://)
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Access Link Defaults */}
            {activeSection === 'defaults' && (
              <div className="card">
                <div className="mb-6 border-b border-gray-200 pb-4">
                  <h2 className="flex items-center text-lg font-semibold text-gray-900">
                    <FiLink className="mr-2 text-primary-600" />
                    Access Link Defaults
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Default settings for new access links
                  </p>
                </div>

                <div className="space-y-5">
                  <div>
                    <label
                      htmlFor="defaultExpirationHours"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      Default Expiration (hours)
                    </label>
                    <input
                      {...register('defaultExpirationHours', {
                        required: 'Default expiration is required',
                        min: { value: 1, message: 'Must be at least 1 hour' },
                        valueAsNumber: true,
                      })}
                      type="number"
                      min="1"
                      className="block w-full rounded-md border border-gray-300 px-3 py-2.5 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      How long links remain valid by default
                    </p>
                    {errors.defaultExpirationHours && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.defaultExpirationHours.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="defaultMaxUses"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      Default Maximum Uses
                    </label>
                    <input
                      {...register('defaultMaxUses', {
                        required: 'Default max uses is required',
                        min: { value: 1, message: 'Must be at least 1' },
                        valueAsNumber: true,
                      })}
                      type="number"
                      min="1"
                      className="block w-full rounded-md border border-gray-300 px-3 py-2.5 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Default number of times a link can be used
                    </p>
                    {errors.defaultMaxUses && (
                      <p className="mt-1 text-sm text-red-600">{errors.defaultMaxUses.message}</p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input
                        {...register('autoDeleteExpiredLinks')}
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <label
                        htmlFor="autoDeleteExpiredLinks"
                        className="ml-2 block text-sm text-gray-700"
                      >
                        Automatically delete expired links
                      </label>
                    </div>

                    {autoDeleteExpiredLinks && (
                      <div className="ml-6">
                        <label
                          htmlFor="autoDeleteAfterDays"
                          className="mb-1 block text-sm font-medium text-gray-700"
                        >
                          Delete after (days)
                        </label>
                        <input
                          {...register('autoDeleteAfterDays', {
                            min: { value: 1, message: 'Must be at least 1 day' },
                            valueAsNumber: true,
                          })}
                          type="number"
                          min="1"
                          className="block w-full rounded-md border border-gray-300 px-3 py-2.5 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:text-sm"
                        />
                        {errors.autoDeleteAfterDays && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.autoDeleteAfterDays.message}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Authentication Settings */}
            {activeSection === 'authentication' && (
              <div className="card">
                <div className="mb-6 border-b border-gray-200 pb-4">
                  <h2 className="flex items-center text-lg font-semibold text-gray-900">
                    <FiLock className="mr-2 text-primary-600" />
                    OpenID Connect Authentication
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Configure OIDC authentication for admin panel access
                  </p>
                </div>

                <div className="space-y-5">
                  <div className="flex items-center">
                    <input
                      {...register('oidcEnabled')}
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label htmlFor="oidcEnabled" className="ml-2 block text-sm text-gray-700">
                      Enable OpenID Connect Authentication
                    </label>
                  </div>

                  {oidcEnabled && (
                    <>
                      <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <FiAlertCircle className="h-5 w-5 text-yellow-400" />
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800">
                              Important: Authentication Required
                            </h3>
                            <div className="mt-2 text-sm text-yellow-700">
                              <p>
                                After enabling OIDC, all admin panel access will require
                                authentication through your identity provider. Make sure to test
                                your configuration before logging out.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="oidcIssuer"
                          className="mb-1 block text-sm font-medium text-gray-700"
                        >
                          <FiKey className="mr-1 inline text-gray-500" />
                          OIDC Issuer URL
                        </label>
                        <input
                          {...register('oidcIssuer', {
                            required: oidcEnabled
                              ? 'Issuer URL is required when OIDC is enabled'
                              : false,
                          })}
                          type="url"
                          className="block w-full rounded-md border border-gray-300 px-3 py-2.5 placeholder-gray-400 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:text-sm"
                          placeholder="https://auth.example.com"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          The base URL of your OpenID Connect identity provider (e.g., Authelia)
                        </p>
                        {errors.oidcIssuer && (
                          <p className="mt-1 text-sm text-red-600">{errors.oidcIssuer.message}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <div>
                          <label
                            htmlFor="oidcClientId"
                            className="mb-1 block text-sm font-medium text-gray-700"
                          >
                            Client ID
                          </label>
                          <input
                            {...register('oidcClientId', {
                              required: oidcEnabled
                                ? 'Client ID is required when OIDC is enabled'
                                : false,
                            })}
                            type="text"
                            className="block w-full rounded-md border border-gray-300 px-3 py-2.5 placeholder-gray-400 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:text-sm"
                            placeholder="gate-access-controller"
                          />
                          {errors.oidcClientId && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.oidcClientId.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <label
                            htmlFor="oidcClientSecret"
                            className="mb-1 block text-sm font-medium text-gray-700"
                          >
                            Client Secret
                          </label>
                          <input
                            {...register('oidcClientSecret')}
                            type="password"
                            className="block w-full rounded-md border border-gray-300 px-3 py-2.5 placeholder-gray-400 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:text-sm"
                            placeholder="••••••••••••••••"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Leave blank to keep existing secret
                          </p>
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="oidcRedirectUri"
                          className="mb-1 block text-sm font-medium text-gray-700"
                        >
                          Redirect URI
                        </label>
                        <input
                          {...register('oidcRedirectUri', {
                            required: oidcEnabled
                              ? 'Redirect URI is required when OIDC is enabled'
                              : false,
                          })}
                          type="url"
                          className="block w-full rounded-md border border-gray-300 px-3 py-2.5 placeholder-gray-400 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:text-sm"
                          placeholder="http://localhost:3000/auth/callback"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          The callback URL configured in your identity provider
                        </p>
                        {errors.oidcRedirectUri && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.oidcRedirectUri.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="oidcScopes"
                          className="mb-1 block text-sm font-medium text-gray-700"
                        >
                          Scopes
                        </label>
                        <input
                          {...register('oidcScopes')}
                          type="text"
                          className="block w-full rounded-md border border-gray-300 px-3 py-2.5 placeholder-gray-400 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:text-sm"
                          placeholder="openid,profile,email"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Comma-separated list of OIDC scopes to request
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Security Settings */}
            {activeSection === 'security' && (
              <div className="card">
                <div className="mb-6 border-b border-gray-200 pb-4">
                  <h2 className="flex items-center text-lg font-semibold text-gray-900">
                    <FiShield className="mr-2 text-primary-600" />
                    Security Settings
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Configure security and webhook settings
                  </p>
                </div>

                <div className="space-y-5">
                  <div>
                    <label
                      htmlFor="webhookUrl"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      Webhook URL
                    </label>
                    <input
                      {...register('webhookUrl')}
                      type="url"
                      className="block w-full rounded-md border border-gray-300 px-3 py-2.5 placeholder-gray-400 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:text-sm"
                      placeholder="https://your-gate-controller.com/webhook"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      URL to send access requests to your gate controller
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="webhookTimeout"
                        className="mb-1 block text-sm font-medium text-gray-700"
                      >
                        Webhook Timeout (ms)
                      </label>
                      <input
                        {...register('webhookTimeout', {
                          min: { value: 100, message: 'Must be at least 100ms' },
                          max: { value: 30000, message: 'Cannot exceed 30 seconds' },
                          valueAsNumber: true,
                        })}
                        type="number"
                        min="100"
                        max="30000"
                        className="block w-full rounded-md border border-gray-300 px-3 py-2.5 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:text-sm"
                      />
                      {errors.webhookTimeout && (
                        <p className="mt-1 text-sm text-red-600">{errors.webhookTimeout.message}</p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="webhookRetries"
                        className="mb-1 block text-sm font-medium text-gray-700"
                      >
                        Webhook Retries
                      </label>
                      <input
                        {...register('webhookRetries', {
                          min: { value: 0, message: 'Cannot be negative' },
                          max: { value: 10, message: 'Maximum 10 retries' },
                          valueAsNumber: true,
                        })}
                        type="number"
                        min="0"
                        max="10"
                        className="block w-full rounded-md border border-gray-300 px-3 py-2.5 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:text-sm"
                      />
                      {errors.webhookRetries && (
                        <p className="mt-1 text-sm text-red-600">{errors.webhookRetries.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="ipWhitelist"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      IP Whitelist
                    </label>
                    <textarea
                      {...register('ipWhitelist')}
                      rows={4}
                      className="block w-full rounded-md border border-gray-300 px-3 py-2.5 placeholder-gray-400 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:text-sm"
                      placeholder="Enter IP addresses or ranges (one per line)&#10;Example:&#10;192.168.1.0/24&#10;10.0.0.1"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Restrict access to specific IP addresses or ranges (leave empty to allow all)
                    </p>
                  </div>

                  <div className="flex items-center">
                    <input
                      {...register('requireAuthentication')}
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label
                      htmlFor="requireAuthentication"
                      className="ml-2 block text-sm text-gray-700"
                    >
                      Require authentication for admin panel
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Notification Settings */}
            {activeSection === 'notifications' && (
              <div className="card">
                <div className="mb-6 border-b border-gray-200 pb-4">
                  <h2 className="flex items-center text-lg font-semibold text-gray-900">
                    <FiBell className="mr-2 text-primary-600" />
                    Notification Settings
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Configure email notifications and alerts
                  </p>
                </div>

                <div className="space-y-5">
                  <div className="flex items-center">
                    <input
                      {...register('emailNotifications')}
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label
                      htmlFor="emailNotifications"
                      className="ml-2 block text-sm text-gray-700"
                    >
                      Enable email notifications
                    </label>
                  </div>

                  {emailNotifications && (
                    <>
                      <div>
                        <label
                          htmlFor="notificationEmail"
                          className="mb-1 block text-sm font-medium text-gray-700"
                        >
                          <FiMail className="mr-1 inline text-gray-500" />
                          Notification Email Address
                        </label>
                        <input
                          {...register('notificationEmail', {
                            required: emailNotifications
                              ? 'Email is required when notifications are enabled'
                              : false,
                            pattern: {
                              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                              message: 'Invalid email address',
                            },
                          })}
                          type="email"
                          className="block w-full rounded-md border border-gray-300 px-3 py-2.5 placeholder-gray-400 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:text-sm"
                          placeholder="admin@example.com"
                        />
                        {errors.notificationEmail && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.notificationEmail.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">
                          Notify me when:
                        </label>

                        <div className="ml-4 flex items-center">
                          <input
                            {...register('notifyOnNewLink')}
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <label
                            htmlFor="notifyOnNewLink"
                            className="ml-2 block text-sm text-gray-700"
                          >
                            A new access link is created
                          </label>
                        </div>

                        <div className="ml-4 flex items-center">
                          <input
                            {...register('notifyOnAccess')}
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <label
                            htmlFor="notifyOnAccess"
                            className="ml-2 block text-sm text-gray-700"
                          >
                            Someone successfully uses an access link
                          </label>
                        </div>

                        <div className="ml-4 flex items-center">
                          <input
                            {...register('notifyOnDeniedAccess')}
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <label
                            htmlFor="notifyOnDeniedAccess"
                            className="ml-2 block text-sm text-gray-700"
                          >
                            Access is denied to someone
                          </label>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Data Management Settings */}
            {activeSection === 'data' && (
              <div className="card">
                <div className="mb-6 border-b border-gray-200 pb-4">
                  <h2 className="flex items-center text-lg font-semibold text-gray-900">
                    <FiDatabase className="mr-2 text-primary-600" />
                    Data Management
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Configure data retention and logging preferences
                  </p>
                </div>

                <div className="space-y-5">
                  <div>
                    <label
                      htmlFor="logRetentionDays"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      Log Retention Period (days)
                    </label>
                    <input
                      {...register('logRetentionDays', {
                        required: 'Log retention period is required',
                        min: { value: 1, message: 'Must be at least 1 day' },
                        max: { value: 365, message: 'Maximum 365 days' },
                        valueAsNumber: true,
                      })}
                      type="number"
                      min="1"
                      max="365"
                      className="block w-full rounded-md border border-gray-300 px-3 py-2.5 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      How long to keep access logs before automatic deletion
                    </p>
                    {errors.logRetentionDays && (
                      <p className="mt-1 text-sm text-red-600">{errors.logRetentionDays.message}</p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input
                        {...register('enableDetailedLogging')}
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <label
                        htmlFor="enableDetailedLogging"
                        className="ml-2 block text-sm text-gray-700"
                      >
                        Enable detailed logging (includes user agent)
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        {...register('enableGeoLocation')}
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <label
                        htmlFor="enableGeoLocation"
                        className="ml-2 block text-sm text-gray-700"
                      >
                        Enable geolocation tracking for access attempts
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notice about settings storage */}
            <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <FiAlertCircle className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Settings Storage</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      Webhook and authentication settings are saved to the server and will apply
                      globally. Other settings are stored locally in your browser.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-between">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                <FiRefreshCw className="mr-2 h-4 w-4" />
                Reset to Defaults
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !isDirty}
                className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FiSave className="mr-2 h-4 w-4" />
                {isSubmitting ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
