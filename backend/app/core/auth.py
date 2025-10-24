"""Authentication and session management"""

import json
from typing import Annotated

from fastapi import Cookie, Depends, HTTPException, Request, status
from itsdangerous import BadSignature, SignatureExpired, TimestampSigner

from app.core.config import settings
from app.core.logging import logger
from app.models.user import User
from app.services.oidc_service import oidc_service


class SessionService:
    """Service for managing user sessions with secure signed cookies"""

    def __init__(self):
        """Initialize session service"""
        self.signer = TimestampSigner(settings.SESSION_SECRET_KEY)
        self.cookie_name = settings.SESSION_COOKIE_NAME
        self.max_age = settings.SESSION_MAX_AGE
        self.secure = settings.SESSION_SECURE
        self.httponly = settings.SESSION_HTTPONLY
        self.samesite = settings.SESSION_SAMESITE

    def create_session_cookie(self, user: User) -> str:
        """
        Create a signed session cookie for the user

        Args:
            user: User object to store in session

        Returns:
            str: Signed cookie value
        """
        # Serialize user data to JSON
        user_data = json.dumps(user.to_dict())

        # Sign the data
        signed_data = self.signer.sign(user_data).decode("utf-8")

        logger.info("Created session cookie", user_id=user.user_id, sub=user.sub)
        return signed_data

    def verify_session_cookie(self, cookie_value: str) -> User | None:
        """
        Verify and decode session cookie

        Args:
            cookie_value: Signed cookie value

        Returns:
            User | None: User object if valid, None otherwise
        """
        try:
            # Verify signature and check age
            unsigned_data = self.signer.unsign(
                cookie_value.encode("utf-8"), max_age=self.max_age
            )

            # Deserialize user data
            user_dict = json.loads(unsigned_data.decode("utf-8"))
            user = User.from_dict(user_dict)

            return user

        except SignatureExpired:
            logger.warning("Session cookie expired")
            return None
        except BadSignature:
            logger.warning("Invalid session cookie signature")
            return None
        except Exception as e:
            logger.error("Failed to verify session cookie", error=str(e))
            return None

    def get_cookie_params(self) -> dict:
        """Get cookie parameters for setting cookies"""
        return {
            "key": self.cookie_name,
            "httponly": self.httponly,
            "secure": self.secure,
            "samesite": self.samesite,
            "max_age": self.max_age,
        }


# Global session service instance
session_service = SessionService()


# Authentication Dependencies


async def get_optional_user(
    request: Request,
    session_cookie: Annotated[str | None, Cookie(alias=settings.SESSION_COOKIE_NAME)] = None,
) -> User | None:
    """
    Get current user from session cookie (if available)

    This is an optional dependency that returns None if no valid session exists.
    Used for endpoints that can work with or without authentication.

    Args:
        request: FastAPI request object
        session_cookie: Session cookie value

    Returns:
        User | None: Current user if authenticated, None otherwise
    """
    # Check if this is a links request (public access)
    is_links_request = getattr(request.state, "is_links_request", False)

    # Links requests never require authentication
    if is_links_request:
        return None

    # If OIDC not enabled, return None (will use default user in get_current_user)
    if not oidc_service.is_enabled():
        return None

    # Check for session cookie
    if not session_cookie:
        return None

    # Verify and decode session
    user = session_service.verify_session_cookie(session_cookie)
    if not user:
        return None

    logger.debug("Authenticated request", user_id=user.user_id, sub=user.sub)
    return user


async def get_current_user(
    user: Annotated[User | None, Depends(get_optional_user)]
) -> User:
    """
    Get current authenticated user

    If OIDC is not enabled or user is not authenticated, returns default user.
    This ensures all requests have a user context for audit logging.

    Args:
        user: User from optional dependency

    Returns:
        User: Current user or default user
    """
    if user:
        return user

    # If OIDC not enabled, use default user
    if not oidc_service.is_enabled():
        default_user = User.create_default_user()
        logger.debug("Using default user (OIDC not enabled)")
        return default_user

    # OIDC is enabled but user not authenticated - return default user
    # (We don't require authentication for all endpoints)
    default_user = User.create_default_user()
    logger.debug("Using default user (not authenticated)")
    return default_user


async def require_authentication(
    request: Request,
    user: Annotated[User | None, Depends(get_optional_user)]
) -> User:
    """
    Require authentication for endpoint

    Raises 401 if OIDC is enabled and this is an admin request but user is not authenticated.
    If OIDC is not enabled or this is a links request, returns default user.

    Args:
        request: FastAPI request object
        user: User from optional dependency

    Returns:
        User: Current authenticated user

    Raises:
        HTTPException: 401 if authentication required but not provided
    """
    if user:
        return user

    # Check if this is a links request (public access)
    is_links_request = getattr(request.state, "is_links_request", False)

    # Links requests never require authentication
    if is_links_request:
        return User.create_default_user()

    # If OIDC not enabled, use default user
    if not oidc_service.is_enabled():
        return User.create_default_user()

    # OIDC enabled and this is an admin request but not authenticated - require login
    logger.warning("Authentication required but not provided")
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required",
        headers={"WWW-Authenticate": "Bearer"},
    )


# Type aliases for dependencies
CurrentUser = Annotated[User, Depends(get_current_user)]
RequireAuth = Annotated[User, Depends(require_authentication)]
OptionalUser = Annotated[User | None, Depends(get_optional_user)]
