"""Access Links API endpoints"""

from datetime import datetime

from app.api.v1.schemas import (
    AccessLinkCreate,
    AccessLinkListResponse,
    AccessLinkResponse,
    AccessLinkStats,
    AccessLinkUpdate,
    MessageResponse,
)
from app.core.auth import CurrentUser
from app.core.logging import logger
from app.db.base import get_db
from app.models import AccessLink, LinkStatus
from app.services.audit_service import AuditService
from app.services.link_service import LinkService
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import and_, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


def _get_client_ip(request: Request) -> str | None:
    """Extract client IP address from request headers"""
    # Check X-Forwarded-For header first (for proxied requests)
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        # X-Forwarded-For can contain multiple IPs, take the first one
        return forwarded.split(",")[0].strip()

    # Check X-Real-IP header (another common proxy header)
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip

    # Fall back to direct client IP
    if request.client:
        return request.client.host

    return None


@router.get("", response_model=AccessLinkListResponse)
async def list_access_links(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    link_status: LinkStatus | None = None,
    purpose: str | None = None,
    search: str | None = None,
    include_deleted: bool = Query(False, description="Include soft-deleted links"),
    db: AsyncSession = Depends(get_db),
) -> AccessLinkListResponse:
    """List all access links with pagination and filtering"""
    try:
        # Build query
        query = select(AccessLink)

        # Apply filters
        filters = []

        # Filter deleted links by default
        if not include_deleted:
            filters.append(~AccessLink.is_deleted)

        if link_status:
            filters.append(AccessLink.status == link_status)
        if purpose:
            filters.append(AccessLink.purpose == purpose)
        if search:
            filters.append(
                or_(
                    AccessLink.name.ilike(f"%{search}%"),
                    AccessLink.link_code.ilike(f"%{search}%"),
                    AccessLink.notes.ilike(f"%{search}%"),
                )
            )

        if filters:
            query = query.filter(and_(*filters))

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        result = await db.execute(count_query)
        total = result.scalar() or 0

        # Apply pagination
        query = query.order_by(desc(AccessLink.created_at))
        query = query.limit(size).offset((page - 1) * size)

        # Execute query
        result = await db.execute(query)
        items = result.scalars().all()

        # Calculate pagination info
        pages = (total + size - 1) // size if size > 0 else 0

        return AccessLinkListResponse(
            items=[AccessLinkResponse.model_validate(item) for item in items],
            total=total,
            page=page,
            size=size,
            pages=pages,
        )

    except Exception as e:
        logger.error("Error listing access links", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list access links",
        ) from e


@router.post("", response_model=AccessLinkResponse, status_code=status.HTTP_201_CREATED)
async def create_access_link(
    link_data: AccessLinkCreate,
    request: Request,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> AccessLinkResponse:
    """Create a new access link"""
    try:
        link_service = LinkService(db)
        link = await link_service.create_link(
            link_data,
            ip_address=_get_client_ip(request),
            user_agent=request.headers.get("User-Agent"),
            user_id=user.user_id,
            user_email=user.email,
        )

        logger.info(
            "Access link created",
            link_id=link.id,
            name=link.name,
            purpose=link.purpose,
            user_id=user.user_id,
        )

        return AccessLinkResponse.model_validate(link)

    except ValueError as e:
        logger.warning("Invalid link data", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    except Exception as e:
        logger.error("Error creating access link", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create access link",
        ) from e


@router.get("/{link_id}", response_model=AccessLinkResponse)
async def get_access_link(
    link_id: str,
    db: AsyncSession = Depends(get_db),
) -> AccessLinkResponse:
    """Get a specific access link by ID"""
    try:
        query = select(AccessLink).filter(AccessLink.id == link_id)
        result = await db.execute(query)
        link = result.scalar_one_or_none()

        if not link:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Access link not found",
            )

        return AccessLinkResponse.model_validate(link)

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error getting access link", link_id=link_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get access link",
        ) from e


@router.patch("/{link_id}", response_model=AccessLinkResponse)
async def update_access_link(
    link_id: str,
    update_data: AccessLinkUpdate,
    request: Request,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> AccessLinkResponse:
    """Update an existing access link"""
    try:
        # Get the link
        query = select(AccessLink).filter(AccessLink.id == link_id)
        result = await db.execute(query)
        link = result.scalar_one_or_none()

        if not link:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Access link not found",
            )

        # Capture old values for audit logging
        update_dict = update_data.model_dump(exclude_unset=True)
        original_status = link.status
        changes = {}
        for field, new_value in update_dict.items():
            old_value = getattr(link, field)
            if old_value != new_value:
                changes[field] = {
                    "old": AuditService.serialize_value(old_value),
                    "new": AuditService.serialize_value(new_value),
                }

        # Update fields
        for field, value in update_dict.items():
            setattr(link, field, value)

        # Auto-calculate status based on updated fields
        status_changed = link.update_status()

        # Track status change in audit log if it occurred
        if status_changed:
            changes["status"] = {
                "old": AuditService.serialize_value(original_status),
                "new": AuditService.serialize_value(link.status),
            }

        # Update timestamp
        link.updated_at = datetime.now()

        await db.commit()
        await db.refresh(link)

        # Create audit log entry if there were changes
        if changes:
            await AuditService.log_link_updated(
                db=db,
                link=link,
                changes=changes,
                ip_address=_get_client_ip(request),
                user_agent=request.headers.get("User-Agent"),
                user_id=user.user_id,
                user_email=user.email,
            )
            await db.commit()

        # Log the update with status transition info
        log_data = {
            "link_id": link_id,
            "updates": update_dict,
        }
        if status_changed:
            log_data["status_transition"] = f"{original_status} → {link.status}"
            logger.info("Access link updated with status transition", **log_data)
        else:
            logger.info("Access link updated", **log_data)

        return AccessLinkResponse.model_validate(link)

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error updating access link", link_id=link_id, error=str(e))
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update access link",
        ) from e


@router.delete("/{link_id}", response_model=MessageResponse)
async def delete_access_link(
    link_id: str,
    request: Request,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """
    Soft-delete an access link.

    This sets is_deleted=True, deleted_at=now(), and status=INACTIVE.
    This operation is NOT reversible.
    """
    try:
        # Get the link
        query = select(AccessLink).filter(AccessLink.id == link_id)
        result = await db.execute(query)
        link = result.scalar_one_or_none()

        if not link:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Access link not found",
            )

        # Check if already deleted
        if link.is_deleted:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Link is already deleted",
            )

        # Soft delete using model method
        link.delete()

        await db.commit()
        await db.refresh(link)

        # Create audit log entry
        await AuditService.log_link_deleted(
            db=db,
            link=link,
            ip_address=_get_client_ip(request),
            user_agent=request.headers.get("User-Agent"),
            user_id=user.user_id,
            user_email=user.email,
        )
        await db.commit()

        logger.info(
            "Access link deleted (soft delete)",
            link_id=link_id,
            link_code=link.link_code,
            link_name=link.name,
        )

        return MessageResponse(
            message="Access link deleted successfully",
            success=True,
            data={
                "link_id": link_id,
                "deleted_at": link.deleted_at.isoformat() if link.deleted_at else None,
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error deleting access link", link_id=link_id, error=str(e))
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete access link",
        ) from e


@router.get("/{link_id}/stats", response_model=AccessLinkStats)
async def get_link_stats(
    link_id: str,
    db: AsyncSession = Depends(get_db),
) -> AccessLinkStats:
    """Get statistics for a specific access link"""
    try:
        # Get the link with logs
        query = select(AccessLink).filter(AccessLink.id == link_id)
        result = await db.execute(query)
        link = result.scalar_one_or_none()

        if not link:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Access link not found",
            )

        # Get last used timestamp
        last_used = None
        if link.logs:
            last_used = max(log.accessed_at for log in link.logs)

        return AccessLinkStats(
            id=link.id,
            name=link.name,
            link_code=link.link_code,
            total_uses=link.total_uses,
            granted_count=link.granted_count,
            denied_count=link.denied_count,
            remaining_uses=link.remaining_uses,
            last_used=last_used,
            created_at=link.created_at,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error getting link stats", link_id=link_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get link statistics",
        ) from e


@router.post("/{link_id}/regenerate", response_model=AccessLinkResponse)
async def regenerate_link_code(
    link_id: str,
    request: Request,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> AccessLinkResponse:
    """Regenerate the code for an access link"""
    try:
        link_service = LinkService(db)
        link = await link_service.regenerate_link_code(
            link_id,
            ip_address=_get_client_ip(request),
            user_agent=request.headers.get("User-Agent"),
            user_id=user.user_id,
            user_email=user.email,
        )

        logger.info("Link code regenerated", link_id=link_id, new_code=link.link_code)

        return AccessLinkResponse.model_validate(link)

    except ValueError as e:
        logger.warning("Cannot regenerate link code", link_id=link_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    except Exception as e:
        logger.error("Error regenerating link code", link_id=link_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to regenerate link code",
        ) from e


@router.post("/{link_id}/disable", response_model=AccessLinkResponse)
async def disable_access_link(
    link_id: str,
    request: Request,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> AccessLinkResponse:
    """
    Disable an access link (reversible).

    Sets status to DISABLED which prevents the link from granting access
    and prevents automatic status recalculation. Can be re-enabled.
    """
    try:
        # Get the link
        query = select(AccessLink).filter(AccessLink.id == link_id)
        result = await db.execute(query)
        link = result.scalar_one_or_none()

        if not link:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Access link not found",
            )

        if link.is_deleted:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot disable a deleted link",
            )

        # Disable using model method
        link.disable()

        await db.commit()
        await db.refresh(link)

        # Create audit log entry
        await AuditService.log_link_disabled(
            db=db,
            link=link,
            ip_address=_get_client_ip(request),
            user_agent=request.headers.get("User-Agent"),
            user_id=user.user_id,
            user_email=user.email,
        )
        await db.commit()

        logger.info(
            "Access link disabled",
            link_id=link_id,
            link_code=link.link_code,
            link_name=link.name,
        )

        return AccessLinkResponse.model_validate(link)

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    except Exception as e:
        logger.error("Error disabling access link", link_id=link_id, error=str(e))
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to disable access link",
        ) from e


@router.post("/{link_id}/enable", response_model=AccessLinkResponse)
async def enable_access_link(
    link_id: str,
    request: Request,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> AccessLinkResponse:
    """
    Re-enable a disabled access link.

    If the link is currently DISABLED, this will recalculate its status
    based on expiration, active_on, max_uses, etc.
    """
    try:
        # Get the link
        query = select(AccessLink).filter(AccessLink.id == link_id)
        result = await db.execute(query)
        link = result.scalar_one_or_none()

        if not link:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Access link not found",
            )

        if link.is_deleted:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot enable a deleted link",
            )

        original_status = link.status

        # Enable using model method
        status_changed = link.enable()

        await db.commit()
        await db.refresh(link)

        # Create audit log entry
        await AuditService.log_link_enabled(
            db=db,
            link=link,
            ip_address=_get_client_ip(request),
            user_agent=request.headers.get("User-Agent"),
            user_id=user.user_id,
            user_email=user.email,
        )
        await db.commit()

        log_data = {
            "link_id": link_id,
            "link_code": link.link_code,
            "link_name": link.name,
        }

        if status_changed:
            log_data["status_transition"] = f"{original_status} → {link.status}"
            logger.info("Access link enabled with status change", **log_data)
        else:
            logger.info("Access link enable called (no status change)", **log_data)

        return AccessLinkResponse.model_validate(link)

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    except Exception as e:
        logger.error("Error enabling access link", link_id=link_id, error=str(e))
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to enable access link",
        ) from e
