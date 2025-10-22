"""Application configuration using Pydantic Settings"""

import secrets
from enum import Enum

from pydantic import Field, PostgresDsn, field_validator, model_validator
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
    POSTGRES_HOST: str | None = "localhost"
    POSTGRES_PORT: int | None = 5432
    POSTGRES_USER: str | None = "gateadmin"
    POSTGRES_PASSWORD: str | None = None
    POSTGRES_DB: str | None = "gate_access_db"
    DATABASE_URL: str | None = None

    # Gate Webhook Settings
    GATE_WEBHOOK_URL: str | None = None
    GATE_WEBHOOK_TOKEN: str | None = None
    GATE_WEBHOOK_TIMEOUT: int = 10
    GATE_OPEN_DURATION_SECONDS: int = 5

    # Security Settings
    CORS_ORIGINS: list[str] = Field(default=["http://localhost:3000", "http://localhost:8000"])
    TRUSTED_HOSTS: list[str] = Field(default=["*"])
    RATE_LIMIT_PER_MINUTE: int = 60
    LINK_CODE_LENGTH: int = 8

    # Link Settings
    DEFAULT_LINK_EXPIRATION_HOURS: int = 24
    MAX_LINK_USES: int = 100
    LINK_EXPIRATION_CHECK_INTERVAL_SECONDS: int = 60  # Check every 60 seconds

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"
    LOG_FILE_PATH: str = "./logs/gate_access.log"

    # Monitoring
    SENTRY_DSN: str | None = None
    SENTRY_ENVIRONMENT: str | None = None

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | list[str]) -> list[str] | str:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, list | str):
            return v
        raise ValueError(v)

    @field_validator("TRUSTED_HOSTS", mode="before")
    @classmethod
    def assemble_trusted_hosts(cls, v: str | list[str]) -> list[str] | str:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, list | str):
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
                # Disable SSL for Docker network connections to avoid certificate permission issues
                if "?" not in self.DATABASE_URL:
                    self.DATABASE_URL += "?ssl=disable"
                else:
                    self.DATABASE_URL += "&ssl=disable"
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
