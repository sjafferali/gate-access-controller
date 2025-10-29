"""Access Log model for tracking gate access attempts"""

from datetime import datetime
from enum import Enum as PyEnum
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from app.models.access_link import AccessLink

from app.db.base import Base
from app.models.base_model import BaseModelMixin


class AccessStatus(str, PyEnum):
    """Status of access attempt"""

    GRANTED = "granted"
    DENIED = "denied"
    ERROR = "error"


class DenialReason(str, PyEnum):
    """Reasons for access denial"""

    EXPIRED = "expired"
    DISABLED = "disabled"
    DELETED = "deleted"
    NOT_ACTIVE_YET = "not_active_yet"
    MAX_USES_EXCEEDED = "max_uses_exceeded"
    INVALID_CODE = "invalid_code"
    WEBHOOK_FAILED = "webhook_failed"
    RATE_LIMITED = "rate_limited"
    OTHER = "other"


class AccessLog(Base, BaseModelMixin):
    """Model for logging all access attempts"""

    __tablename__ = "access_logs"

    # Link reference
    link_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("access_links.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="Reference to the access link used",
    )

    # Access details
    status: Mapped[AccessStatus] = mapped_column(
        String(20),
        nullable=False,
        index=True,
        comment="Status of the access attempt",
    )

    # Request information
    ip_address: Mapped[str] = mapped_column(
        String(45),  # Support IPv6
        nullable=False,
        index=True,
        comment="IP address of the requester",
    )
    user_agent: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="User agent string from the request",
    )

    # Additional context
    denial_reason: Mapped[DenialReason | None] = mapped_column(
        String(30),
        nullable=True,
        comment="Reason for denial if access was denied",
    )
    error_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Error message if an error occurred",
    )

    # Link code at time of access (in case link is deleted)
    link_code_used: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        comment="The link code that was attempted",
    )

    # Response times
    webhook_response_time_ms: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        comment="Time taken for webhook response in milliseconds",
    )

    # Geographic information (optional, can be added later)
    country: Mapped[str | None] = mapped_column(
        String(2),  # ISO country code
        nullable=True,
        comment="Country code from IP geolocation",
    )
    region: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        comment="Region/state from IP geolocation",
    )
    city: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        comment="City from IP geolocation",
    )

    # Timestamp (using server time for consistency)
    accessed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
        comment="Timestamp of the access attempt",
    )

    # Relationships
    link: Mapped[Optional["AccessLink"]] = relationship(
        "AccessLink",
        back_populates="logs",
        lazy="joined",
    )

    @property
    def was_successful(self) -> bool:
        """Check if the access attempt was successful"""
        return self.status == AccessStatus.GRANTED

    @property
    def link_name(self) -> str | None:
        """Get the name of the associated link if it exists"""
        return self.link.name if self.link else None

    def __repr__(self) -> str:
        return f"<AccessLog(id={self.id}, status={self.status}, ip={self.ip_address}, link_code={self.link_code_used})>"
