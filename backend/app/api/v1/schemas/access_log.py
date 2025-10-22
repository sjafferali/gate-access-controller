"""Pydantic schemas for Access Log API endpoints"""

from datetime import datetime

from app.models.access_log import AccessStatus, DenialReason
from pydantic import BaseModel, Field


class AccessLogBase(BaseModel):
    """Base schema for access logs"""

    link_id: str | None = None
    status: AccessStatus
    ip_address: str
    user_agent: str | None = None
    denial_reason: DenialReason | None = None
    error_message: str | None = None
    link_code_used: str | None = None
    webhook_response_time_ms: int | None = None
    country: str | None = None
    region: str | None = None
    city: str | None = None


class AccessLogCreate(AccessLogBase):
    """Schema for creating a new access log entry"""

    pass


class AccessLogResponse(AccessLogBase):
    """Schema for access log responses"""

    id: str
    accessed_at: datetime
    link_name: str | None = None
    was_successful: bool

    class Config:
        from_attributes = True


class AccessLogListResponse(BaseModel):
    """Schema for listing access logs with pagination"""

    items: list[AccessLogResponse]
    total: int
    page: int
    size: int
    pages: int


class AccessLogFilter(BaseModel):
    """Schema for filtering access logs"""

    link_id: str | None = Field(None, description="Filter by link ID")
    status: AccessStatus | None = Field(None, description="Filter by access status")
    ip_address: str | None = Field(None, description="Filter by IP address")
    start_date: datetime | None = Field(None, description="Filter logs after this date")
    end_date: datetime | None = Field(None, description="Filter logs before this date")


class AccessLogStats(BaseModel):
    """Statistics for access logs"""

    total_attempts: int = 0
    granted_count: int = 0
    denied_count: int = 0
    error_count: int = 0
    unique_ips: int = 0
    period_start: datetime | None = None
    period_end: datetime | None = None


class AccessLogSummary(BaseModel):
    """Summary of access logs for a specific period"""

    date: datetime
    granted: int = 0
    denied: int = 0
    errors: int = 0
    unique_visitors: int = 0
