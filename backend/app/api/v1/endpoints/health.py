"""Health check API endpoints"""

from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.schemas import HealthResponse
from app.core.config import settings
from app.core.logging import logger
from app.db.base import get_db
from app.services.webhook_service import WebhookService

router = APIRouter()


@router.get("", response_model=HealthResponse)
async def health_check(db: AsyncSession = Depends(get_db)) -> HealthResponse:
    """Comprehensive health check endpoint"""
    health_status = {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT.value,
        "database": False,
        "timestamp": datetime.now().isoformat(),
    }

    # Check database connectivity
    try:
        if settings.DATABASE_TYPE == "sqlite":
            result = await db.execute(text("SELECT 1"))
        else:
            result = await db.execute(text("SELECT 1"))

        if result:
            health_status["database"] = True
    except Exception as e:
        logger.error("Database health check failed", error=str(e))
        health_status["status"] = "degraded"


    return HealthResponse(**health_status)


@router.get("/database")
async def database_health(db: AsyncSession = Depends(get_db)) -> dict:
    """Check database connectivity and status"""
    try:
        # Test basic connectivity
        result = await db.execute(text("SELECT 1"))

        # Get table counts
        from app.models import AccessLink, AccessLog

        link_count_result = await db.execute(select(func.count()).select_from(AccessLink))
        link_count = link_count_result.scalar() or 0

        log_count_result = await db.execute(select(func.count()).select_from(AccessLog))
        log_count = log_count_result.scalar() or 0

        return {
            "status": "healthy",
            "database_type": settings.DATABASE_TYPE.value,
            "connection": "active",
            "statistics": {
                "access_links": link_count,
                "access_logs": log_count,
            }
        }

    except Exception as e:
        logger.error("Database health check failed", error=str(e))
        return {
            "status": "unhealthy",
            "database_type": settings.DATABASE_TYPE.value,
            "connection": "failed",
            "error": str(e),
        }


@router.get("/webhook")
async def webhook_health() -> dict:
    """Check webhook connectivity"""
    webhook_service = WebhookService()

    if not settings.GATE_WEBHOOK_URL:
        return {
            "status": "not_configured",
            "message": "Gate webhook URL not configured",
        }

    success, message, response_time = await webhook_service.test_webhook()

    return {
        "status": "healthy" if success else "unhealthy",
        "message": message,
        "response_time_ms": response_time,
        "webhook_url": settings.GATE_WEBHOOK_URL,
    }