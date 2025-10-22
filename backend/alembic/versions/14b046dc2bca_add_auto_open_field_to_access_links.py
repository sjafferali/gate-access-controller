"""add_auto_open_field_to_access_links

Revision ID: 14b046dc2bca
Revises: bd0a2bccf221
Create Date: 2025-10-22 07:12:19.861389

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "14b046dc2bca"
down_revision: str | None = "bd0a2bccf221"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Add auto_open column to access_links table
    op.add_column(
        "access_links",
        sa.Column(
            "auto_open",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("0"),
            comment="Automatically open gate when link is accessed (bypasses Request Access button)",
        ),
    )


def downgrade() -> None:
    # Remove auto_open column from access_links table
    op.drop_column("access_links", "auto_open")
