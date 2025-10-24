"""add_audit_logs_table_for_tracking_link_changes

Revision ID: b80646871dac
Revises: 9036a4aa212f
Create Date: 2025-10-23 07:38:24.939416

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b80646871dac"
down_revision: str | None = "9036a4aa212f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create audit_logs table for tracking changes to access links"""
    op.create_table(
        "audit_logs",
        # Primary key and timestamps from BaseModelMixin
        sa.Column(
            "id",
            sa.String(36),
            primary_key=True,
            nullable=False,
            comment="Unique identifier (UUID)",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
            comment="Timestamp when record was created",
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
            comment="Timestamp when record was last updated",
        ),
        # Action details
        sa.Column(
            "action",
            sa.String(50),
            nullable=False,
            index=True,
            comment="Type of action performed (e.g., LINK_CREATED, LINK_UPDATED)",
        ),
        sa.Column(
            "resource_type",
            sa.String(50),
            nullable=False,
            index=True,
            comment="Type of resource affected (e.g., ACCESS_LINK)",
        ),
        sa.Column(
            "resource_id",
            sa.String(36),
            nullable=False,
            index=True,
            comment="ID of the resource affected",
        ),
        # Link-specific fields for quick reference
        sa.Column(
            "link_code",
            sa.String(50),
            nullable=True,
            index=True,
            comment="Link code at time of action",
        ),
        sa.Column(
            "link_name",
            sa.String(200),
            nullable=True,
            comment="Link name at time of action",
        ),
        # User fields (for future multi-user support)
        sa.Column(
            "user_id",
            sa.String(36),
            nullable=True,
            index=True,
            comment="ID of user who performed the action (for future multi-user support)",
        ),
        sa.Column(
            "user_email",
            sa.String(255),
            nullable=True,
            index=True,
            comment="Email of user who performed the action (for future multi-user support)",
        ),
        # Request context
        sa.Column(
            "ip_address",
            sa.String(45),
            nullable=True,
            index=True,
            comment="IP address from which the action was performed",
        ),
        sa.Column(
            "user_agent",
            sa.Text(),
            nullable=True,
            comment="User agent string from the request",
        ),
        # Change tracking
        sa.Column(
            "changes",
            sa.JSON(),
            nullable=True,
            comment="Old and new values for updated fields (format: {'field_name': {'old': value, 'new': value}})",
        ),
        sa.Column(
            "context_data",
            sa.JSON(),
            nullable=True,
            comment="Additional context or metadata about the action",
        ),
    )

    # Create composite indexes for common query patterns
    op.create_index(
        "ix_audit_logs_resource_type_resource_id",
        "audit_logs",
        ["resource_type", "resource_id"],
    )
    op.create_index(
        "ix_audit_logs_action_created_at",
        "audit_logs",
        ["action", "created_at"],
    )
    op.create_index(
        "ix_audit_logs_created_at",
        "audit_logs",
        ["created_at"],
    )


def downgrade() -> None:
    """Drop audit_logs table"""
    op.drop_index("ix_audit_logs_created_at", "audit_logs")
    op.drop_index("ix_audit_logs_action_created_at", "audit_logs")
    op.drop_index("ix_audit_logs_resource_type_resource_id", "audit_logs")
    op.drop_table("audit_logs")