"""Pydantic schemas for Notification Provider API endpoints"""

from datetime import datetime
from typing import Any

from app.models.notification_provider import NotificationProviderType
from pydantic import BaseModel, Field, field_validator


class PushoverConfig(BaseModel):
    """Configuration schema for Pushover notifications"""

    user_key: str = Field(..., min_length=1, description="Pushover user key")
    api_token: str = Field(..., min_length=1, description="Pushover application API token")
    priority: int = Field(0, ge=-2, le=2, description="Message priority (-2 to 2)")
    sound: str | None = Field("pushover", description="Notification sound")
    device: str | None = Field(None, description="Specific device name (optional)")


class WebhookConfig(BaseModel):
    """Configuration schema for webhook notifications"""

    url: str = Field(..., min_length=1, description="Webhook URL")
    method: str = Field("POST", description="HTTP method (GET, POST, PUT, PATCH)")
    headers: dict[str, str] = Field(default_factory=dict, description="Custom HTTP headers")
    body_template: str | None = Field(
        None,
        description="Request body template (supports {link_code}, {link_name}, {timestamp} placeholders)",
    )

    @field_validator("method")
    @classmethod
    def validate_method(cls, v: str) -> str:
        """Validate HTTP method"""
        v = v.upper()
        if v not in ["GET", "POST", "PUT", "PATCH", "DELETE"]:
            raise ValueError("Method must be GET, POST, PUT, PATCH, or DELETE")
        return v


class NotificationProviderBase(BaseModel):
    """Base schema for notification providers"""

    name: str = Field(..., min_length=1, max_length=200, description="Friendly name")
    provider_type: NotificationProviderType = Field(
        ..., description="Type of notification provider"
    )
    enabled: bool = Field(True, description="Whether this provider is enabled")


class NotificationProviderCreate(NotificationProviderBase):
    """Schema for creating a new notification provider"""

    config: dict[str, Any] = Field(..., description="Provider-specific configuration")

    @field_validator("config")
    @classmethod
    def validate_config(cls, v: dict[str, Any], info: Any) -> dict[str, Any]:
        """Validate configuration based on provider type"""
        provider_type = info.data.get("provider_type")

        if provider_type == NotificationProviderType.PUSHOVER:
            # Validate Pushover config
            try:
                PushoverConfig(**v)
            except Exception as e:
                raise ValueError(f"Invalid Pushover configuration: {e}") from e
        elif provider_type == NotificationProviderType.WEBHOOK:
            # Validate Webhook config
            try:
                WebhookConfig(**v)
            except Exception as e:
                raise ValueError(f"Invalid Webhook configuration: {e}") from e

        return v


class NotificationProviderUpdate(BaseModel):
    """Schema for updating an existing notification provider"""

    name: str | None = Field(None, min_length=1, max_length=200)
    config: dict[str, Any] | None = None
    enabled: bool | None = None

    @field_validator("config")
    @classmethod
    def validate_config(cls, v: dict[str, Any] | None, info: Any) -> dict[str, Any] | None:
        """Validate configuration based on provider type"""
        if v is None:
            return None

        provider_type = info.data.get("provider_type")

        if provider_type == NotificationProviderType.PUSHOVER:
            # Validate Pushover config
            try:
                PushoverConfig(**v)
            except Exception as e:
                raise ValueError(f"Invalid Pushover configuration: {e}") from e
        elif provider_type == NotificationProviderType.WEBHOOK:
            # Validate Webhook config
            try:
                WebhookConfig(**v)
            except Exception as e:
                raise ValueError(f"Invalid Webhook configuration: {e}") from e

        return v


class NotificationProviderResponse(NotificationProviderBase):
    """Schema for notification provider responses"""

    id: str
    config: dict[str, Any]
    created_at: datetime
    updated_at: datetime
    is_deleted: bool = False
    deleted_at: datetime | None = None

    class Config:
        from_attributes = True


class NotificationProviderListResponse(BaseModel):
    """Schema for listing notification providers with pagination"""

    items: list[NotificationProviderResponse]
    total: int
    page: int
    size: int
    pages: int


class NotificationProviderSummary(BaseModel):
    """Minimal notification provider info for dropdowns/selections"""

    id: str
    name: str
    provider_type: NotificationProviderType
    enabled: bool

    class Config:
        from_attributes = True
