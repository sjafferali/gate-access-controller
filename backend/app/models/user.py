"""User model for authentication (not stored in database)"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class User(BaseModel):
    """User model representing an authenticated user"""

    sub: str = Field(..., description="Subject identifier (unique user ID from OIDC)")
    email: str | None = Field(None, description="User email address")
    name: str | None = Field(None, description="User's full name")
    preferred_username: str | None = Field(None, description="User's preferred username")
    iss: str | None = Field(None, description="Issuer identifier (OIDC provider)")
    aud: str | None = Field(None, description="Audience (client_id)")
    exp: datetime | None = Field(None, description="Token expiration time")
    iat: datetime | None = Field(None, description="Token issued at time")
    is_default_user: bool = Field(
        default=False, description="Whether this is the default user (no auth configured)"
    )
    raw_claims: dict[str, Any] = Field(
        default_factory=dict, description="Raw OIDC claims from token"
    )

    @property
    def display_name(self) -> str:
        """Get user's display name (prefer name, fall back to email or username)"""
        if self.name:
            return self.name
        if self.preferred_username:
            return self.preferred_username
        if self.email:
            return self.email
        return self.sub

    @property
    def user_id(self) -> str:
        """Get stable user identifier (combination of issuer and subject)"""
        if self.iss:
            return f"{self.iss}:{self.sub}"
        return self.sub

    @classmethod
    def create_default_user(cls) -> "User":
        """Create a default user for when authentication is not configured"""
        return cls(
            sub="default",
            email="default@localhost",
            name="Default User",
            preferred_username="default",
            iss="local",
            is_default_user=True,
        )

    def to_dict(self) -> dict[str, Any]:
        """Convert user to dictionary for session storage"""
        return {
            "sub": self.sub,
            "email": self.email,
            "name": self.name,
            "preferred_username": self.preferred_username,
            "iss": self.iss,
            "aud": self.aud,
            "exp": self.exp.isoformat() if self.exp else None,
            "iat": self.iat.isoformat() if self.iat else None,
            "is_default_user": self.is_default_user,
            "raw_claims": self.raw_claims,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "User":
        """Create User from dictionary (session storage)"""
        if data.get("exp"):
            data["exp"] = datetime.fromisoformat(data["exp"])
        if data.get("iat"):
            data["iat"] = datetime.fromisoformat(data["iat"])
        return cls(**data)
