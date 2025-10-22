"""Main FastAPI application"""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

import sentry_sdk
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.logging import logger
from app.core.scheduler import scheduler
from app.db.base import async_engine, init_async_engine


async def check_expired_links_task() -> None:
    """Periodic task to check and expire links"""
    from app.db.base import AsyncSessionLocal
    from app.services.link_service import LinkService

    if AsyncSessionLocal is None:
        logger.warning("Database not initialized, skipping expired links check")
        return

    async with AsyncSessionLocal() as db:
        link_service = LinkService(db)
        expired_count = await link_service.check_and_expire_links()
        if expired_count > 0:
            logger.info(
                "Expired links check completed",
                expired_count=expired_count,
            )


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan events"""
    # Startup
    logger.info("Starting Gate Access Controller API", version=settings.APP_VERSION)

    # Initialize database engine (must be done after worker fork for asyncpg)
    init_async_engine()
    logger.info("Database engine initialized")

    # Initialize Sentry if configured
    if settings.SENTRY_DSN:
        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            environment=settings.SENTRY_ENVIRONMENT or settings.ENVIRONMENT.value,
            integrations=[
                StarletteIntegration(transaction_style="endpoint"),
                FastApiIntegration(transaction_style="endpoint"),
            ],
            traces_sample_rate=0.1 if settings.is_production else 1.0,
        )
        logger.info("Sentry monitoring initialized")

    # Start background scheduler
    scheduler.add_task(
        check_expired_links_task,
        settings.LINK_EXPIRATION_CHECK_INTERVAL_SECONDS,
    )
    scheduler.start()

    yield

    # Shutdown
    logger.info("Shutting down Gate Access Controller API")
    await scheduler.stop()
    if async_engine is not None:
        await async_engine.dispose()


# Create FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.APP_VERSION,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json" if not settings.is_production else None,
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
    lifespan=lifespan,
)

# Add middlewares
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.TRUSTED_HOSTS,
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unhandled exceptions"""
    logger.error(
        "Unhandled exception",
        exc_info=exc,
        path=request.url.path,
        method=request.method,
    )

    # Don't expose internal errors in production
    if settings.is_production:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "Internal Server Error",
                "message": "An unexpected error occurred",
            },
        )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": exc.__class__.__name__,
            "message": str(exc),
            "path": request.url.path,
        },
    )


# Include API router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


# Root endpoint
@app.get("/", include_in_schema=False)
async def root() -> dict[str, Any]:
    """Root endpoint"""
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT.value,
        "docs": "/docs" if not settings.is_production else None,
    }


# Health check endpoint
@app.get("/health", include_in_schema=False)
async def health_check() -> dict[str, Any]:
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT.value,
    }
