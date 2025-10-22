"""Access Link model for managing temporary gate access"""

from datetime import UTC, datetime
from enum import Enum as PyEnum
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    DateTime,
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
    INACTIVE = "inactive"
    DISABLED = "disabled"


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
        String(20),
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
        String(30),
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

    # Auto-open feature
    auto_open: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        comment="Automatically open gate when link is accessed (bypasses Request Access button)",
    )

    # Soft delete fields
    is_deleted: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        index=True,
        comment="Soft delete flag - deleted links are hidden by default",
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp when the link was deleted",
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
        # Check deleted first (highest priority denial reason)
        if self.is_deleted:
            return False, "Link no longer exists"

        if self.status == LinkStatus.DISABLED:
            return False, "Link has been disabled"

        if self.status == LinkStatus.INACTIVE:
            # Provide specific message based on why it's inactive
            now = datetime.now(UTC)

            # Check if max uses exceeded
            if self.max_uses and self.granted_count >= self.max_uses:
                return False, "Maximum uses exceeded"

            if self.active_on:
                active_on = (
                    self.active_on if self.active_on.tzinfo else self.active_on.replace(tzinfo=UTC)
                )
                if now < active_on:
                    return False, f"Link not active until {active_on.isoformat()}"

            if self.expiration:
                expiration = (
                    self.expiration
                    if self.expiration.tzinfo
                    else self.expiration.replace(tzinfo=UTC)
                )
                if now > expiration:
                    return False, "Link has expired"

            return False, "Link is inactive"

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

    def update_status(self) -> bool:
        """
        Automatically calculate and update the link status based on current properties.
        This should be called after updating active_on, expiration, or max_uses.

        Status logic:
        - If is_deleted=True: Skip calculation (deleted links frozen at INACTIVE)
        - DISABLED: Manually set, not auto-calculated
        - INACTIVE: Outside active time window (before active_on OR after expiration) OR max uses exceeded
        - ACTIVE: All conditions are met for the link to be usable

        Returns:
            bool: True if status was changed, False otherwise
        """
        # Store original status for comparison
        original_status = self.status

        # Don't auto-update if deleted or manually disabled
        if self.is_deleted or self.status == LinkStatus.DISABLED:
            return False

        now = datetime.now(UTC)

        # Check if not yet active (before start)
        if self.active_on:
            active_on = (
                self.active_on if self.active_on.tzinfo else self.active_on.replace(tzinfo=UTC)
            )
            if now < active_on:
                self.status = LinkStatus.INACTIVE
                return self.status != original_status

        # Check if expired (after end)
        if self.expiration:
            expiration = (
                self.expiration if self.expiration.tzinfo else self.expiration.replace(tzinfo=UTC)
            )
            if now > expiration:
                self.status = LinkStatus.INACTIVE
                return self.status != original_status

        # Check if max uses exceeded
        if self.max_uses and self.granted_count >= self.max_uses:
            self.status = LinkStatus.INACTIVE
            return self.status != original_status

        # Otherwise, link should be ACTIVE
        self.status = LinkStatus.ACTIVE
        return self.status != original_status

    def delete(self) -> None:
        """
        Soft-delete this link.

        Sets:
        - is_deleted = True
        - deleted_at = current UTC time
        - status = INACTIVE (frozen, won't recalculate)

        This operation is NOT reversible.
        """
        self.is_deleted = True
        self.deleted_at = datetime.now(UTC)
        self.status = LinkStatus.INACTIVE
        self.updated_at = datetime.now(UTC)

    def disable(self) -> None:
        """
        Manually disable this link (reversible).

        Sets status to DISABLED which prevents the link from granting access
        and prevents automatic status recalculation. Can be re-enabled with enable() method.

        Raises:
            ValueError: If link is already deleted
        """
        if self.is_deleted:
            raise ValueError("Cannot disable a deleted link")

        self.status = LinkStatus.DISABLED
        self.updated_at = datetime.now(UTC)

    def enable(self) -> bool:
        """
        Re-enable a disabled link.

        If currently DISABLED, recalculates the proper status.
        Returns True if status was changed.

        Returns:
            bool: True if status was changed, False otherwise

        Raises:
            ValueError: If link is deleted
        """
        if self.is_deleted:
            raise ValueError("Cannot enable a deleted link")

        if self.status == LinkStatus.DISABLED:
            return self.update_status()

        return False

    def __repr__(self) -> str:
        return f"<AccessLink(id={self.id}, code={self.link_code}, name={self.name}, status={self.status})>"
