"""Notification Provider API endpoints"""

from app.api.v1.schemas import (
    MessageResponse,
    NotificationProviderCreate,
    NotificationProviderListResponse,
    NotificationProviderResponse,
    NotificationProviderSummary,
    NotificationProviderUpdate,
)
from app.core.auth import CurrentUser
from app.core.logging import logger
from app.db.base import get_db
from app.models import NotificationProvider
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import and_, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


def _get_client_ip(request: Request) -> str | None:
    """Extract client IP address from request headers"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    if request.client:
        return request.client.host
    return None


@router.get("", response_model=NotificationProviderListResponse)
async def list_notification_providers(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    include_deleted: bool = Query(False, description="Include soft-deleted providers"),
    enabled_only: bool = Query(False, description="Only return enabled providers"),
    db: AsyncSession = Depends(get_db),
) -> NotificationProviderListResponse:
    """List all notification providers with pagination"""
    try:
        # Build query
        query = select(NotificationProvider)

        # Apply filters
        filters = []
        if not include_deleted:
            filters.append(~NotificationProvider.is_deleted)
        if enabled_only:
            filters.append(NotificationProvider.enabled == True)  # noqa: E712

        if filters:
            query = query.filter(and_(*filters))

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        result = await db.execute(count_query)
        total = result.scalar() or 0

        # Apply pagination
        query = query.order_by(desc(NotificationProvider.created_at))
        query = query.limit(size).offset((page - 1) * size)

        # Execute query
        result = await db.execute(query)
        items = result.scalars().all()

        # Calculate pagination info
        pages = (total + size - 1) // size if size > 0 else 0

        return NotificationProviderListResponse(
            items=[NotificationProviderResponse.model_validate(item) for item in items],
            total=total,
            page=page,
            size=size,
            pages=pages,
        )

    except Exception as e:
        logger.error("Error listing notification providers", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list notification providers",
        ) from e


@router.get("/summary", response_model=list[NotificationProviderSummary])
async def list_notification_providers_summary(
    db: AsyncSession = Depends(get_db),
) -> list[NotificationProviderSummary]:
    """Get a summary list of all enabled notification providers (for dropdowns)"""
    try:
        query = (
            select(NotificationProvider)
            .where(NotificationProvider.is_deleted == False)  # noqa: E712
            .where(NotificationProvider.enabled == True)  # noqa: E712
            .order_by(NotificationProvider.name)
        )

        result = await db.execute(query)
        providers = result.scalars().all()

        return [NotificationProviderSummary.model_validate(p) for p in providers]

    except Exception as e:
        logger.error("Error fetching notification provider summary", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch notification providers",
        ) from e


@router.get("/{provider_id}", response_model=NotificationProviderResponse)
async def get_notification_provider(
    provider_id: str,
    db: AsyncSession = Depends(get_db),
) -> NotificationProviderResponse:
    """Get a specific notification provider by ID"""
    try:
        notification_service = NotificationService(db)
        provider = await notification_service.get_provider_by_id(provider_id)

        if not provider:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification provider not found",
            )

        return NotificationProviderResponse.model_validate(provider)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Error fetching notification provider",
            provider_id=provider_id,
            error=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch notification provider",
        ) from e


@router.post("", response_model=NotificationProviderResponse, status_code=status.HTTP_201_CREATED)
async def create_notification_provider(
    provider_data: NotificationProviderCreate,
    request: Request,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> NotificationProviderResponse:
    """Create a new notification provider"""
    try:
        notification_service = NotificationService(db)
        provider = await notification_service.create_provider(
            name=provider_data.name,
            provider_type=provider_data.provider_type,
            config=provider_data.config,
            enabled=provider_data.enabled,
        )

        # Log audit event
        await AuditService.log_notification_provider_created(
            db=db,
            provider=provider,
            user_id=user.user_id,
            user_name=user.display_name,
            ip_address=_get_client_ip(request),
            user_agent=request.headers.get("User-Agent"),
        )

        logger.info(
            "Notification provider created",
            provider_id=provider.id,
            name=provider.name,
            type=provider.provider_type,
            user_id=user.user_id,
        )

        return NotificationProviderResponse.model_validate(provider)

    except ValueError as e:
        logger.warning("Invalid notification provider data", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    except Exception as e:
        logger.error("Error creating notification provider", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create notification provider",
        ) from e


@router.patch("/{provider_id}", response_model=NotificationProviderResponse)
async def update_notification_provider(
    provider_id: str,
    provider_data: NotificationProviderUpdate,
    request: Request,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> NotificationProviderResponse:
    """Update an existing notification provider"""
    try:
        notification_service = NotificationService(db)

        # Get provider before update for audit log
        provider_before = await notification_service.get_provider_by_id(provider_id)
        if not provider_before:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification provider not found",
            )

        # Update provider
        provider = await notification_service.update_provider(
            provider_id=provider_id,
            name=provider_data.name,
            config=provider_data.config,
            enabled=provider_data.enabled,
        )

        if not provider:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification provider not found",
            )

        # Log audit event
        changes = {}
        if provider_data.name is not None and provider_data.name != provider_before.name:
            changes["name"] = {"old": provider_before.name, "new": provider_data.name}
        if provider_data.enabled is not None and provider_data.enabled != provider_before.enabled:
            changes["enabled"] = {
                "old": str(provider_before.enabled),
                "new": str(provider_data.enabled),
            }
        if provider_data.config is not None:
            changes["config"] = {"old": "***", "new": "***"}  # Don't log sensitive config

        await AuditService.log_notification_provider_updated(
            db=db,
            provider=provider,
            changes=changes,
            user_id=user.user_id,
            user_name=user.display_name,
            ip_address=_get_client_ip(request),
            user_agent=request.headers.get("User-Agent"),
        )

        logger.info(
            "Notification provider updated",
            provider_id=provider.id,
            name=provider.name,
            user_id=user.user_id,
        )

        return NotificationProviderResponse.model_validate(provider)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Error updating notification provider",
            provider_id=provider_id,
            error=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update notification provider",
        ) from e


@router.delete("/{provider_id}", response_model=MessageResponse)
async def delete_notification_provider(
    provider_id: str,
    request: Request,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Soft-delete a notification provider"""
    try:
        notification_service = NotificationService(db)

        # Get provider before deletion for audit log
        provider = await notification_service.get_provider_by_id(provider_id)
        if not provider:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification provider not found",
            )

        # Delete provider
        success = await notification_service.delete_provider(provider_id)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification provider not found",
            )

        # Log audit event
        await AuditService.log_notification_provider_deleted(
            db=db,
            provider=provider,
            user_id=user.user_id,
            user_name=user.display_name,
            ip_address=_get_client_ip(request),
            user_agent=request.headers.get("User-Agent"),
        )

        logger.info(
            "Notification provider deleted",
            provider_id=provider_id,
            user_id=user.user_id,
        )

        return MessageResponse(message="Notification provider deleted successfully")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Error deleting notification provider",
            provider_id=provider_id,
            error=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete notification provider",
        ) from e
