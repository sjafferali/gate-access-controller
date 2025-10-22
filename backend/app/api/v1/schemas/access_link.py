"""Pydantic schemas for Access Link API endpoints"""

from datetime import datetime, timezone
from typing import List, Optional, Any

from pydantic import BaseModel, Field, field_validator, validator

from app.models.access_link import LinkPurpose, LinkStatus


class AccessLinkBase(BaseModel):
    """Base schema for access links"""

    name: str = Field(..., min_length=1, max_length=200, description="Friendly name for the link")
    notes: Optional[str] = Field(None, description="Additional notes or instructions")
    purpose: LinkPurpose = Field(LinkPurpose.OTHER, description="Purpose category for the link")
    active_on: Optional[datetime] = Field(None, description="Date/time when the link becomes active")
    expiration: Optional[datetime] = Field(None, description="Date/time when the link expires")
    max_uses: Optional[int] = Field(None, ge=1, description="Maximum number of uses allowed")

    class Config:
        # Enable automatic JSON parsing of datetime strings
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class AccessLinkCreate(AccessLinkBase):
    """Schema for creating a new access link"""

    @validator("active_on", "expiration", pre=True)
    def empty_str_to_none(cls, v: Any) -> Optional[Any]:
        """Convert empty strings to None for optional datetime fields"""
        if v == "" or v is None:
            return None
        return v

    @validator("max_uses", pre=True)
    def handle_max_uses(cls, v: Any) -> Optional[int]:
        """Convert empty string or NaN to None for max_uses"""
        if v == "" or v is None or (isinstance(v, float) and v != v):  # Check for NaN
            return None
        if isinstance(v, (int, float)):
            return int(v) if v > 0 else None
        return v

    @field_validator("expiration")
    @classmethod
    def validate_expiration(cls, v: Optional[datetime], values: dict) -> Optional[datetime]:
        """Ensure expiration is in the future if provided"""
        if v:
            # Make timezone-aware if needed
            now = datetime.now(timezone.utc)
            if v.tzinfo is None:
                v = v.replace(tzinfo=timezone.utc)
            if v <= now:
                raise ValueError("Expiration date must be in the future")
        return v

    @field_validator("active_on")
    @classmethod
    def validate_active_on(cls, v: Optional[datetime]) -> Optional[datetime]:
        """Ensure active_on is reasonable if provided"""
        if v:
            # Make timezone-aware if needed
            now = datetime.now(timezone.utc)
            if v.tzinfo is None:
                v = v.replace(tzinfo=timezone.utc)
            if v < now:
                raise ValueError("Active date cannot be in the past")
        return v


class AccessLinkUpdate(BaseModel):
    """Schema for updating an existing access link"""

    name: Optional[str] = Field(None, min_length=1, max_length=200)
    notes: Optional[str] = None
    purpose: Optional[LinkPurpose] = None
    status: Optional[LinkStatus] = None
    active_on: Optional[datetime] = None
    expiration: Optional[datetime] = None
    max_uses: Optional[int] = Field(None, ge=1)


class AccessLinkResponse(AccessLinkBase):
    """Schema for access link responses"""

    id: str
    link_code: str
    status: LinkStatus
    created_at: datetime
    updated_at: datetime
    granted_count: int = 0
    denied_count: int = 0
    remaining_uses: Optional[int] = None

    class Config:
        from_attributes = True


class AccessLinkListResponse(BaseModel):
    """Schema for listing access links with pagination"""

    items: List[AccessLinkResponse]
    total: int
    page: int
    size: int
    pages: int


class AccessLinkPublic(BaseModel):
    """Public schema for access link validation (minimal info)"""

    is_valid: bool
    name: str
    notes: Optional[str] = None
    message: str


class AccessLinkStats(BaseModel):
    """Statistics for an access link"""

    id: str
    name: str
    link_code: str
    total_uses: int
    granted_count: int
    denied_count: int
    remaining_uses: Optional[int]
    last_used: Optional[datetime]
    created_at: datetime