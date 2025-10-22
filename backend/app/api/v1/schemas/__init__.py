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
from app.api.v1.schemas.common import (
    ErrorResponse,
    HealthResponse,
    MessageResponse,
    PaginationParams,
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
    # Common schemas
    "MessageResponse",
    "ErrorResponse",
    "HealthResponse",
    "PaginationParams",
    # System Settings schemas
    "SystemSettingsCreate",
    "SystemSettingsResponse",
]
