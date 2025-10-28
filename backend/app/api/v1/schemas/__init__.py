"""API schemas package"""

from app.api.v1.schemas.access_link import (
    AccessLinkCreate,
    AccessLinkListResponse,
    AccessLinkPublic,
    AccessLinkResponse,
    AccessLinkStats,
    AccessLinkUpdate,
)
from app.api.v1.schemas.access_log import (
    AccessLogCreate,
    AccessLogFilter,
    AccessLogListResponse,
    AccessLogResponse,
    AccessLogStats,
    AccessLogSummary,
)
from app.api.v1.schemas.audit_log import (
    AuditLogListResponse,
    AuditLogResponse,
    AuditLogStats,
)
from app.api.v1.schemas.common import (
    ErrorResponse,
    HealthResponse,
    MessageResponse,
    PaginationParams,
)
from app.api.v1.schemas.notification_provider import (
    NotificationProviderCreate,
    NotificationProviderListResponse,
    NotificationProviderResponse,
    NotificationProviderSummary,
    NotificationProviderUpdate,
    PushoverConfig,
    WebhookConfig,
)
from app.api.v1.schemas.system_settings import (
    SystemSettingsCreate,
    SystemSettingsResponse,
)

__all__ = [
    # Access Link schemas
    "AccessLinkCreate",
    "AccessLinkUpdate",
    "AccessLinkResponse",
    "AccessLinkListResponse",
    "AccessLinkPublic",
    "AccessLinkStats",
    # Access Log schemas
    "AccessLogCreate",
    "AccessLogResponse",
    "AccessLogListResponse",
    "AccessLogFilter",
    "AccessLogStats",
    "AccessLogSummary",
    # Audit Log schemas
    "AuditLogResponse",
    "AuditLogListResponse",
    "AuditLogStats",
    # Common schemas
    "MessageResponse",
    "ErrorResponse",
    "HealthResponse",
    "PaginationParams",
    # Notification Provider schemas
    "NotificationProviderCreate",
    "NotificationProviderUpdate",
    "NotificationProviderResponse",
    "NotificationProviderListResponse",
    "NotificationProviderSummary",
    "PushoverConfig",
    "WebhookConfig",
    # System Settings schemas
    "SystemSettingsCreate",
    "SystemSettingsResponse",
]
