// Access Link Types
export enum LinkStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DISABLED = 'disabled',
}

export enum LinkPurpose {
  DELIVERY = 'delivery',
  RECURRING_DELIVERY = 'recurring_delivery',
  VISITOR = 'visitor',
  SERVICE = 'service',
  EMERGENCY = 'emergency',
  OTHER = 'other',
}

export interface AccessLink {
  id: string
  link_code: string
  status: LinkStatus
  name: string
  notes?: string
  purpose: LinkPurpose
  active_on?: string
  expiration?: string
  max_uses?: number
  granted_count: number
  denied_count: number
  remaining_uses?: number
  is_active: boolean
  auto_open: boolean
  notification_provider_ids: string[]
  notification_providers?: Array<{
    id: string
    name: string
    provider_type: NotificationProviderType
    enabled: boolean
  }>
  created_at: string
  updated_at: string
  is_deleted: boolean
  deleted_at?: string
  owner_user_id?: string | null
  owner_user_name?: string | null
}

export interface CreateAccessLink {
  name: string
  notes?: string
  purpose: LinkPurpose
  active_on: string
  expiration?: string
  max_uses?: number
  auto_open?: boolean
  link_code?: string
  notification_provider_ids?: string[]
}

export interface UpdateAccessLink {
  name?: string
  notes?: string
  purpose?: LinkPurpose
  active_on?: string
  expiration?: string
  max_uses?: number
  auto_open?: boolean
  notification_provider_ids?: string[]
}

// Access Log Types
export enum AccessStatus {
  GRANTED = 'granted',
  DENIED = 'denied',
  ERROR = 'error',
}

export enum DenialReason {
  EXPIRED = 'expired',
  DISABLED = 'disabled',
  DELETED = 'deleted',
  NOT_ACTIVE_YET = 'not_active_yet',
  MAX_USES_EXCEEDED = 'max_uses_exceeded',
  INVALID_CODE = 'invalid_code',
  WEBHOOK_FAILED = 'webhook_failed',
  OTHER = 'other',
}

export interface AccessLog {
  id: string
  link_id?: string
  status: AccessStatus
  ip_address: string
  user_agent?: string
  denial_reason?: DenialReason
  error_message?: string
  link_code_used?: string
  webhook_response_time_ms?: number
  country?: string
  region?: string
  city?: string
  accessed_at: string
  link_name?: string
  was_successful: boolean
}

// API Response Types
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  size: number
  pages: number
}

export interface MessageResponse {
  message: string
  success: boolean
  data?: Record<string, unknown>
}

export interface ErrorResponse {
  error: string
  message: string
  details?: Record<string, unknown>
  status_code: number
}

export interface HealthResponse {
  status: string
  version: string
  environment: string
  database: boolean
  timestamp: string
}

export interface AccessLinkPublic {
  is_valid: boolean
  name: string
  notes?: string
  message: string
  auto_open: boolean
  active_on?: string
  expiration?: string
}

export interface AccessLinkStats {
  id: string
  name: string
  link_code: string
  total_uses: number
  granted_count: number
  denied_count: number
  remaining_uses?: number
  last_used?: string
  created_at: string
}

export interface AccessLogStats {
  total_attempts: number
  granted_count: number
  denied_count: number
  error_count: number
  unique_ips: number
  period_start?: string
  period_end?: string
}

export interface AccessLogSummary {
  date: string
  granted: number
  denied: number
  errors: number
  unique_visitors: number
}

// System Settings Types
export interface SystemSettings {
  id: string
  webhook_url: string | null
  webhook_token: string | null
  webhook_timeout: number
  webhook_retries: number
  gate_open_duration_seconds: number
  link_cooldown_seconds: number
  admin_url: string | null
  links_url: string | null
  timezone: string | null
  oidc_enabled: boolean
  oidc_issuer: string | null
  oidc_client_id: string | null
  oidc_redirect_uri: string | null
  oidc_scopes: string | null
  oidc_client_secret_set: boolean
  default_notification_provider_ids: string[]
  quick_link_notification_provider_ids: string[]
  created_at: string
  updated_at: string
}

export interface SystemSettingsUpdate {
  webhook_url?: string | null
  webhook_token?: string | null
  webhook_timeout?: number
  webhook_retries?: number
  gate_open_duration_seconds?: number
  link_cooldown_seconds?: number
  admin_url?: string | null
  links_url?: string | null
  timezone?: string | null
  oidc_enabled?: boolean
  oidc_issuer?: string | null
  oidc_client_id?: string | null
  oidc_client_secret?: string | null
  oidc_redirect_uri?: string | null
  oidc_scopes?: string | null
  default_notification_provider_ids?: string[]
  quick_link_notification_provider_ids?: string[]
}

// Audit Log Types
export enum AuditAction {
  LINK_CREATED = 'LINK_CREATED',
  LINK_UPDATED = 'LINK_UPDATED',
  LINK_DELETED = 'LINK_DELETED',
  LINK_DISABLED = 'LINK_DISABLED',
  LINK_ENABLED = 'LINK_ENABLED',
  LINK_CODE_REGENERATED = 'LINK_CODE_REGENERATED',
}

export interface AuditLog {
  id: string
  action: AuditAction
  action_display: string
  summary: string
  resource_type: string
  resource_id: string
  link_code?: string
  link_name?: string
  user_id?: string
  user_name?: string
  ip_address?: string
  user_agent?: string
  changes?: Record<string, { old: unknown; new: unknown }>
  context_data?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface AuditLogStats {
  total_logs: number
  actions: Record<string, number>
  recent_activity: AuditLog[]
}

// User Types
export interface User {
  sub: string
  email?: string | null
  name?: string | null
  preferred_username?: string | null
  display_name: string
  user_id: string
  is_default_user: boolean
  is_authenticated: boolean
}

// Notification Provider Types
export enum NotificationProviderType {
  PUSHOVER = 'pushover',
  WEBHOOK = 'webhook',
}

export interface PushoverConfig {
  user_key: string
  api_token: string
  priority: number
  sound?: string
  device?: string
}

export interface WebhookConfig {
  url: string
  method: string
  headers: Record<string, string>
  body_template?: string
}

export interface NotificationProvider {
  id: string
  name: string
  provider_type: NotificationProviderType
  config: PushoverConfig | WebhookConfig
  enabled: boolean
  created_at: string
  updated_at: string
  is_deleted: boolean
  deleted_at?: string
}

export interface CreateNotificationProvider {
  name: string
  provider_type: NotificationProviderType
  config: PushoverConfig | WebhookConfig
  enabled?: boolean
}

export interface UpdateNotificationProvider {
  name?: string
  config?: PushoverConfig | WebhookConfig
  enabled?: boolean
}

export interface NotificationProviderSummary {
  id: string
  name: string
  provider_type: NotificationProviderType
  enabled: boolean
}
