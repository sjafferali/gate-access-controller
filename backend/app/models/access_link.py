"""Access Link model for managing temporary gate access"""

from datetime import UTC, datetime
from enum import Enum as PyEnum
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    Enum,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from app.models.access_log import AccessLog

from app.db.base import Base
from app.models.base_model import BaseModelMixin


class LinkStatus(str, PyEnum):
    """Status options for access links"""

    ACTIVE = "active"
    EXPIRED = "expired"
    DISABLED = "disabled"
    DELETED = "deleted"


class LinkPurpose(str, PyEnum):
    """Purpose categories for access links"""

    DELIVERY = "delivery"
    RECURRING_DELIVERY = "recurring_delivery"
    VISITOR = "visitor"
    SERVICE = "service"
    EMERGENCY = "emergency"
    OTHER = "other"


class AccessLink(Base, BaseModelMixin):
    """Model for access links that grant temporary gate access"""

    __tablename__ = "access_links"
    __table_args__ = (UniqueConstraint("link_code", name="uq_access_links_link_code"),)

    # Link identification
    link_code: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        unique=True,
        index=True,
        comment="Unique code used to access the link",
    )

    # Status and lifecycle
    status: Mapped[LinkStatus] = mapped_column(
        Enum(LinkStatus),
        nullable=False,
        default=LinkStatus.ACTIVE,
        index=True,
        comment="Current status of the link",
    )

    # Temporal attributes
    active_on: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Date/time when the link becomes active",
    )
    expiration: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
        comment="Date/time when the link expires",
    )

    # Metadata
    name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        comment="Friendly name for the link",
    )
    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Additional notes or instructions",
    )
    purpose: Mapped[LinkPurpose] = mapped_column(
        Enum(LinkPurpose),
        nullable=False,
        default=LinkPurpose.OTHER,
        comment="Purpose category for the link",
    )

    # Usage tracking
    granted_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="Number of times access was granted",
    )
    denied_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="Number of times access was denied",
    )
    max_uses: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        comment="Maximum number of uses allowed (null = unlimited)",
    )

    # Relationships
    logs: Mapped[list["AccessLog"]] = relationship(
        "AccessLog",
        back_populates="link",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    @property
    def is_active(self) -> bool:
        """Check if the link is currently active"""
        if self.status != LinkStatus.ACTIVE:
            return False

        now = datetime.now(UTC)

        # Check if link is not yet active
        if self.active_on:
            active_on = (
                self.active_on if self.active_on.tzinfo else self.active_on.replace(tzinfo=UTC)
            )
            if now < active_on:
                return False

        # Check if link has expired
        if self.expiration:
            expiration = (
                self.expiration if self.expiration.tzinfo else self.expiration.replace(tzinfo=UTC)
            )
            if now > expiration:
                return False

        # Check if max uses exceeded
        if self.max_uses and self.granted_count >= self.max_uses:
            return False

        return True

    @property
    def remaining_uses(self) -> int | None:
        """Get the number of remaining uses for the link"""
        if self.max_uses is None:
            return None
        return max(0, self.max_uses - self.granted_count)

    @property
    def total_uses(self) -> int:
        """Get total number of times the link was used"""
        return self.granted_count + self.denied_count

    def can_grant_access(self) -> tuple[bool, str]:
        """
        Check if the link can grant access.

        Returns:
            tuple[bool, str]: (can_grant, reason_if_denied)
        """
        if self.status == LinkStatus.DELETED:
            return False, "Link has been deleted"

        if self.status == LinkStatus.DISABLED:
            return False, "Link has been disabled"

        if self.status == LinkStatus.EXPIRED:
            return False, "Link has expired"

        now = datetime.now(UTC)

        if self.active_on:
            active_on = (
                self.active_on if self.active_on.tzinfo else self.active_on.replace(tzinfo=UTC)
            )
            if now < active_on:
                return False, f"Link not active until {active_on.isoformat()}"

        if self.expiration:
            expiration = (
                self.expiration if self.expiration.tzinfo else self.expiration.replace(tzinfo=UTC)
            )
            if now > expiration:
                return False, "Link has expired"

        if self.max_uses and self.granted_count >= self.max_uses:
            return False, "Maximum uses exceeded"

        return True, "Access granted"

    def __repr__(self) -> str:
        return f"<AccessLink(id={self.id}, code={self.link_code}, name={self.name}, status={self.status.value})>"
