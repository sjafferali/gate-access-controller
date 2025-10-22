import axios, { AxiosInstance, AxiosError } from 'axios'
import toast from 'react-hot-toast'
import type {
  AccessLink,
  AccessLog,
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
} from '@/types'

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

export default apiClient
