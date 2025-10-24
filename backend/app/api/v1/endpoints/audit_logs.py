"""Audit Logs API endpoints"""

from datetime import datetime

from app.api.v1.schemas import AuditLogListResponse, AuditLogResponse, AuditLogStats
from app.core.logging import logger
from app.db.base import get_db
from app.models import AuditLog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


@router.get("", response_model=AuditLogListResponse)
async def list_audit_logs(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(50, ge=1, le=200, description="Number of items per page"),
    action: str | None = Query(None, description="Filter by action type"),
    resource_type: str | None = Query(None, description="Filter by resource type"),
    resource_id: str | None = Query(None, description="Filter by resource ID"),
    link_code: str | None = Query(None, description="Filter by link code"),
    user_id: str | None = Query(None, description="Filter by user ID"),
    ip_address: str | None = Query(None, description="Filter by IP address"),
    search: str | None = Query(
        None, description="Search in link_code, link_name, ip_address, or action"
    ),
    start_date: datetime | None = Query(None, description="Filter logs after this date"),
    end_date: datetime | None = Query(None, description="Filter logs before this date"),
    db: AsyncSession = Depends(get_db),
) -> AuditLogListResponse:
    """List all audit logs with pagination and filtering"""
    try:
        # Build query
        query = select(AuditLog)

        # Apply filters
        filters = []

        if action:
            filters.append(AuditLog.action == action)
        if resource_type:
            filters.append(AuditLog.resource_type == resource_type)
        if resource_id:
            filters.append(AuditLog.resource_id == resource_id)
        if link_code:
            filters.append(AuditLog.link_code == link_code)
        if user_id:
            filters.append(AuditLog.user_id == user_id)
        if ip_address:
            filters.append(AuditLog.ip_address == ip_address)
        if start_date:
            filters.append(AuditLog.created_at >= start_date)
        if end_date:
            filters.append(AuditLog.created_at <= end_date)
        if search:
            filters.append(
                or_(
                    AuditLog.link_code.ilike(f"%{search}%"),
                    AuditLog.link_name.ilike(f"%{search}%"),
                    AuditLog.action.ilike(f"%{search}%"),
                    AuditLog.ip_address.ilike(f"%{search}%"),
                )
            )

        if filters:
            query = query.filter(and_(*filters))

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        result = await db.execute(count_query)
        total = result.scalar() or 0

        # Apply pagination and ordering (most recent first)
        query = query.order_by(desc(AuditLog.created_at))
        query = query.limit(size).offset((page - 1) * size)

        # Execute query
        result = await db.execute(query)
        items = result.scalars().all()

        # Calculate pagination info
        pages = (total + size - 1) // size if size > 0 else 0

        return AuditLogListResponse(
            items=[AuditLogResponse.model_validate(item) for item in items],
            total=total,
            page=page,
            size=size,
            pages=pages,
        )

    except Exception as e:
        logger.error("Error listing audit logs", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list audit logs",
        ) from e


@router.get("/stats", response_model=AuditLogStats)
async def get_audit_log_stats(
    db: AsyncSession = Depends(get_db),
) -> AuditLogStats:
    """Get statistics about audit logs"""
    try:
        # Get total count
        total_query = select(func.count()).select_from(AuditLog)
        result = await db.execute(total_query)
        total_logs = result.scalar() or 0

        # Get count by action type
        action_query = select(AuditLog.action, func.count(AuditLog.id)).group_by(
            AuditLog.action
        )
        result = await db.execute(action_query)
        action_counts = {row[0]: row[1] for row in result.all()}

        # Get recent activity (last 10 entries)
        recent_query = select(AuditLog).order_by(desc(AuditLog.created_at)).limit(10)
        result = await db.execute(recent_query)
        recent_items = result.scalars().all()

        return AuditLogStats(
            total_logs=total_logs,
            actions=action_counts,
            recent_activity=[
                AuditLogResponse.model_validate(item) for item in recent_items
            ],
        )

    except Exception as e:
        logger.error("Error getting audit log stats", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get audit log statistics",
        ) from e


@router.get("/{audit_log_id}", response_model=AuditLogResponse)
async def get_audit_log(
    audit_log_id: str,
    db: AsyncSession = Depends(get_db),
) -> AuditLogResponse:
    """Get a specific audit log entry by ID"""
    try:
        query = select(AuditLog).filter(AuditLog.id == audit_log_id)
        result = await db.execute(query)
        audit_log = result.scalar_one_or_none()

        if not audit_log:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Audit log entry not found",
            )

        return AuditLogResponse.model_validate(audit_log)

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error getting audit log", audit_log_id=audit_log_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get audit log entry",
        ) from e
