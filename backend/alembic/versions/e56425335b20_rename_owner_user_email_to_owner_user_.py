"""rename_owner_user_email_to_owner_user_name_in_access_links

Revision ID: e56425335b20
Revises: 1cb0b3b77611
Create Date: 2025-10-23 22:19:32.688150

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e56425335b20'
down_revision: Union[str, None] = '1cb0b3b77611'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Rename owner_user_email column to owner_user_name in access_links table
    op.alter_column('access_links', 'owner_user_email', new_column_name='owner_user_name')


def downgrade() -> None:
    # Rename owner_user_name column back to owner_user_email in access_links table
    op.alter_column('access_links', 'owner_user_name', new_column_name='owner_user_email')