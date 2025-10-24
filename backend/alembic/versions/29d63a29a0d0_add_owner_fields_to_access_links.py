"""add_owner_fields_to_access_links

Revision ID: 29d63a29a0d0
Revises: c250991ca154
Create Date: 2025-10-23 16:24:20.160494

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "29d63a29a0d0"
down_revision: str | None = "c250991ca154"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Add owner fields to access_links table to track who created each link
    op.add_column(
        "access_links",
        sa.Column(
            "owner_user_id",
            sa.String(length=255),
            nullable=True,
            comment="User ID of the person who created this link",
        ),
    )
    op.add_column(
        "access_links",
        sa.Column(
            "owner_user_email",
            sa.String(length=255),
            nullable=True,
            comment="Email address of the person who created this link",
        ),
    )


def downgrade() -> None:
    # Remove owner fields from access_links table
    op.drop_column("access_links", "owner_user_email")
    op.drop_column("access_links", "owner_user_id")
