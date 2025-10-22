"""Common schemas used across API endpoints"""

from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class MessageResponse(BaseModel):
    """Generic message response"""

    message: str
    success: bool = True
    data: Optional[Dict[str, Any]] = None


class ErrorResponse(BaseModel):
    """Error response schema"""

    error: str
    message: str
    details: Optional[Dict[str, Any]] = None
    status_code: int


class HealthResponse(BaseModel):
    """Health check response"""

    status: str = "healthy"
    version: str
    environment: str
    database: bool = True
    timestamp: str


class PaginationParams(BaseModel):
    """Pagination parameters for list endpoints"""

    page: int = Field(1, ge=1, description="Page number")
    size: int = Field(50, ge=1, le=200, description="Page size")
    sort_by: Optional[str] = Field(None, description="Field to sort by")
    sort_order: str = Field("desc", pattern="^(asc|desc)$", description="Sort order")