"""Convert PostgreSQL ENUMs to VARCHAR strings

Revision ID: a1f2d3e4b5c6
Revises: c8f4e9d1a2b3
Create Date: 2025-10-22 17:30:00.000000

This migration converts all PostgreSQL ENUM types to VARCHAR for easier maintenance.
SQLite already uses strings, so this only affects PostgreSQL.

No downgrade provided - this is a one-way migration.

ENUMs being converted:
- linkstatus (access_links.status)
- linkpurpose (access_links.purpose)
- accessstatus (access_logs.status)
- denialreason (access_logs.denial_reason)

"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "a1f2d3e4b5c6"
down_revision = "c8f4e9d1a2b3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Detect database type
    bind = op.get_bind()
    dialect_name = bind.dialect.name

    # Only run on PostgreSQL (SQLite already uses strings)
    if dialect_name == "postgresql":
        # Convert access_links.status from ENUM to VARCHAR
        op.execute(
            """
            ALTER TABLE access_links
            ALTER COLUMN status TYPE VARCHAR(20)
            USING status::text
        """
        )

        # Convert access_links.purpose from ENUM to VARCHAR
        op.execute(
            """
            ALTER TABLE access_links
            ALTER COLUMN purpose TYPE VARCHAR(30)
            USING purpose::text
        """
        )

        # Convert access_logs.status from ENUM to VARCHAR
        op.execute(
            """
            ALTER TABLE access_logs
            ALTER COLUMN status TYPE VARCHAR(20)
            USING status::text
        """
        )

        # Convert access_logs.denial_reason from ENUM to VARCHAR
        # This column is nullable
        op.execute(
            """
            ALTER TABLE access_logs
            ALTER COLUMN denial_reason TYPE VARCHAR(30)
            USING denial_reason::text
        """
        )

        # Drop all enum types (now unused)
        # Note: These may fail if any other objects depend on them, which is expected
        op.execute("DROP TYPE IF EXISTS linkstatus")
        op.execute("DROP TYPE IF EXISTS linkpurpose")
        op.execute("DROP TYPE IF EXISTS accessstatus")
        op.execute("DROP TYPE IF EXISTS denialreason")


def downgrade() -> None:
    # No downgrade - this is a one-way migration
    # If rollback is needed, restore from backup
    raise NotImplementedError(
        "Downgrade not supported for enum to string conversion. "
        "Restore from database backup if rollback is required."
    )
