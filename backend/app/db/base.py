"""Database base configuration and session management"""

from collections.abc import AsyncGenerator
from typing import Any

from app.core.config import settings
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

# Ensure DATABASE_URL is set
if not settings.DATABASE_URL:
    raise ValueError("DATABASE_URL must be configured")

# Global engine and session factory instances
async_engine: AsyncEngine | None = None
AsyncSessionLocal: async_sessionmaker[AsyncSession] | None = None

# Create sync engine for migrations (created at import time, only used in single-process context)
sync_engine = create_engine(
    settings.DATABASE_URL.replace("+aiosqlite", "").replace("+asyncpg", ""),
    echo=settings.DEBUG,
    pool_pre_ping=True,
)

# Create sync session factory
SessionLocal = sessionmaker(
    sync_engine,
    class_=Session,
    autocommit=False,
    autoflush=False,
)


def init_async_engine() -> None:
    """Initialize async engine and session factory.

    This should be called after worker processes are forked to avoid
    sharing asyncpg connections across processes with different event loops.
    """
    global async_engine, AsyncSessionLocal

    if async_engine is not None:
        return  # Already initialized

    async_engine = create_async_engine(
        settings.DATABASE_URL,
        echo=settings.DEBUG,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
    )

    AsyncSessionLocal = async_sessionmaker(
        async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )


class Base(DeclarativeBase):
    """Base class for all database models"""

    def dict(self) -> dict[str, Any]:
        """Convert model to dictionary"""
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}


# Database dependency for FastAPI
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Get database session for dependency injection"""
    if AsyncSessionLocal is None:
        raise RuntimeError("Database not initialized. Call init_async_engine() first.")

    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
