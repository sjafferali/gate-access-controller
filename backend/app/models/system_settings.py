"""System Settings model for storing application configuration"""

import base64

from cryptography.fernet import Fernet
from sqlalchemy import JSON, Boolean, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.config import settings
from app.db.base import Base
from app.models.base_model import BaseModelMixin


class SystemSettings(Base, BaseModelMixin):
    """Model for system-wide settings stored in database"""

    __tablename__ = "system_settings"

    # Webhook Settings
    webhook_url: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="URL to send gate open requests to",
    )
    webhook_token: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
        comment="Bearer token for webhook authentication",
    )
    webhook_timeout: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=10,
        comment="Webhook timeout in seconds",
    )
    webhook_retries: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=3,
        comment="Number of webhook retry attempts",
    )
    gate_open_duration_seconds: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=5,
        comment="Duration to keep gate open in seconds",
    )

    # URL Settings
    admin_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
        comment="Admin URL for configuration and management interface (e.g., admin.example.com)",
    )
    links_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
        comment="Links URL for public access links (e.g., x.com)",
    )

    # OIDC Settings
    oidc_enabled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        comment="Enable OpenID Connect authentication",
    )
    oidc_issuer: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
        comment="OIDC Issuer URL (e.g., https://auth.example.com)",
    )
    oidc_client_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        comment="OIDC Client ID",
    )
    oidc_client_secret: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="OIDC Client Secret (encrypted)",
    )
    oidc_redirect_uri: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
        comment="OIDC Redirect URI (e.g., http://localhost:3000/auth/callback)",
    )
    oidc_scopes: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
        default="openid,profile,email",
        comment="OIDC Scopes (comma-separated)",
    )

    # Notification Settings - Default providers
    default_notification_provider_ids: Mapped[list[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
        comment="Default notification provider IDs for new links",
    )
    quick_link_notification_provider_ids: Mapped[list[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
        comment="Notification provider IDs for quick links",
    )

    @staticmethod
    def _get_cipher() -> Fernet:
        """Get Fernet cipher for encryption/decryption using app SECRET_KEY"""
        # Derive a proper Fernet key from SECRET_KEY
        key = base64.urlsafe_b64encode(settings.SECRET_KEY.encode()[:32].ljust(32, b"\0"))
        return Fernet(key)

    def set_oidc_client_secret(self, secret: str | None) -> None:
        """Encrypt and set OIDC client secret"""
        if secret:
            cipher = self._get_cipher()
            self.oidc_client_secret = cipher.encrypt(secret.encode()).decode()
        else:
            self.oidc_client_secret = None

    def get_oidc_client_secret(self) -> str | None:
        """Decrypt and get OIDC client secret"""
        if not self.oidc_client_secret:
            return None
        try:
            cipher = self._get_cipher()
            return cipher.decrypt(self.oidc_client_secret.encode()).decode()
        except Exception as e:
            # If decryption fails, log the error and return None
            from app.core.logging import logger

            logger.error(
                "Failed to decrypt OIDC client secret. This usually means SECRET_KEY has changed.",
                error=str(e),
                error_type=type(e).__name__,
            )
            return None
