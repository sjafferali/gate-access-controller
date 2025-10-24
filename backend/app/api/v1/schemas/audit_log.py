"""Schemas for Audit Log API responses"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class AuditLogResponse(BaseModel):
    """Schema for audit log response"""

    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="Unique identifier for the audit log entry")
    action: str = Field(..., description="Action performed (e.g., LINK_CREATED, LINK_UPDATED)")
    action_display: str = Field(..., description="Human-readable action name")
    summary: str = Field(..., description="Human-readable summary of the action")
    resource_type: str = Field(..., description="Type of resource affected")
    resource_id: str = Field(..., description="ID of the resource affected")
    link_code: str | None = Field(None, description="Link code at time of action")
    link_name: str | None = Field(None, description="Link name at time of action")
    user_id: str | None = Field(None, description="ID of user who performed the action")
    user_name: str | None = Field(None, description="Display name of user who performed the action")
    ip_address: str | None = Field(None, description="IP address from which action was performed")
    user_agent: str | None = Field(None, description="User agent string from the request")
    changes: dict[str, Any] | None = Field(None, description="Changed fields with old and new values")
    context_data: dict[str, Any] | None = Field(None, description="Additional context about the action")
    created_at: datetime = Field(..., description="When the action was performed")
    updated_at: datetime = Field(..., description="When the log entry was last updated")


class AuditLogListResponse(BaseModel):
    """Schema for paginated list of audit logs"""

    items: list[AuditLogResponse] = Field(..., description="List of audit log entries")
    total: int = Field(..., description="Total number of audit logs matching filters")
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Number of items per page")
    pages: int = Field(..., description="Total number of pages")


class AuditLogStats(BaseModel):
    """Schema for audit log statistics"""

    total_logs: int = Field(..., description="Total number of audit log entries")
    actions: dict[str, int] = Field(..., description="Count of each action type")
    recent_activity: list[AuditLogResponse] = Field(
        ..., description="Most recent audit log entries"
    )
