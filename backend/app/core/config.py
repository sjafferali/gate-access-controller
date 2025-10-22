"""Application configuration using Pydantic Settings"""

import secrets
from typing import Any, List, Optional, Union
from enum import Enum

from pydantic import AnyHttpUrl, Field, PostgresDsn, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class DatabaseType(str, Enum):
    SQLITE = "sqlite"
    POSTGRESQL = "postgresql"


class Environment(str, Enum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application Settings
    APP_NAME: str = "gate-access-controller"
    APP_VERSION: str = "0.1.0"
    ENVIRONMENT: Environment = Environment.DEVELOPMENT
    DEBUG: bool = Field(default=False)
    SECRET_KEY: str = Field(default_factory=lambda: secrets.token_urlsafe(32))

    # Server Settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 4
    RELOAD: bool = False

    # API Settings
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "Gate Access Controller API"

    # Database Settings
    DATABASE_TYPE: DatabaseType = DatabaseType.SQLITE
    SQLITE_DATABASE_PATH: str = "./gate_access.db"

    # PostgreSQL Settings
    POSTGRES_HOST: Optional[str] = "localhost"
    POSTGRES_PORT: Optional[int] = 5432
    POSTGRES_USER: Optional[str] = "gateadmin"
    POSTGRES_PASSWORD: Optional[str] = None
    POSTGRES_DB: Optional[str] = "gate_access_db"
    DATABASE_URL: Optional[str] = None


    # Gate Webhook Settings
    GATE_WEBHOOK_URL: Optional[str] = None
    GATE_WEBHOOK_TOKEN: Optional[str] = None
    GATE_WEBHOOK_TIMEOUT: int = 10
    GATE_OPEN_DURATION_SECONDS: int = 5

    # Security Settings
    CORS_ORIGINS: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:8000"]
    )
    TRUSTED_HOSTS: List[str] = Field(default=["localhost", "127.0.0.1"])
    RATE_LIMIT_PER_MINUTE: int = 60
    LINK_CODE_LENGTH: int = 8

    # Link Settings
    DEFAULT_LINK_EXPIRATION_HOURS: int = 24
    MAX_LINK_USES: int = 100

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"
    LOG_FILE_PATH: str = "./logs/gate_access.log"

    # Monitoring
    SENTRY_DSN: Optional[str] = None
    SENTRY_ENVIRONMENT: Optional[str] = None

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    @field_validator("TRUSTED_HOSTS", mode="before")
    @classmethod
    def assemble_trusted_hosts(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    @model_validator(mode="after")
    def assemble_database_url(self) -> "Settings":
        """Build database URL based on database type"""
        if self.DATABASE_TYPE == DatabaseType.POSTGRESQL:
            if not self.DATABASE_URL:
                self.DATABASE_URL = PostgresDsn.build(
                    scheme="postgresql+asyncpg",
                    username=self.POSTGRES_USER,
                    password=self.POSTGRES_PASSWORD,
                    host=self.POSTGRES_HOST,
                    port=self.POSTGRES_PORT,
                    path=self.POSTGRES_DB,
                ).unicode_string()
        elif self.DATABASE_TYPE == DatabaseType.SQLITE:
            self.DATABASE_URL = f"sqlite+aiosqlite:///{self.SQLITE_DATABASE_PATH}"

        return self

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == Environment.DEVELOPMENT

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == Environment.PRODUCTION

    @property
    def is_staging(self) -> bool:
        return self.ENVIRONMENT == Environment.STAGING


# Create global settings instance
settings = Settings()