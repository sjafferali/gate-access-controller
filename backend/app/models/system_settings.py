"""System Settings model for storing application configuration"""

from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

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

    # Additional settings can be added here in the future
    # For now, focusing on webhook configuration
