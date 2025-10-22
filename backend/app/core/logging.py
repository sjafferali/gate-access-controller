"""Structured logging configuration using structlog"""

import logging
import sys
from pathlib import Path

import structlog
from app.core.config import settings
from structlog.processors import CallsiteParameter


def setup_logging() -> None:
    """Configure structured logging for the application"""

    # Create log directory if it doesn't exist
    if settings.LOG_FILE_PATH:
        log_dir = Path(settings.LOG_FILE_PATH).parent
        log_dir.mkdir(parents=True, exist_ok=True)

    # Configure standard library logging
    logging.basicConfig(
        level=getattr(logging, settings.LOG_LEVEL),
        format="%(message)s",
        stream=sys.stdout,
    )

    # Structlog processors
    processors = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.CallsiteParameterAdder(
            parameters=[
                CallsiteParameter.FILENAME,
                CallsiteParameter.FUNC_NAME,
                CallsiteParameter.LINENO,
            ]
        ),
    ]

    # Add different processors based on environment and format
    if settings.LOG_FORMAT == "json":
        processors.extend(
            [
                structlog.processors.format_exc_info,
                structlog.processors.dict_tracebacks,
                structlog.processors.JSONRenderer(),
            ]
        )
    else:
        processors.extend(
            [
                structlog.processors.format_exc_info,
                structlog.dev.ConsoleRenderer(
                    colors=settings.is_development,
                    exception_formatter=structlog.dev.rich_traceback if settings.is_development else None,  # type: ignore[arg-type]
                ),
            ]
        )

    # Configure structlog
    structlog.configure(
        processors=processors,  # type: ignore[arg-type]
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    """Get a configured logger instance"""
    return structlog.get_logger(name)  # type: ignore[no-any-return]


# Initialize logging on import
setup_logging()

# Export commonly used logger
logger = get_logger(__name__)
