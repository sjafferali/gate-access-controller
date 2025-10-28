"""Notification Provider model for managing notification configurations"""

from datetime import UTC, datetime
from enum import Enum as PyEnum
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, Boolean, Column, DateTime, ForeignKey, String, Table
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from app.models.access_link import AccessLink

from app.db.base import Base
from app.models.base_model import BaseModelMixin


class NotificationProviderType(str, PyEnum):
    """Types of notification providers"""

    PUSHOVER = "pushover"
    WEBHOOK = "webhook"


# Association table for many-to-many relationship between links and notification providers
link_notification_providers = Table(
    "link_notification_providers",
    Base.metadata,
    Column(
        "link_id",
        String(36),
        ForeignKey("access_links.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "provider_id",
        String(36),
        ForeignKey("notification_providers.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class NotificationProvider(Base, BaseModelMixin):
    """Model for notification provider configurations"""

    __tablename__ = "notification_providers"

    # Provider identification
    name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        comment="Friendly name for this notification provider",
    )

    provider_type: Mapped[NotificationProviderType] = mapped_column(
        String(20),
        nullable=False,
        index=True,
        comment="Type of notification provider (pushover, webhook)",
    )

    # Provider configuration (JSON)
    # For Pushover: {"user_key": "...", "api_token": "...", "priority": 0, "sound": "pushover"}
    # For Webhook: {"url": "...", "method": "POST", "headers": {"key": "value"}, "body_template": "..."}
    config: Mapped[dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        comment="Provider-specific configuration as JSON",
    )

    # Status
    enabled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        index=True,
        comment="Whether this provider is enabled",
    )

    # Soft delete fields
    is_deleted: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        index=True,
        comment="Soft delete flag",
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp when the provider was deleted",
    )

    # Relationships
    links: Mapped[list["AccessLink"]] = relationship(
        "AccessLink",
        secondary=link_notification_providers,
        back_populates="notification_providers",
        lazy="selectin",
    )

    def delete(self) -> None:
        """Soft-delete this notification provider"""
        self.is_deleted = True
        self.deleted_at = datetime.now(UTC)
        self.enabled = False
        self.updated_at = datetime.now(UTC)

    def __repr__(self) -> str:
        return f"<NotificationProvider(id={self.id}, name={self.name}, type={self.provider_type}, enabled={self.enabled})>"
