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
    from app.models.notification_provider import NotificationProvider

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


def format_datetime_friendly(dt: datetime) -> str:
    """
    Format a datetime object in a user-friendly way.

    Args:
        dt: The datetime object to format (should be timezone-aware)

    Returns:
        A human-readable string like "October 23, 2025 at 10:44 AM UTC"
    """
    # Ensure the datetime has timezone info
    if not dt.tzinfo:
        dt = dt.replace(tzinfo=UTC)

    # Format: "Month DD, YYYY at HH:MM AM/PM UTC"
    return dt.strftime("%B %d, %Y at %I:%M %p %Z")


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

    # Owner tracking
    owner_user_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        comment="User ID of the person who created this link",
    )
    owner_user_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        comment="Display name of the person who created this link",
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
    last_accessed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp of the last successful access for rate limiting",
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
    notification_providers: Mapped[list["NotificationProvider"]] = relationship(
        "NotificationProvider",
        secondary="link_notification_providers",
        back_populates="links",
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

    def can_grant_access(self, cooldown_seconds: int = 60) -> tuple[bool, str]:
        """
        Check if the link can grant access.

        Args:
            cooldown_seconds: The cooldown time in seconds (default 60)

        Returns:
            tuple[bool, str]: (can_grant, reason_if_denied)
        """
        # Check deleted first (highest priority denial reason)
        if self.is_deleted:
            return False, "Link no longer exists"

        if self.status == LinkStatus.DISABLED:
            return False, "Link has been disabled"

        # Check rate limiting - link can only be used once per cooldown period
        if cooldown_seconds > 0 and self.last_accessed_at:
            now = datetime.now(UTC)
            last_accessed = (
                self.last_accessed_at
                if self.last_accessed_at.tzinfo
                else self.last_accessed_at.replace(tzinfo=UTC)
            )
            time_since_last_access = (now - last_accessed).total_seconds()

            if time_since_last_access < cooldown_seconds:
                wait_time = int(cooldown_seconds - time_since_last_access)
                return (
                    False,
                    f"Link was recently used. Please wait {wait_time} seconds before trying again",
                )

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
                    return False, f"Link not active until {format_datetime_friendly(active_on)}"

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
                return False, f"Link not active until {format_datetime_friendly(active_on)}"

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

        This method uses the central calculate_link_status() utility function to
        determine the correct status. See app.utils.link_status for the complete
        status calculation logic.

        Returns:
            bool: True if status was changed, False otherwise
        """
        from app.utils.link_status import calculate_link_status

        # Store original status for comparison
        original_status = self.status

        # Calculate the new status using the central utility function
        new_status = calculate_link_status(self)

        # Update the status if it changed
        if new_status != original_status:
            self.status = new_status
            return True

        return False

    def delete(self) -> None:
        """
        Soft-delete this link.

        Sets:
        - is_deleted = True
        - deleted_at = current UTC time
        - status = INACTIVE (calculated via central function)

        This operation is NOT reversible.
        """
        from app.utils.link_status import calculate_link_status

        self.is_deleted = True
        self.deleted_at = datetime.now(UTC)
        # Calculate status (will be INACTIVE since is_deleted=True)
        self.status = calculate_link_status(self)
        self.updated_at = datetime.now(UTC)

    def disable(self) -> None:
        """
        Manually disable this link (reversible).

        Sets status to DISABLED which prevents the link from granting access
        and prevents automatic status recalculation. Can be re-enabled with enable() method.

        Note: DISABLED status is set directly without using calculate_link_status()
        because it's a manual override by the user.

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

        If currently DISABLED, recalculates the proper status based on expiration,
        active_on, max_uses, etc. The link will become ACTIVE if all conditions are met,
        or INACTIVE if expired/max uses exceeded.

        Returns:
            bool: True if status was changed, False otherwise

        Raises:
            ValueError: If link is deleted
        """
        if self.is_deleted:
            raise ValueError("Cannot enable a deleted link")

        if self.status == LinkStatus.DISABLED:
            # Temporarily set to ACTIVE to bypass the DISABLED preservation
            # in calculate_link_status(). This allows the central function to
            # properly evaluate expiration, max_uses, etc.
            self.status = LinkStatus.ACTIVE

            # Now recalculate status - will stay ACTIVE or become INACTIVE
            # based on temporal/usage constraints
            self.update_status()

            # We definitely changed from DISABLED to something else, so return True
            return True

        return False

    def __repr__(self) -> str:
        return f"<AccessLink(id={self.id}, code={self.link_code}, name={self.name}, status={self.status})>"
