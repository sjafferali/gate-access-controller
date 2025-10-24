"""System Settings API endpoints"""

from datetime import UTC
from typing import Any

from app.api.v1.schemas import MessageResponse, SystemSettingsCreate, SystemSettingsResponse
from app.core.logging import logger
from app.db.base import get_db
from app.models.system_settings import SystemSettings
from app.services.oidc_service import oidc_service
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


@router.get("", response_model=SystemSettingsResponse)
async def get_system_settings(db: AsyncSession = Depends(get_db)) -> Any:
    """
    Get system settings.

    Returns the current system settings. If no settings exist yet,
    returns default values.
    """
    try:
        # Try to get existing settings (should only be one row)
        result = await db.execute(select(SystemSettings).limit(1))
        settings = result.scalar_one_or_none()

        if not settings:
            # Return default settings if none exist yet
            from datetime import datetime

            now = datetime.now(UTC)
            return SystemSettingsResponse(
                id="default",
                webhook_url=None,
                webhook_token=None,
                webhook_timeout=10,
                webhook_retries=3,
                gate_open_duration_seconds=5,
                admin_url=None,
                links_url=None,
                oidc_enabled=False,
                oidc_issuer=None,
                oidc_client_id=None,
                oidc_redirect_uri=None,
                oidc_scopes="openid,profile,email",
                oidc_client_secret_set=False,
                created_at=now,
                updated_at=now,
            )

        # Build response with oidc_client_secret_set flag
        return SystemSettingsResponse(
            id=settings.id,
            webhook_url=settings.webhook_url,
            webhook_token=settings.webhook_token,
            webhook_timeout=settings.webhook_timeout,
            webhook_retries=settings.webhook_retries,
            gate_open_duration_seconds=settings.gate_open_duration_seconds,
            admin_url=settings.admin_url,
            links_url=settings.links_url,
            oidc_enabled=settings.oidc_enabled,
            oidc_issuer=settings.oidc_issuer,
            oidc_client_id=settings.oidc_client_id,
            oidc_redirect_uri=settings.oidc_redirect_uri,
            oidc_scopes=settings.oidc_scopes,
            oidc_client_secret_set=bool(settings.oidc_client_secret),
            created_at=settings.created_at,
            updated_at=settings.updated_at,
        )

    except Exception as e:
        logger.error("Error fetching system settings", error=str(e))
        raise HTTPException(status_code=500, detail=f"Error fetching settings: {str(e)}") from e


@router.post("", response_model=SystemSettingsResponse)
@router.put("", response_model=SystemSettingsResponse)
async def save_system_settings(
    settings_data: SystemSettingsCreate,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Save or update system settings.

    This endpoint creates new settings if none exist, or updates existing settings.
    Only one settings record should exist in the system at a time.
    """
    try:
        # Validate SECRET_KEY is properly set if OIDC is being enabled
        from app.core.config import settings as app_settings

        if settings_data.oidc_enabled and settings_data.oidc_client_secret:
            if (
                not app_settings.SECRET_KEY
                or app_settings.SECRET_KEY == "your-secret-key-here-change-in-production"
            ):
                raise HTTPException(
                    status_code=400,
                    detail="SECRET_KEY must be set to a fixed value before enabling OIDC. "
                    "Set SECRET_KEY in your .env file to a secure random string. "
                    "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(32))\"",
                )

        # Check if settings already exist
        result = await db.execute(select(SystemSettings).limit(1))
        existing_settings = result.scalar_one_or_none()

        if existing_settings:
            # Update existing settings
            existing_settings.webhook_url = settings_data.webhook_url
            existing_settings.webhook_token = settings_data.webhook_token
            existing_settings.webhook_timeout = settings_data.webhook_timeout
            existing_settings.webhook_retries = settings_data.webhook_retries
            existing_settings.gate_open_duration_seconds = settings_data.gate_open_duration_seconds

            # Update URL settings
            existing_settings.admin_url = settings_data.admin_url
            existing_settings.links_url = settings_data.links_url

            # Update OIDC settings
            existing_settings.oidc_enabled = settings_data.oidc_enabled
            existing_settings.oidc_issuer = settings_data.oidc_issuer
            existing_settings.oidc_client_id = settings_data.oidc_client_id
            existing_settings.oidc_redirect_uri = settings_data.oidc_redirect_uri
            existing_settings.oidc_scopes = settings_data.oidc_scopes

            # Handle client secret encryption (only update if provided)
            if settings_data.oidc_client_secret is not None:
                if settings_data.oidc_client_secret.strip():
                    existing_settings.set_oidc_client_secret(settings_data.oidc_client_secret)
                else:
                    # Empty string means clear the secret
                    existing_settings.oidc_client_secret = None

            await db.commit()
            await db.refresh(existing_settings)

            # Reload OIDC settings into the global service instance
            await oidc_service.load_settings_from_db(db)

            logger.info("System settings updated successfully")
            return SystemSettingsResponse(
                id=existing_settings.id,
                webhook_url=existing_settings.webhook_url,
                webhook_token=existing_settings.webhook_token,
                webhook_timeout=existing_settings.webhook_timeout,
                webhook_retries=existing_settings.webhook_retries,
                gate_open_duration_seconds=existing_settings.gate_open_duration_seconds,
                admin_url=existing_settings.admin_url,
                links_url=existing_settings.links_url,
                oidc_enabled=existing_settings.oidc_enabled,
                oidc_issuer=existing_settings.oidc_issuer,
                oidc_client_id=existing_settings.oidc_client_id,
                oidc_redirect_uri=existing_settings.oidc_redirect_uri,
                oidc_scopes=existing_settings.oidc_scopes,
                oidc_client_secret_set=bool(existing_settings.oidc_client_secret),
                created_at=existing_settings.created_at,
                updated_at=existing_settings.updated_at,
            )
        else:
            # Create new settings
            new_settings = SystemSettings(
                webhook_url=settings_data.webhook_url,
                webhook_token=settings_data.webhook_token,
                webhook_timeout=settings_data.webhook_timeout,
                webhook_retries=settings_data.webhook_retries,
                gate_open_duration_seconds=settings_data.gate_open_duration_seconds,
                admin_url=settings_data.admin_url,
                links_url=settings_data.links_url,
                oidc_enabled=settings_data.oidc_enabled,
                oidc_issuer=settings_data.oidc_issuer,
                oidc_client_id=settings_data.oidc_client_id,
                oidc_redirect_uri=settings_data.oidc_redirect_uri,
                oidc_scopes=settings_data.oidc_scopes,
            )

            # Handle client secret encryption
            if settings_data.oidc_client_secret:
                new_settings.set_oidc_client_secret(settings_data.oidc_client_secret)

            db.add(new_settings)
            await db.commit()
            await db.refresh(new_settings)

            # Reload OIDC settings into the global service instance
            await oidc_service.load_settings_from_db(db)

            logger.info("System settings created successfully")
            return SystemSettingsResponse(
                id=new_settings.id,
                webhook_url=new_settings.webhook_url,
                webhook_token=new_settings.webhook_token,
                webhook_timeout=new_settings.webhook_timeout,
                webhook_retries=new_settings.webhook_retries,
                gate_open_duration_seconds=new_settings.gate_open_duration_seconds,
                admin_url=new_settings.admin_url,
                links_url=new_settings.links_url,
                oidc_enabled=new_settings.oidc_enabled,
                oidc_issuer=new_settings.oidc_issuer,
                oidc_client_id=new_settings.oidc_client_id,
                oidc_redirect_uri=new_settings.oidc_redirect_uri,
                oidc_scopes=new_settings.oidc_scopes,
                oidc_client_secret_set=bool(new_settings.oidc_client_secret),
                created_at=new_settings.created_at,
                updated_at=new_settings.updated_at,
            )

    except Exception as e:
        await db.rollback()
        logger.error("Error saving system settings", error=str(e))
        raise HTTPException(status_code=500, detail=f"Error saving settings: {str(e)}") from e


@router.delete("", response_model=MessageResponse)
async def reset_system_settings(db: AsyncSession = Depends(get_db)) -> MessageResponse:
    """
    Reset system settings to defaults.

    This deletes all settings records, causing the system to use default values.
    """
    try:
        # Delete all settings records
        result = await db.execute(select(SystemSettings))
        settings_list = result.scalars().all()

        for settings in settings_list:
            await db.delete(settings)

        await db.commit()

        logger.info("System settings reset to defaults")
        return MessageResponse(
            message="Settings reset to defaults successfully",
            success=True,
        )

    except Exception as e:
        await db.rollback()
        logger.error("Error resetting system settings", error=str(e))
        raise HTTPException(status_code=500, detail=f"Error resetting settings: {str(e)}") from e
