"""Refactor soft delete - add is_deleted and deleted_at fields

Revision ID: c8f4e9d1a2b3
Revises: 14b046dc2bca
Create Date: 2025-10-22 16:55:00.000000

Note: This migration does NOT modify the existing status enum type.
The 'deleted' enum value will remain in the database schema but will no longer be used.
Application-level filtering via is_deleted field handles soft deletes.

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "c8f4e9d1a2b3"
down_revision = "14b046dc2bca"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add is_deleted column with default False
    op.add_column(
        "access_links",
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
    )

    # Add deleted_at column (nullable)
    op.add_column(
        "access_links", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True)
    )

    # Create index on is_deleted for efficient filtering
    op.create_index("ix_access_links_is_deleted", "access_links", ["is_deleted"], unique=False)

    # Migrate existing records with status='deleted' to use is_deleted flag
    # Set status to 'inactive' for consistency with new model behavior
    # Works for both PostgreSQL (enum) and SQLite (string)
    op.execute(
        """
        UPDATE access_links
        SET
            is_deleted = true,
            deleted_at = updated_at,
            status = 'inactive'
        WHERE status = 'deleted'
    """
    )


def downgrade() -> None:
    # Migrate is_deleted back to status='deleted'
    # This restores the previous behavior
    op.execute(
        """
        UPDATE access_links
        SET status = 'deleted'
        WHERE is_deleted = true
    """
    )

    # Drop index
    op.drop_index("ix_access_links_is_deleted", table_name="access_links")

    # Drop columns
    op.drop_column("access_links", "deleted_at")
    op.drop_column("access_links", "is_deleted")
