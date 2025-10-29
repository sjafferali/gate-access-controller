"""add_session_secret_key_to_system_settings

Revision ID: c04e67e10eba
Revises: bd357bf7a8d8
Create Date: 2025-10-29 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c04e67e10eba"
down_revision: str | None = "bd357bf7a8d8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Add session_secret_key column to system_settings table
    op.add_column(
        "system_settings",
        sa.Column(
            "session_secret_key",
            sa.Text(),
            nullable=True,
            comment="Persistent session secret key for cookie signatures",
        ),
    )


def downgrade() -> None:
    # Remove session_secret_key column from system_settings table
    op.drop_column("system_settings", "session_secret_key")
