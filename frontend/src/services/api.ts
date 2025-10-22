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
} from '@/types'

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
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const message = (error.response?.data as any)?.detail || error.message

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
  }): Promise<PaginatedResponse<AccessLink>> => {
    const { data } = await apiClient.get('/v1/links', { params })
    return data
  },

  get: async (linkId: string): Promise<AccessLink> => {
    const { data } = await apiClient.get(`/v1/links/${linkId}`)
    return data
  },

  create: async (linkData: CreateAccessLink): Promise<AccessLink> => {
    const { data } = await apiClient.post('/v1/links', linkData)
    return data
  },

  update: async (linkId: string, updateData: UpdateAccessLink): Promise<AccessLink> => {
    const { data } = await apiClient.patch(`/v1/links/${linkId}`, updateData)
    return data
  },

  delete: async (linkId: string, permanent = false): Promise<MessageResponse> => {
    const { data } = await apiClient.delete(`/v1/links/${linkId}`, {
      params: { permanent },
    })
    return data
  },

  regenerateCode: async (linkId: string): Promise<AccessLink> => {
    const { data } = await apiClient.post(`/v1/links/${linkId}/regenerate`)
    return data
  },

  getStats: async (linkId: string): Promise<AccessLinkStats> => {
    const { data } = await apiClient.get(`/v1/links/${linkId}/stats`)
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
    const { data } = await apiClient.get('/v1/logs', { params })
    return data
  },

  get: async (logId: string): Promise<AccessLog> => {
    const { data } = await apiClient.get(`/v1/logs/${logId}`)
    return data
  },

  getStats: async (params?: {
    link_id?: string
    start_date?: string
    end_date?: string
  }): Promise<AccessLogStats> => {
    const { data } = await apiClient.get('/v1/logs/stats', { params })
    return data
  },

  getSummary: async (params?: {
    days?: number
    link_id?: string
  }): Promise<AccessLogSummary[]> => {
    const { data } = await apiClient.get('/v1/logs/summary', { params })
    return data
  },

  deleteOld: async (daysOld: number): Promise<void> => {
    await apiClient.delete('/v1/logs', {
      params: { days_old: daysOld },
    })
  },
}

// Validation API
export const validationApi = {
  validateLink: async (linkCode: string): Promise<AccessLinkPublic> => {
    const { data } = await apiClient.get(`/v1/validate/${linkCode}`)
    return data
  },

  requestAccess: async (linkCode: string): Promise<MessageResponse> => {
    const { data } = await apiClient.post(`/v1/validate/${linkCode}/access`)
    return data
  },
}

// Health API
export const healthApi = {
  check: async (): Promise<any> => {
    const { data } = await apiClient.get('/v1/health')
    return data
  },

  checkDatabase: async (): Promise<any> => {
    const { data } = await apiClient.get('/v1/health/database')
    return data
  },

  checkWebhook: async (): Promise<any> => {
    const { data } = await apiClient.get('/v1/health/webhook')
    return data
  },
}

export default apiClient