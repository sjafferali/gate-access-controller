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
from app.core.logging import logger
from app.db.base import get_db
from app.models import AccessLink, LinkStatus
from app.services.link_service import LinkService
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


@router.get("", response_model=AccessLinkListResponse)
async def list_access_links(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    link_status: LinkStatus | None = None,
    purpose: str | None = None,
    search: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> AccessLinkListResponse:
    """List all access links with pagination and filtering"""
    try:
        # Build query
        query = select(AccessLink)

        # Apply filters
        filters = []
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
    db: AsyncSession = Depends(get_db),
) -> AccessLinkResponse:
    """Create a new access link"""
    try:
        link_service = LinkService(db)
        link = await link_service.create_link(link_data)

        logger.info(
            "Access link created",
            link_id=link.id,
            name=link.name,
            purpose=link.purpose.value,
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

        # Update fields
        update_dict = update_data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(link, field, value)

        # Update timestamp
        link.updated_at = datetime.now()

        await db.commit()
        await db.refresh(link)

        logger.info("Access link updated", link_id=link_id, updates=update_dict)

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
    permanent: bool = Query(False, description="Permanently delete the link"),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Delete or mark an access link as deleted"""
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

        if permanent:
            # Permanently delete the link
            await db.delete(link)
            message = "Access link permanently deleted"
        else:
            # Soft delete - just change status
            link.status = LinkStatus.DELETED
            link.updated_at = datetime.now()
            message = "Access link marked as deleted"

        await db.commit()

        logger.info(
            "Access link deleted",
            link_id=link_id,
            permanent=permanent,
        )

        return MessageResponse(
            message=message,
            success=True,
            data={"link_id": link_id, "permanent": permanent},
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
    db: AsyncSession = Depends(get_db),
) -> AccessLinkResponse:
    """Regenerate the code for an access link"""
    try:
        link_service = LinkService(db)
        link = await link_service.regenerate_link_code(link_id)

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
