"""System Settings schemas for API requests and responses"""

from datetime import datetime

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

    # URL Settings
    admin_url: str | None = Field(
        None, description="Admin URL for configuration and management interface (e.g., admin.example.com)"
    )
    links_url: str | None = Field(
        None, description="Links URL for public access links (e.g., x.com)"
    )

    # OIDC Settings
    oidc_enabled: bool = Field(False, description="Enable OpenID Connect authentication")
    oidc_issuer: str | None = Field(
        None, description="OIDC Issuer URL (e.g., https://auth.example.com)"
    )
    oidc_client_id: str | None = Field(None, description="OIDC Client ID")
    oidc_redirect_uri: str | None = Field(
        None, description="OIDC Redirect URI (e.g., http://localhost:3000/auth/callback)"
    )
    oidc_scopes: str | None = Field(
        "openid,profile,email", description="OIDC Scopes (comma-separated)"
    )


class SystemSettingsCreate(SystemSettingsBase):
    """Schema for creating/updating system settings"""

    # Client secret is write-only and not part of base schema
    oidc_client_secret: str | None = Field(
        None, description="OIDC Client Secret (write-only, will be encrypted)"
    )


class SystemSettingsResponse(SystemSettingsBase):
    """Schema for system settings response"""

    id: str
    created_at: datetime
    updated_at: datetime
    oidc_client_secret_set: bool = Field(
        False, description="Whether OIDC client secret is configured (secret is never returned)"
    )

    class Config:
        from_attributes = True
