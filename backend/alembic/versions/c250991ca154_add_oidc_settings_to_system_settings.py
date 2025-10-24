"""add_oidc_settings_to_system_settings

Revision ID: c250991ca154
Revises: b80646871dac
Create Date: 2025-10-23 10:14:34.125045

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c250991ca154"
down_revision: str | None = "b80646871dac"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Add OIDC configuration columns to system_settings table
    op.add_column(
        "system_settings",
        sa.Column(
            "oidc_enabled",
            sa.Boolean(),
            nullable=False,
            server_default="0",
            comment="Enable OpenID Connect authentication",
        ),
    )
    op.add_column(
        "system_settings",
        sa.Column(
            "oidc_issuer",
            sa.String(length=500),
            nullable=True,
            comment="OIDC Issuer URL (e.g., https://auth.example.com)",
        ),
    )
    op.add_column(
        "system_settings",
        sa.Column("oidc_client_id", sa.String(length=255), nullable=True, comment="OIDC Client ID"),
    )
    op.add_column(
        "system_settings",
        sa.Column(
            "oidc_client_secret", sa.Text(), nullable=True, comment="OIDC Client Secret (encrypted)"
        ),
    )
    op.add_column(
        "system_settings",
        sa.Column(
            "oidc_redirect_uri",
            sa.String(length=500),
            nullable=True,
            comment="OIDC Redirect URI (e.g., http://localhost:3000/auth/callback)",
        ),
    )
    op.add_column(
        "system_settings",
        sa.Column(
            "oidc_scopes",
            sa.String(length=500),
            nullable=True,
            server_default="openid,profile,email",
            comment="OIDC Scopes (comma-separated)",
        ),
    )


def downgrade() -> None:
    # Remove OIDC configuration columns
    op.drop_column("system_settings", "oidc_scopes")
    op.drop_column("system_settings", "oidc_redirect_uri")
    op.drop_column("system_settings", "oidc_client_secret")
    op.drop_column("system_settings", "oidc_client_id")
    op.drop_column("system_settings", "oidc_issuer")
    op.drop_column("system_settings", "oidc_enabled")
