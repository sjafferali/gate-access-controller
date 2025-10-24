"""increase_user_id_length_in_audit_logs

Revision ID: cd3ba1fe957c
Revises: f4e88fac3e63
Create Date: 2025-10-24 13:24:22.276749

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cd3ba1fe957c'
down_revision: Union[str, None] = 'f4e88fac3e63'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Increase user_id column length from VARCHAR(36) to VARCHAR(512)
    # to accommodate OIDC subject identifiers which include issuer URLs
    op.alter_column(
        'audit_logs',
        'user_id',
        existing_type=sa.String(36),
        type_=sa.String(512),
        existing_nullable=True,
        existing_comment="ID of user who performed the action (OIDC subject, for future multi-user support)"
    )


def downgrade() -> None:
    # Revert user_id column length back to VARCHAR(36)
    # WARNING: This may truncate existing data if any user_id values exceed 36 characters
    op.alter_column(
        'audit_logs',
        'user_id',
        existing_type=sa.String(512),
        type_=sa.String(36),
        existing_nullable=True,
        existing_comment="ID of user who performed the action (for future multi-user support)"
    )