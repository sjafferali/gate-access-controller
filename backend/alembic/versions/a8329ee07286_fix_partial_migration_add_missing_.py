"""Fix partial migration add missing notification columns

Revision ID: a8329ee07286
Revises: 3b1975444667
Create Date: 2025-10-28 07:22:29.318803

This migration fixes the partial state where oidc_scopes column exists
but the notification provider columns are missing.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect, text

# revision identifiers, used by Alembic.
revision: str = "a8329ee07286"
down_revision: str | None = "3b1975444667"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def column_exists(table_name: str, column_name: str) -> bool:
    """Check if a column exists in a table"""
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade() -> None:
    """
    Add missing notification provider columns to system_settings table.
    This migration is idempotent and can be run multiple times safely.
    """

    # Check and add default_notification_provider_ids if it doesn't exist
    if not column_exists('system_settings', 'default_notification_provider_ids'):
        with op.batch_alter_table('system_settings', schema=None) as batch_op:
            batch_op.add_column(
                sa.Column(
                    'default_notification_provider_ids',
                    sa.JSON(),
                    nullable=False,
                    server_default='[]',
                    comment='Default notification provider IDs for new links'
                )
            )

        # Remove server_default after adding the column
        with op.batch_alter_table('system_settings', schema=None) as batch_op:
            batch_op.alter_column(
                'default_notification_provider_ids',
                server_default=None
            )

    # Check and add quick_link_notification_provider_ids if it doesn't exist
    if not column_exists('system_settings', 'quick_link_notification_provider_ids'):
        with op.batch_alter_table('system_settings', schema=None) as batch_op:
            batch_op.add_column(
                sa.Column(
                    'quick_link_notification_provider_ids',
                    sa.JSON(),
                    nullable=False,
                    server_default='[]',
                    comment='Notification provider IDs for quick links'
                )
            )

        # Remove server_default after adding the column
        with op.batch_alter_table('system_settings', schema=None) as batch_op:
            batch_op.alter_column(
                'quick_link_notification_provider_ids',
                server_default=None
            )

    # Verify notification provider tables exist (they should from the previous migration)
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = inspector.get_table_names()

    if 'notification_providers' not in tables:
        print("Warning: notification_providers table doesn't exist. Previous migration may not have completed.")
        # You could recreate the tables here if needed

    if 'link_notification_providers' not in tables:
        print("Warning: link_notification_providers table doesn't exist. Previous migration may not have completed.")
        # You could recreate the tables here if needed


def downgrade() -> None:
    """
    Remove the notification provider columns if they exist
    """
    if column_exists('system_settings', 'quick_link_notification_provider_ids'):
        with op.batch_alter_table('system_settings', schema=None) as batch_op:
            batch_op.drop_column('quick_link_notification_provider_ids')

    if column_exists('system_settings', 'default_notification_provider_ids'):
        with op.batch_alter_table('system_settings', schema=None) as batch_op:
            batch_op.drop_column('default_notification_provider_ids')