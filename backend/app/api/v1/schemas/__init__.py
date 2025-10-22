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
]
