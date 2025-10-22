"""Pydantic schemas for Access Log API endpoints"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.models.access_log import AccessStatus, DenialReason


class AccessLogBase(BaseModel):
    """Base schema for access logs"""

    link_id: Optional[str] = None
    status: AccessStatus
    ip_address: str
    user_agent: Optional[str] = None
    denial_reason: Optional[DenialReason] = None
    error_message: Optional[str] = None
    link_code_used: Optional[str] = None
    webhook_response_time_ms: Optional[int] = None
    country: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None


class AccessLogCreate(AccessLogBase):
    """Schema for creating a new access log entry"""

    pass


class AccessLogResponse(AccessLogBase):
    """Schema for access log responses"""

    id: str
    accessed_at: datetime
    link_name: Optional[str] = None
    was_successful: bool

    class Config:
        from_attributes = True


class AccessLogListResponse(BaseModel):
    """Schema for listing access logs with pagination"""

    items: List[AccessLogResponse]
    total: int
    page: int
    size: int
    pages: int


class AccessLogFilter(BaseModel):
    """Schema for filtering access logs"""

    link_id: Optional[str] = Field(None, description="Filter by link ID")
    status: Optional[AccessStatus] = Field(None, description="Filter by access status")
    ip_address: Optional[str] = Field(None, description="Filter by IP address")
    start_date: Optional[datetime] = Field(None, description="Filter logs after this date")
    end_date: Optional[datetime] = Field(None, description="Filter logs before this date")


class AccessLogStats(BaseModel):
    """Statistics for access logs"""

    total_attempts: int = 0
    granted_count: int = 0
    denied_count: int = 0
    error_count: int = 0
    unique_ips: int = 0
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


class AccessLogSummary(BaseModel):
    """Summary of access logs for a specific period"""

    date: datetime
    granted: int = 0
    denied: int = 0
    errors: int = 0
    unique_visitors: int = 0