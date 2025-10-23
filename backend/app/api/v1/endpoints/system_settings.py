"""System Settings API endpoints"""

from typing import Any

from app.api.v1.schemas import MessageResponse, SystemSettingsCreate, SystemSettingsResponse
from app.core.logging import logger
from app.db.base import get_db
from app.models.system_settings import SystemSettings
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
            from datetime import datetime, timezone

            now = datetime.now(timezone.utc)
            default_settings = SystemSettings(
                webhook_url=None,
                webhook_token=None,
                webhook_timeout=10,
                webhook_retries=3,
                gate_open_duration_seconds=5,
            )
            return SystemSettingsResponse(
                id="default",
                webhook_url=default_settings.webhook_url,
                webhook_token=default_settings.webhook_token,
                webhook_timeout=default_settings.webhook_timeout,
                webhook_retries=default_settings.webhook_retries,
                gate_open_duration_seconds=default_settings.gate_open_duration_seconds,
                created_at=now,
                updated_at=now,
            )

        return SystemSettingsResponse.model_validate(settings)

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

            await db.commit()
            await db.refresh(existing_settings)

            logger.info("System settings updated successfully")
            return SystemSettingsResponse.model_validate(existing_settings)
        else:
            # Create new settings
            new_settings = SystemSettings(
                webhook_url=settings_data.webhook_url,
                webhook_token=settings_data.webhook_token,
                webhook_timeout=settings_data.webhook_timeout,
                webhook_retries=settings_data.webhook_retries,
                gate_open_duration_seconds=settings_data.gate_open_duration_seconds,
            )

            db.add(new_settings)
            await db.commit()
            await db.refresh(new_settings)

            logger.info("System settings created successfully")
            return SystemSettingsResponse.model_validate(new_settings)

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
