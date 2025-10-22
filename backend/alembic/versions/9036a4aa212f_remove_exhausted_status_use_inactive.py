"""remove_exhausted_status_use_inactive

Revision ID: 9036a4aa212f
Revises: a1f2d3e4b5c6
Create Date: 2025-10-22 13:08:36.375634

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "9036a4aa212f"
down_revision: str | None = "a1f2d3e4b5c6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Convert all 'exhausted' status values to 'inactive'
    # This consolidates the status model - inactive now covers:
    # - Not yet active (before active_on)
    # - Expired (after expiration)
    # - Max uses exceeded (previously exhausted)
    op.execute(
        """
        UPDATE access_links
        SET status = 'inactive'
        WHERE status = 'exhausted'
        """
    )


def downgrade() -> None:
    # Note: We cannot reliably convert back to 'exhausted' because we don't know
    # which 'inactive' links were originally 'exhausted' vs expired/not-yet-active.
    # This is a one-way migration. Leaving inactive records as-is on downgrade.
    pass
