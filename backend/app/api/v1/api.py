"""Main API router for v1 endpoints"""

from app.api.v1.endpoints import (
    access_links,
    access_logs,
    audit_logs,
    auth,
    health,
    system_settings,
    validate,
)
from fastapi import APIRouter

api_router = APIRouter()

# Include endpoint routers
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(access_links.router, prefix="/links", tags=["access-links"])
api_router.include_router(access_logs.router, prefix="/logs", tags=["access-logs"])
api_router.include_router(audit_logs.router, prefix="/audit-logs", tags=["audit-logs"])
api_router.include_router(validate.router, prefix="/validate", tags=["validation"])
api_router.include_router(system_settings.router, prefix="/settings", tags=["system-settings"])
