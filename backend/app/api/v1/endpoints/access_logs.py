"""Access Logs API endpoints"""

from datetime import datetime, timedelta

from app.api.v1.schemas import (
    AccessLogListResponse,
    AccessLogResponse,
    AccessLogStats,
    AccessLogSummary,
)
from app.core.logging import logger
from app.db.base import get_db
from app.models import AccessLink, AccessLog, AccessStatus
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


@router.get("", response_model=AccessLogListResponse)
async def list_access_logs(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    link_id: str | None = None,
    log_status: AccessStatus | None = None,
    ip_address: str | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    owner_user_id: str | None = Query(None, description="Filter by link owner user ID"),
    db: AsyncSession = Depends(get_db),
) -> AccessLogListResponse:
    """List all access logs with pagination and filtering"""
    try:
        # Build query - join with AccessLink if filtering by owner
        if owner_user_id:
            query = select(AccessLog).join(
                AccessLink, AccessLog.link_id == AccessLink.id
            )
        else:
            query = select(AccessLog)

        # Apply filters
        filters = []
        if link_id:
            filters.append(AccessLog.link_id == link_id)
        if log_status:
            filters.append(AccessLog.status == log_status)
        if ip_address:
            filters.append(AccessLog.ip_address == ip_address)
        if start_date:
            filters.append(AccessLog.accessed_at >= start_date)
        if end_date:
            filters.append(AccessLog.accessed_at <= end_date)
        if owner_user_id:
            filters.append(AccessLink.owner_user_id == owner_user_id)

        if filters:
            query = query.filter(and_(*filters))

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        result = await db.execute(count_query)
        total = result.scalar() or 0

        # Apply pagination
        query = query.order_by(desc(AccessLog.accessed_at))
        query = query.limit(size).offset((page - 1) * size)

        # Execute query
        result = await db.execute(query)
        items = result.scalars().all()

        # Calculate pagination info
        pages = (total + size - 1) // size if size > 0 else 0

        return AccessLogListResponse(
            items=[AccessLogResponse.model_validate(item) for item in items],
            total=total,
            page=page,
            size=size,
            pages=pages,
        )

    except Exception as e:
        logger.error("Error listing access logs", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list access logs",
        ) from e


@router.get("/stats", response_model=AccessLogStats)
async def get_access_log_stats(
    link_id: str | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    db: AsyncSession = Depends(get_db),
) -> AccessLogStats:
    """Get statistics for access logs"""
    try:
        # Build base query
        query = select(AccessLog)

        # Apply filters
        filters = []
        if link_id:
            filters.append(AccessLog.link_id == link_id)
        if start_date:
            filters.append(AccessLog.accessed_at >= start_date)
        if end_date:
            filters.append(AccessLog.accessed_at <= end_date)

        if filters:
            query = query.filter(and_(*filters))

        # Get all matching logs
        result = await db.execute(query)
        logs = result.scalars().all()

        # Calculate statistics
        total_attempts = len(logs)
        granted_count = sum(1 for log in logs if log.status == AccessStatus.GRANTED)
        denied_count = sum(1 for log in logs if log.status == AccessStatus.DENIED)
        error_count = sum(1 for log in logs if log.status == AccessStatus.ERROR)
        unique_ips = len({log.ip_address for log in logs})

        return AccessLogStats(
            total_attempts=total_attempts,
            granted_count=granted_count,
            denied_count=denied_count,
            error_count=error_count,
            unique_ips=unique_ips,
            period_start=start_date,
            period_end=end_date,
        )

    except Exception as e:
        logger.error("Error getting access log stats", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get access log statistics",
        ) from e


@router.get("/summary", response_model=list[AccessLogSummary])
async def get_access_log_summary(
    days: int = Query(7, ge=1, le=90, description="Number of days to include"),
    link_id: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[AccessLogSummary]:
    """Get daily summary of access logs for the specified period"""
    try:
        # Calculate date range
        end_date = datetime.now().replace(hour=23, minute=59, second=59)
        start_date = end_date - timedelta(days=days - 1)
        start_date = start_date.replace(hour=0, minute=0, second=0)

        summaries = []

        # Generate summary for each day
        current_date = start_date
        while current_date <= end_date:
            next_date = current_date + timedelta(days=1)

            # Build query for this day
            query = select(AccessLog).filter(
                and_(
                    AccessLog.accessed_at >= current_date,
                    AccessLog.accessed_at < next_date,
                )
            )

            if link_id:
                query = query.filter(AccessLog.link_id == link_id)

            # Get logs for this day
            result = await db.execute(query)
            logs = result.scalars().all()

            # Calculate daily stats
            granted = sum(1 for log in logs if log.status == AccessStatus.GRANTED)
            denied = sum(1 for log in logs if log.status == AccessStatus.DENIED)
            errors = sum(1 for log in logs if log.status == AccessStatus.ERROR)
            unique_visitors = len({log.ip_address for log in logs})

            summaries.append(
                AccessLogSummary(
                    date=current_date,
                    granted=granted,
                    denied=denied,
                    errors=errors,
                    unique_visitors=unique_visitors,
                )
            )

            current_date = next_date

        return summaries

    except Exception as e:
        logger.error("Error getting access log summary", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get access log summary",
        ) from e


@router.get("/{log_id}", response_model=AccessLogResponse)
async def get_access_log(
    log_id: str,
    db: AsyncSession = Depends(get_db),
) -> AccessLogResponse:
    """Get a specific access log by ID"""
    try:
        query = select(AccessLog).filter(AccessLog.id == log_id)
        result = await db.execute(query)
        log = result.scalar_one_or_none()

        if not log:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Access log not found",
            )

        return AccessLogResponse.model_validate(log)

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error getting access log", log_id=log_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get access log",
        ) from e


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def delete_old_logs(
    days_old: int = Query(30, ge=1, description="Delete logs older than this many days"),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete access logs older than the specified number of days"""
    try:
        # Calculate cutoff date
        cutoff_date = datetime.now() - timedelta(days=days_old)

        # Delete old logs
        query = select(AccessLog).filter(AccessLog.accessed_at < cutoff_date)
        result = await db.execute(query)
        old_logs = result.scalars().all()

        for log in old_logs:
            await db.delete(log)

        await db.commit()

        logger.info(
            "Deleted old access logs",
            count=len(old_logs),
            cutoff_date=cutoff_date.isoformat(),
        )

    except Exception as e:
        logger.error("Error deleting old logs", error=str(e))
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete old logs",
        ) from e
