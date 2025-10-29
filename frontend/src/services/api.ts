import axios, { AxiosInstance, AxiosError } from 'axios'
import toast from 'react-hot-toast'
import type {
  AccessLink,
  AccessLog,
  AuditLog,
  AuditLogStats,
  CreateAccessLink,
  UpdateAccessLink,
  PaginatedResponse,
  MessageResponse,
  AccessLinkPublic,
  AccessLinkStats,
  AccessLogStats,
  AccessLogSummary,
  HealthResponse,
  SystemSettings,
  SystemSettingsUpdate,
  User,
  NotificationProvider,
  NotificationProviderSummary,
  CreateNotificationProvider,
  UpdateNotificationProvider,
} from '@/types'
import { LinkPurpose } from '@/types'

// Interface for API error responses
interface ApiErrorResponse {
  detail?: string
  message?: string
}

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies in requests
})

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add any auth tokens here if needed
    return config
  },
  (error: Error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    const errorData = error.response?.data
    const message = errorData?.detail || errorData?.message || error.message

    // Don't show toast for validation errors or 404s in some cases
    if (error.response?.status !== 422 && error.response?.status !== 404) {
      toast.error(message)
    }

    return Promise.reject(error)
  }
)

// Access Links API
export const accessLinksApi = {
  list: async (params?: {
    page?: number
    size?: number
    status?: string
    purpose?: string
    search?: string
    include_deleted?: boolean
    owner_user_id?: string
  }): Promise<PaginatedResponse<AccessLink>> => {
    const { data } = await apiClient.get<PaginatedResponse<AccessLink>>('/v1/links', { params })
    return data
  },

  get: async (linkId: string): Promise<AccessLink> => {
    const { data } = await apiClient.get<AccessLink>(`/v1/links/${linkId}`)
    return data
  },

  create: async (linkData: CreateAccessLink): Promise<AccessLink> => {
    const { data } = await apiClient.post<AccessLink>('/v1/links', linkData)
    return data
  },

  update: async (linkId: string, updateData: UpdateAccessLink): Promise<AccessLink> => {
    const { data } = await apiClient.patch<AccessLink>(`/v1/links/${linkId}`, updateData)
    return data
  },

  delete: async (linkId: string): Promise<MessageResponse> => {
    const { data } = await apiClient.delete<MessageResponse>(`/v1/links/${linkId}`)
    return data
  },

  disable: async (linkId: string): Promise<AccessLink> => {
    const { data } = await apiClient.post<AccessLink>(`/v1/links/${linkId}/disable`)
    return data
  },

  enable: async (linkId: string): Promise<AccessLink> => {
    const { data } = await apiClient.post<AccessLink>(`/v1/links/${linkId}/enable`)
    return data
  },

  regenerateCode: async (linkId: string): Promise<AccessLink> => {
    const { data } = await apiClient.post<AccessLink>(`/v1/links/${linkId}/regenerate`)
    return data
  },

  getStats: async (linkId: string): Promise<AccessLinkStats> => {
    const { data } = await apiClient.get<AccessLinkStats>(`/v1/links/${linkId}/stats`)
    return data
  },

  createQuickLink: async (): Promise<AccessLink> => {
    // Load settings from localStorage to get defaults
    const storedSettings = localStorage.getItem('gateAccessSettings')
    let defaultExpirationHours = 24
    let defaultMaxUses = 1

    if (storedSettings) {
      try {
        const settings = JSON.parse(storedSettings) as {
          defaultExpirationHours?: number
          defaultMaxUses?: number
        }
        defaultExpirationHours = settings.defaultExpirationHours ?? 24
        defaultMaxUses = settings.defaultMaxUses ?? 1
      } catch {
        console.error('Failed to parse settings from localStorage')
      }
    }

    // Get default notification providers from system settings
    let notificationProviderIds: string[] = []
    try {
      const systemSettings = await settingsApi.getSettings()
      notificationProviderIds = systemSettings.quick_link_notification_provider_ids || []
    } catch {
      // If we can't get system settings, continue without notification providers
      console.warn('Could not fetch system settings for quick link notification providers')
    }

    // Generate timestamp for the link name and notes
    // Format as "MM-DD-YYYY HH.MM.SS" to avoid validation issues with "/" and ":" characters
    const now = new Date()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const year = now.getFullYear()
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')
    const timestamp = `${month}-${day}-${year} ${hours}.${minutes}.${seconds}`

    // Calculate expiration time - ALWAYS set an expiration for quick links
    const activeOn = new Date()
    const expiration = new Date(activeOn.getTime() + defaultExpirationHours * 60 * 60 * 1000)

    // Create quick link data
    // Using the formatted timestamp for both name and notes (more readable format)
    const readableTimestamp = now.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })

    const quickLinkData: CreateAccessLink = {
      name: `quicklink ${timestamp}`,
      notes: `Quick link generated on ${readableTimestamp}. Expires in ${defaultExpirationHours} hours with ${defaultMaxUses} max use(s).`,
      purpose: LinkPurpose.OTHER,
      active_on: activeOn.toISOString(),
      expiration: expiration.toISOString(), // Always provide expiration for quick links
      max_uses: defaultMaxUses,
      auto_open: false,
      notification_provider_ids: notificationProviderIds,
    }

    const { data } = await apiClient.post<AccessLink>('/v1/links', quickLinkData)
    return data
  },
}

// Access Logs API
export const accessLogsApi = {
  list: async (params?: {
    page?: number
    size?: number
    link_id?: string
    status?: string
    ip_address?: string
    start_date?: string
    end_date?: string
    owner_user_id?: string
  }): Promise<PaginatedResponse<AccessLog>> => {
    const { data } = await apiClient.get<PaginatedResponse<AccessLog>>('/v1/logs', { params })
    return data
  },

  get: async (logId: string): Promise<AccessLog> => {
    const { data } = await apiClient.get<AccessLog>(`/v1/logs/${logId}`)
    return data
  },

  getStats: async (params?: {
    link_id?: string
    start_date?: string
    end_date?: string
  }): Promise<AccessLogStats> => {
    const { data } = await apiClient.get<AccessLogStats>('/v1/logs/stats', { params })
    return data
  },

  getSummary: async (params?: { days?: number; link_id?: string }): Promise<AccessLogSummary[]> => {
    const { data } = await apiClient.get<AccessLogSummary[]>('/v1/logs/summary', { params })
    return data
  },

  deleteOld: async (daysOld: number): Promise<void> => {
    await apiClient.delete<void>('/v1/logs', {
      params: { days_old: daysOld },
    })
  },
}

// Validation API
export const validationApi = {
  validateLink: async (linkCode: string): Promise<AccessLinkPublic> => {
    const { data } = await apiClient.get<AccessLinkPublic>(`/v1/validate/${linkCode}`)
    return data
  },

  requestAccess: async (linkCode: string): Promise<MessageResponse> => {
    const { data } = await apiClient.post<MessageResponse>(`/v1/validate/${linkCode}/access`)
    return data
  },
}

// Health API
export const healthApi = {
  check: async (): Promise<HealthResponse> => {
    const { data } = await apiClient.get<HealthResponse>('/v1/health')
    return data
  },

  checkDatabase: async (): Promise<{ status: string; connected: boolean }> => {
    const { data } = await apiClient.get<{ status: string; connected: boolean }>(
      '/v1/health/database'
    )
    return data
  },

  checkWebhook: async (): Promise<{ status: string; configured: boolean }> => {
    const { data } = await apiClient.get<{ status: string; configured: boolean }>(
      '/v1/health/webhook'
    )
    return data
  },
}

// Settings API
export const settingsApi = {
  getSettings: async (): Promise<SystemSettings> => {
    const { data } = await apiClient.get<SystemSettings>('/v1/settings')
    return data
  },

  saveSettings: async (settings: SystemSettingsUpdate): Promise<SystemSettings> => {
    const { data } = await apiClient.post<SystemSettings>('/v1/settings', settings)
    return data
  },

  updateSettings: async (settings: SystemSettingsUpdate): Promise<SystemSettings> => {
    const { data } = await apiClient.put<SystemSettings>('/v1/settings', settings)
    return data
  },

  resetSettings: async (): Promise<MessageResponse> => {
    const { data } = await apiClient.delete<MessageResponse>('/v1/settings')
    return data
  },
}

// Audit Logs API
export const auditLogsApi = {
  list: async (params?: {
    page?: number
    size?: number
    action?: string
    resource_type?: string
    resource_id?: string
    link_code?: string
    user_id?: string
    ip_address?: string
    search?: string
    start_date?: string
    end_date?: string
  }): Promise<PaginatedResponse<AuditLog>> => {
    const { data } = await apiClient.get<PaginatedResponse<AuditLog>>('/v1/audit-logs', { params })
    return data
  },

  get: async (auditLogId: string): Promise<AuditLog> => {
    const { data } = await apiClient.get<AuditLog>(`/v1/audit-logs/${auditLogId}`)
    return data
  },

  getStats: async (): Promise<AuditLogStats> => {
    const { data } = await apiClient.get<AuditLogStats>('/v1/audit-logs/stats')
    return data
  },
}

// Notification Providers API
export const notificationProvidersApi = {
  list: async (params?: {
    page?: number
    size?: number
    include_deleted?: boolean
    enabled_only?: boolean
  }): Promise<PaginatedResponse<NotificationProvider>> => {
    const { data } = await apiClient.get<PaginatedResponse<NotificationProvider>>(
      '/v1/notification-providers',
      { params }
    )
    return data
  },

  getSummary: async (): Promise<NotificationProviderSummary[]> => {
    const { data } = await apiClient.get<NotificationProviderSummary[]>(
      '/v1/notification-providers/summary'
    )
    return data
  },

  get: async (providerId: string): Promise<NotificationProvider> => {
    const { data } = await apiClient.get<NotificationProvider>(
      `/v1/notification-providers/${providerId}`
    )
    return data
  },

  create: async (providerData: CreateNotificationProvider): Promise<NotificationProvider> => {
    const { data } = await apiClient.post<NotificationProvider>(
      '/v1/notification-providers',
      providerData
    )
    return data
  },

  update: async (
    providerId: string,
    updateData: UpdateNotificationProvider
  ): Promise<NotificationProvider> => {
    const { data } = await apiClient.patch<NotificationProvider>(
      `/v1/notification-providers/${providerId}`,
      updateData
    )
    return data
  },

  delete: async (providerId: string): Promise<MessageResponse> => {
    const { data } = await apiClient.delete<MessageResponse>(
      `/v1/notification-providers/${providerId}`
    )
    return data
  },
}

// Auth API
export const authApi = {
  getStatus: async (): Promise<{ oidc_enabled: boolean }> => {
    const { data } = await apiClient.get<{ oidc_enabled: boolean }>('/v1/auth/status')
    return data
  },

  getLoginUrl: async (): Promise<{ login_url: string; state: string }> => {
    const { data } = await apiClient.get<{ login_url: string; state: string }>('/v1/auth/login-url')
    return data
  },

  callback: async (code: string, state: string): Promise<User> => {
    const { data } = await apiClient.post<User>('/v1/auth/callback', { code, state })
    return data
  },

  logout: async (): Promise<{ message: string }> => {
    const { data } = await apiClient.post<{ message: string }>('/v1/auth/logout')
    return data
  },

  getCurrentUser: async (): Promise<User> => {
    const { data } = await apiClient.get<User>('/v1/auth/me')
    return data
  },
}

export default apiClient
