"""Pydantic schemas for Access Link API endpoints"""

from datetime import UTC, datetime
from typing import Any

from app.models.access_link import LinkPurpose, LinkStatus
from pydantic import BaseModel, Field, field_validator, validator


class AccessLinkBase(BaseModel):
    """Base schema for access links"""

    name: str = Field(..., min_length=1, max_length=200, description="Friendly name for the link")
    notes: str | None = Field(None, description="Additional notes or instructions")
    purpose: LinkPurpose = Field(LinkPurpose.OTHER, description="Purpose category for the link")
    active_on: datetime = Field(
        ..., description="Date/time when the link becomes active (required)"
    )
    expiration: datetime | None = Field(None, description="Date/time when the link expires")
    max_uses: int | None = Field(None, ge=1, description="Maximum number of uses allowed")
    auto_open: bool = Field(False, description="Automatically open gate when link is accessed")

    class Config:
        # Enable automatic JSON parsing of datetime strings
        json_encoders = {datetime: lambda v: v.isoformat()}


class AccessLinkCreate(AccessLinkBase):
    """Schema for creating a new access link"""

    link_code: str | None = Field(
        None,
        description="Optional custom link code (will be auto-generated if not provided)",
        min_length=4,
        max_length=20,
        pattern="^[A-Z0-9]+$",
    )

    @validator("link_code", pre=True)
    def uppercase_link_code(cls, v: Any) -> str | None:
        """Convert link code to uppercase and validate"""
        if v == "" or v is None:
            return None
        if isinstance(v, str):
            # Convert to uppercase
            v = v.upper().strip()
            # Validate format (alphanumeric only)
            if not v.replace(" ", "").replace("-", "").replace("_", "").isalnum():
                # Remove non-alphanumeric characters
                v = "".join(c for c in v if c.isalnum())
            return v if v else None
        return v  # type: ignore[return-value]

    @validator("expiration", pre=True)
    def empty_str_to_none(cls, v: Any) -> Any | None:
        """Convert empty strings to None for optional expiration field"""
        if v == "" or v is None:
            return None
        return v

    @validator("max_uses", pre=True)
    def handle_max_uses(cls, v: Any) -> int | None:
        """Convert empty string or NaN to None for max_uses"""
        if v == "" or v is None or (isinstance(v, float) and v != v):  # Check for NaN
            return None
        if isinstance(v, int | float):
            return int(v) if v > 0 else None
        return v  # type: ignore[no-any-return]

    @field_validator("expiration")  # type: ignore[type-var]
    @classmethod
    def validate_expiration(cls, v: datetime | None, values: dict[Any, Any]) -> datetime | None:
        """Ensure expiration is in the future if provided"""
        if v:
            # Make timezone-aware if needed
            now = datetime.now(UTC)
            if v.tzinfo is None:
                v = v.replace(tzinfo=UTC)
            if v <= now:
                raise ValueError("Expiration date must be in the future")
        return v

    @field_validator("active_on")
    @classmethod
    def validate_active_on(cls, v: datetime) -> datetime:
        """Ensure active_on is provided and reasonable"""
        if not v:
            raise ValueError("Active date is required")

        # Make timezone-aware if needed
        now = datetime.now(UTC)
        if v.tzinfo is None:
            v = v.replace(tzinfo=UTC)

        # Allow some tolerance for timezone differences (5 minutes)
        tolerance = now.replace(second=0, microsecond=0)
        tolerance = tolerance.replace(minute=tolerance.minute - 5)

        if v < tolerance:
            raise ValueError("Active date cannot be in the past")

        return v


class AccessLinkUpdate(BaseModel):
    """Schema for updating an existing access link - status is auto-calculated by backend"""

    name: str | None = Field(None, min_length=1, max_length=200)
    notes: str | None = None
    purpose: LinkPurpose | None = None
    active_on: datetime | None = None
    expiration: datetime | None = None
    max_uses: int | None = Field(None, ge=1)
    auto_open: bool | None = None


class AccessLinkResponse(AccessLinkBase):
    """Schema for access link responses"""

    id: str
    link_code: str
    status: LinkStatus
    created_at: datetime
    updated_at: datetime
    granted_count: int = 0
    denied_count: int = 0
    remaining_uses: int | None = None
    is_deleted: bool = False
    deleted_at: datetime | None = None
    owner_user_id: str | None = None
    owner_user_name: str | None = None

    class Config:
        from_attributes = True


class AccessLinkListResponse(BaseModel):
    """Schema for listing access links with pagination"""

    items: list[AccessLinkResponse]
    total: int
    page: int
    size: int
    pages: int


class AccessLinkPublic(BaseModel):
    """Public schema for access link validation (minimal info)"""

    is_valid: bool
    name: str
    notes: str | None = None
    message: str
    auto_open: bool = False
    active_on: datetime | None = None  # When link becomes active (for timezone-aware formatting)
    expiration: datetime | None = None  # When link expires (for timezone-aware formatting)


class AccessLinkStats(BaseModel):
    """Statistics for an access link"""

    id: str
    name: str
    link_code: str
    total_uses: int
    granted_count: int
    denied_count: int
    remaining_uses: int | None
    last_used: datetime | None
    created_at: datetime
