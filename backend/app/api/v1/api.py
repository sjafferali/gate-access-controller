"""Main API router for v1 endpoints"""

from app.api.v1.endpoints import access_links, access_logs, health, validate
from fastapi import APIRouter

api_router = APIRouter()

# Include endpoint routers
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(access_links.router, prefix="/links", tags=["access-links"])
api_router.include_router(access_logs.router, prefix="/logs", tags=["access-logs"])
api_router.include_router(validate.router, prefix="/validate", tags=["validation"])
