"""Audit log model for tracking changes to access links"""

import enum
from typing import Any

from sqlalchemy import JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.base_model import BaseModelMixin


class AuditAction(str, enum.Enum):
    """Enum for audit log actions"""

    LINK_CREATED = "LINK_CREATED"
    LINK_UPDATED = "LINK_UPDATED"
    LINK_DELETED = "LINK_DELETED"
    LINK_DISABLED = "LINK_DISABLED"
    LINK_ENABLED = "LINK_ENABLED"
    LINK_CODE_REGENERATED = "LINK_CODE_REGENERATED"
    NOTIFICATION_PROVIDER_CREATED = "NOTIFICATION_PROVIDER_CREATED"
    NOTIFICATION_PROVIDER_UPDATED = "NOTIFICATION_PROVIDER_UPDATED"
    NOTIFICATION_PROVIDER_DELETED = "NOTIFICATION_PROVIDER_DELETED"


class ResourceType(str, enum.Enum):
    """Enum for resource types (for future expansion)"""

    ACCESS_LINK = "ACCESS_LINK"
    NOTIFICATION_PROVIDER = "NOTIFICATION_PROVIDER"


class AuditLog(Base, BaseModelMixin):
    """Model for audit logs tracking changes to resources"""

    __tablename__ = "audit_logs"

    # Action details
    action: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        comment="Type of action performed (e.g., LINK_CREATED, LINK_UPDATED)",
    )

    resource_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        comment="Type of resource affected (e.g., ACCESS_LINK)",
    )

    resource_id: Mapped[str] = mapped_column(
        String(36),
        nullable=False,
        index=True,
        comment="ID of the resource affected",
    )

    # Link-specific fields for quick reference
    link_code: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        index=True,
        comment="Link code at time of action",
    )

    link_name: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
        comment="Link name at time of action",
    )

    # User fields (for future multi-user support)
    user_id: Mapped[str | None] = mapped_column(
        String(512),
        nullable=True,
        index=True,
        comment="ID of user who performed the action (OIDC subject, for future multi-user support)",
    )

    user_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        index=True,
        comment="Display name of user who performed the action",
    )

    # Request context
    ip_address: Mapped[str | None] = mapped_column(
        String(45),
        nullable=True,
        index=True,
        comment="IP address from which the action was performed",
    )

    user_agent: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="User agent string from the request",
    )

    # Change tracking
    changes: Mapped[dict[str, Any] | None] = mapped_column(
        JSON,
        nullable=True,
        comment="Old and new values for updated fields (format: {'field_name': {'old': value, 'new': value}})",
    )

    context_data: Mapped[dict[str, Any] | None] = mapped_column(
        JSON,
        nullable=True,
        comment="Additional context or metadata about the action",
    )

    # Timestamps are inherited from BaseModelMixin (created_at, updated_at)
    # ID is inherited from BaseModelMixin

    def __repr__(self) -> str:
        """String representation of audit log"""
        return (
            f"<AuditLog(id={self.id}, action={self.action}, "
            f"resource_type={self.resource_type}, resource_id={self.resource_id}, "
            f"created_at={self.created_at})>"
        )

    @property
    def action_display(self) -> str:
        """Human-readable action name"""
        action_map = {
            AuditAction.LINK_CREATED: "Link Created",
            AuditAction.LINK_UPDATED: "Link Updated",
            AuditAction.LINK_DELETED: "Link Deleted",
            AuditAction.LINK_DISABLED: "Link Disabled",
            AuditAction.LINK_ENABLED: "Link Enabled",
            AuditAction.LINK_CODE_REGENERATED: "Link Code Regenerated",
        }
        return action_map.get(AuditAction(self.action), self.action)

    @property
    def summary(self) -> str:
        """Generate a human-readable summary of the action"""
        action_name = self.action_display
        link_identifier = self.link_name or self.link_code or self.resource_id

        if self.action == AuditAction.LINK_CREATED:
            return f"Created link '{link_identifier}'"
        elif self.action == AuditAction.LINK_UPDATED:
            if self.changes:
                fields = ", ".join(self.changes.keys())
                return f"Updated {fields} for link '{link_identifier}'"
            return f"Updated link '{link_identifier}'"
        elif self.action == AuditAction.LINK_DELETED:
            return f"Deleted link '{link_identifier}'"
        elif self.action == AuditAction.LINK_DISABLED:
            return f"Disabled link '{link_identifier}'"
        elif self.action == AuditAction.LINK_ENABLED:
            return f"Enabled link '{link_identifier}'"
        elif self.action == AuditAction.LINK_CODE_REGENERATED:
            if self.changes and "link_code" in self.changes:
                old_code = self.changes["link_code"].get("old")
                new_code = self.changes["link_code"].get("new")
                return f"Regenerated code for '{link_identifier}' from {old_code} to {new_code}"
            return f"Regenerated code for link '{link_identifier}'"
        else:
            return f"{action_name} on '{link_identifier}'"

    def to_dict(self) -> dict[str, Any]:
        """Convert audit log to dictionary with additional computed fields"""
        result = super().to_dict()
        result["action_display"] = self.action_display
        result["summary"] = self.summary
        return result
