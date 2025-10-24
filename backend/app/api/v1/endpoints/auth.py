"""Authentication endpoints for OpenID Connect"""

from app.core.auth import CurrentUser, OptionalUser, session_service
from app.core.config import settings
from app.core.logging import logger
from app.db.base import get_db
from app.services.oidc_service import oidc_service
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


class AuthStatusResponse(BaseModel):
    """Response for auth status"""

    oidc_enabled: bool = Field(..., description="Whether OIDC authentication is enabled")
    issuer: str | None = Field(None, description="OIDC issuer URL")
    client_id: str | None = Field(None, description="OIDC client ID")


class LoginUrlResponse(BaseModel):
    """Response containing login URL"""

    login_url: str = Field(..., description="URL to redirect user for authentication")
    state: str = Field(..., description="State parameter for CSRF protection")


class UserResponse(BaseModel):
    """Response containing user information"""

    sub: str = Field(..., description="Subject identifier")
    email: str | None = Field(None, description="User email")
    name: str | None = Field(None, description="User name")
    preferred_username: str | None = Field(None, description="Preferred username")
    display_name: str = Field(..., description="Display name")
    user_id: str = Field(..., description="Stable user identifier")
    is_default_user: bool = Field(..., description="Whether this is the default user")
    is_authenticated: bool = Field(..., description="Whether user is authenticated via OIDC")


class CallbackRequest(BaseModel):
    """Request body for auth callback"""

    code: str = Field(..., description="Authorization code from OIDC provider")
    state: str = Field(..., description="State parameter for CSRF validation")


@router.get("/status", response_model=AuthStatusResponse)
async def get_auth_status(db: AsyncSession = Depends(get_db)) -> AuthStatusResponse:
    """
    Get authentication status and configuration

    Returns information about whether OIDC is enabled and configured.
    Loads fresh settings from database to ensure they're up-to-date.
    """
    # Load OIDC settings from database (refreshes the global service instance)
    await oidc_service.load_settings_from_db(db)

    return AuthStatusResponse(
        oidc_enabled=oidc_service.is_enabled(),
        issuer=oidc_service.issuer if oidc_service.is_enabled() else None,
        client_id=oidc_service.client_id if oidc_service.is_enabled() else None,
    )


@router.get("/login-url", response_model=LoginUrlResponse)
async def get_login_url(
    redirect_to: str | None = Query(None, description="URL to redirect to after login")
) -> LoginUrlResponse:
    """
    Get OIDC login URL

    Returns the URL where the user should be redirected to authenticate.
    """
    if not oidc_service.is_enabled():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OIDC authentication is not enabled",
        )

    try:
        # Generate authorization URL with state
        login_url, state = await oidc_service.generate_auth_url()

        logger.info("Generated login URL", redirect_to=redirect_to)

        return LoginUrlResponse(login_url=login_url, state=state)

    except Exception as e:
        logger.error("Failed to generate login URL", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate login URL: {str(e)}",
        ) from e


@router.post("/callback")
async def auth_callback(
    callback_request: CallbackRequest,
    response: Response,
) -> UserResponse:
    """
    Handle OIDC callback after user authentication

    Exchanges authorization code for tokens and creates user session.
    """
    if not oidc_service.is_enabled():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OIDC authentication is not enabled",
        )

    try:
        # Exchange code for tokens
        token_response = await oidc_service.exchange_code_for_token(callback_request.code)

        id_token = token_response.get("id_token")
        access_token = token_response.get("access_token")

        if not id_token:
            raise ValueError("No ID token in response")

        # Create user from tokens
        user = await oidc_service.create_user_from_tokens(id_token, access_token)

        # Create session cookie
        session_cookie = session_service.create_session_cookie(user)

        # Set cookie in response
        cookie_params = session_service.get_cookie_params()
        response.set_cookie(
            value=session_cookie,
            path="/",
            **cookie_params,
        )

        logger.info(
            "User authenticated successfully",
            user_id=user.user_id,
            sub=user.sub,
            email=user.email,
        )

        return UserResponse(
            sub=user.sub,
            email=user.email,
            name=user.name,
            preferred_username=user.preferred_username,
            display_name=user.display_name,
            user_id=user.user_id,
            is_default_user=False,
            is_authenticated=True,
        )

    except Exception as e:
        logger.error("Authentication callback failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Authentication failed: {str(e)}",
        ) from e


@router.post("/logout")
async def logout(
    response: Response,
    user: OptionalUser,
) -> dict[str, str]:
    """
    Logout user by clearing session cookie

    Removes the session cookie from the browser.
    """
    if user:
        logger.info("User logged out", user_id=user.user_id, sub=user.sub)

    # Clear session cookie
    response.delete_cookie(
        key=settings.SESSION_COOKIE_NAME,
        path="/",
    )

    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    user: CurrentUser,
) -> UserResponse:
    """
    Get current user information

    Returns information about the currently authenticated user.
    If OIDC is not enabled, returns default user.
    """
    return UserResponse(
        sub=user.sub,
        email=user.email,
        name=user.name,
        preferred_username=user.preferred_username,
        display_name=user.display_name,
        user_id=user.user_id,
        is_default_user=user.is_default_user,
        is_authenticated=not user.is_default_user,
    )
