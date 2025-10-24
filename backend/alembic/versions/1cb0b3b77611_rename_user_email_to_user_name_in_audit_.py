"""rename_user_email_to_user_name_in_audit_logs

Revision ID: 1cb0b3b77611
Revises: 29d63a29a0d0
Create Date: 2025-10-23 21:45:36.507068

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "1cb0b3b77611"
down_revision: str | None = "29d63a29a0d0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Rename user_email column to user_name in audit_logs table
    op.alter_column("audit_logs", "user_email", new_column_name="user_name")


def downgrade() -> None:
    # Rename user_name column back to user_email in audit_logs table
    op.alter_column("audit_logs", "user_name", new_column_name="user_email")
