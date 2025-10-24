"""add_admin_url_and_links_url_to_system_settings

Revision ID: f4e88fac3e63
Revises: e56425335b20
Create Date: 2025-10-23 22:43:23.514894

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f4e88fac3e63"
down_revision: str | None = "e56425335b20"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Add URL configuration columns to system_settings table
    op.add_column(
        "system_settings",
        sa.Column(
            "admin_url",
            sa.String(length=500),
            nullable=True,
            comment="Admin URL for configuration and management interface (e.g., admin.example.com)",
        ),
    )
    op.add_column(
        "system_settings",
        sa.Column(
            "links_url",
            sa.String(length=500),
            nullable=True,
            comment="Links URL for public access links (e.g., x.com)",
        ),
    )


def downgrade() -> None:
    # Remove URL configuration columns
    op.drop_column("system_settings", "links_url")
    op.drop_column("system_settings", "admin_url")
