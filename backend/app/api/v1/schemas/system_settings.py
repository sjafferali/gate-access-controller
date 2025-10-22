"""System Settings schemas for API requests and responses"""

from pydantic import BaseModel, Field


class SystemSettingsBase(BaseModel):
    """Base schema for system settings"""

    webhook_url: str | None = Field(None, description="URL to send gate open requests to")
    webhook_token: str | None = Field(None, description="Bearer token for webhook authentication")
    webhook_timeout: int = Field(10, ge=1, le=60, description="Webhook timeout in seconds")
    webhook_retries: int = Field(3, ge=0, le=10, description="Number of webhook retry attempts")
    gate_open_duration_seconds: int = Field(
        5,
        ge=1,
        le=60,
        description="Duration to keep gate open in seconds",
    )


class SystemSettingsCreate(SystemSettingsBase):
    """Schema for creating/updating system settings"""

    pass


class SystemSettingsResponse(SystemSettingsBase):
    """Schema for system settings response"""

    id: str
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True
