"""OpenID Connect service for authentication"""

import secrets
from datetime import UTC, datetime
from typing import Any

from authlib.integrations.httpx_client import AsyncOAuth2Client
from authlib.jose import JoseError, JsonWebToken
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import logger
from app.models.system_settings import SystemSettings
from app.models.user import User


class OIDCService:
    """Service for handling OpenID Connect authentication"""

    def __init__(self) -> None:
        """Initialize OIDC service with environment variable defaults"""
        # Start with environment variables (will be overridden by DB settings)
        self.enabled = settings.OIDC_ENABLED
        self.issuer = settings.OIDC_ISSUER
        self.client_id = settings.OIDC_CLIENT_ID
        self.client_secret = settings.OIDC_CLIENT_SECRET
        self.redirect_uri = settings.OIDC_REDIRECT_URI
        self.scopes = settings.OIDC_SCOPES
        self._discovery_cache: dict[str, Any] | None = None
        self._jwks_cache: dict[str, Any] | None = None
        self._jwt = JsonWebToken(["RS256", "RS384", "RS512", "ES256", "ES384", "ES512"])

    async def load_settings_from_db(self, db: AsyncSession) -> None:
        """
        Load OIDC settings from database and override environment variables.
        Database settings take priority over environment variables.
        """
        try:
            result = await db.execute(select(SystemSettings))
            system_settings = result.scalars().first()

            if system_settings and system_settings.oidc_enabled:
                # Database settings override environment variables
                self.enabled = system_settings.oidc_enabled
                if system_settings.oidc_issuer:
                    self.issuer = system_settings.oidc_issuer
                if system_settings.oidc_client_id:
                    self.client_id = system_settings.oidc_client_id
                if system_settings.oidc_client_secret:
                    # Decrypt the client secret
                    decrypted = system_settings.get_oidc_client_secret()
                    if decrypted:
                        self.client_secret = decrypted
                if system_settings.oidc_redirect_uri:
                    self.redirect_uri = system_settings.oidc_redirect_uri
                if system_settings.oidc_scopes:
                    # Parse comma-separated scopes
                    self.scopes = [s.strip() for s in system_settings.oidc_scopes.split(",")]

                # Clear caches when settings are reloaded
                self._discovery_cache = None
                self._jwks_cache = None

                logger.info(
                    "Loaded OIDC settings from database",
                    enabled=self.enabled,
                    issuer=self.issuer,
                )
        except Exception as e:
            logger.warning(
                "Failed to load OIDC settings from database, using environment variables",
                error=str(e),
            )

    def is_enabled(self) -> bool:
        """Check if OIDC is enabled and properly configured"""
        if not self.enabled:
            return False

        if not all([self.issuer, self.client_id, self.client_secret, self.redirect_uri]):
            logger.warning("OIDC enabled but not fully configured. Missing required settings.")
            return False

        return True

    async def get_discovery_document(self) -> dict[str, Any]:
        """Fetch OIDC discovery document from the issuer"""
        if self._discovery_cache:
            return self._discovery_cache

        discovery_url = f"{self.issuer}/.well-known/openid-configuration"

        try:
            async with AsyncOAuth2Client() as client:
                resp = await client.get(discovery_url)
                resp.raise_for_status()
                self._discovery_cache = resp.json()
                logger.info("Fetched OIDC discovery document", issuer=self.issuer)
                return self._discovery_cache
        except Exception as e:
            logger.error(
                "Failed to fetch OIDC discovery document",
                issuer=self.issuer,
                error=str(e),
            )
            raise ValueError(f"Failed to fetch OIDC discovery document: {e}") from e

    async def get_jwks(self) -> dict[str, Any]:
        """Fetch JSON Web Key Set for token verification"""
        if self._jwks_cache:
            return self._jwks_cache

        discovery = await self.get_discovery_document()
        jwks_uri = discovery.get("jwks_uri")

        if not jwks_uri:
            raise ValueError("No jwks_uri found in discovery document")

        try:
            async with AsyncOAuth2Client() as client:
                resp = await client.get(jwks_uri)
                resp.raise_for_status()
                self._jwks_cache = resp.json()
                logger.info("Fetched JWKS", jwks_uri=jwks_uri)
                return self._jwks_cache
        except Exception as e:
            logger.error("Failed to fetch JWKS", jwks_uri=jwks_uri, error=str(e))
            raise ValueError(f"Failed to fetch JWKS: {e}") from e

    def generate_auth_url(self, state: str | None = None) -> tuple[str, str]:
        """
        Generate authorization URL for user to authenticate

        Returns:
            tuple: (authorization_url, state)
        """
        if not state:
            state = secrets.token_urlsafe(32)

        # Build authorization URL manually
        discovery = None
        try:
            import asyncio

            discovery = asyncio.run(self.get_discovery_document())
        except Exception as e:
            logger.error("Failed to get discovery document for auth URL", error=str(e))
            raise

        auth_endpoint = discovery.get("authorization_endpoint")
        if not auth_endpoint:
            raise ValueError("No authorization_endpoint in discovery document")

        # Build query parameters
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "response_type": "code",
            "scope": " ".join(self.scopes),
            "state": state,
        }

        from urllib.parse import urlencode

        auth_url = f"{auth_endpoint}?{urlencode(params)}"

        logger.info(
            "Generated authorization URL",
            state=state,
            redirect_uri=self.redirect_uri,
        )

        return auth_url, state

    async def exchange_code_for_token(self, code: str) -> dict[str, Any]:
        """
        Exchange authorization code for access token and ID token

        Args:
            code: Authorization code from callback

        Returns:
            dict: Token response containing access_token, id_token, etc.
        """
        discovery = await self.get_discovery_document()
        token_endpoint = discovery.get("token_endpoint")

        if not token_endpoint:
            raise ValueError("No token_endpoint in discovery document")

        try:
            async with AsyncOAuth2Client(
                client_id=self.client_id,
                client_secret=self.client_secret,
            ) as client:
                token_response = await client.fetch_token(
                    token_endpoint,
                    grant_type="authorization_code",
                    code=code,
                    redirect_uri=self.redirect_uri,
                )

                logger.info("Successfully exchanged code for tokens")
                return dict(token_response)
        except Exception as e:
            logger.error("Failed to exchange code for token", error=str(e))
            raise ValueError(f"Failed to exchange code for token: {e}") from e

    async def verify_and_decode_id_token(self, id_token: str) -> dict[str, Any]:
        """
        Verify and decode ID token

        Args:
            id_token: JWT ID token from OIDC provider

        Returns:
            dict: Decoded token claims
        """
        try:
            jwks = await self.get_jwks()

            # Verify and decode the ID token
            claims = self._jwt.decode(id_token, jwks)

            # Validate claims
            claims.validate()

            # Check issuer
            if claims.get("iss") != self.issuer:
                raise ValueError(f"Invalid issuer: {claims.get('iss')}")

            # Check audience
            aud = claims.get("aud")
            if isinstance(aud, list):
                if self.client_id not in aud:
                    raise ValueError(f"Invalid audience: {aud}")
            elif aud != self.client_id:
                raise ValueError(f"Invalid audience: {aud}")

            # Check expiration
            exp = claims.get("exp")
            if exp:
                exp_time = datetime.fromtimestamp(exp, tz=UTC)
                if datetime.now(UTC) > exp_time:
                    raise ValueError("Token has expired")

            logger.info("Successfully verified ID token", sub=claims.get("sub"))
            return dict(claims)

        except JoseError as e:
            logger.error("Failed to verify ID token", error=str(e))
            raise ValueError(f"Failed to verify ID token: {e}") from e

    async def get_userinfo(self, access_token: str) -> dict[str, Any]:
        """
        Fetch user information from userinfo endpoint

        Args:
            access_token: Access token from token response

        Returns:
            dict: User information
        """
        discovery = await self.get_discovery_document()
        userinfo_endpoint = discovery.get("userinfo_endpoint")

        if not userinfo_endpoint:
            raise ValueError("No userinfo_endpoint in discovery document")

        try:
            async with AsyncOAuth2Client(token={"access_token": access_token}) as client:
                resp = await client.get(userinfo_endpoint)
                resp.raise_for_status()
                userinfo = resp.json()
                logger.info("Fetched user info", sub=userinfo.get("sub"))
                return dict(userinfo)
        except Exception as e:
            logger.error("Failed to fetch user info", error=str(e))
            raise ValueError(f"Failed to fetch user info: {e}") from e

    async def create_user_from_tokens(self, id_token: str, access_token: str | None = None) -> User:
        """
        Create User object from ID token and optionally fetch additional userinfo

        Args:
            id_token: JWT ID token
            access_token: Optional access token for fetching additional user info

        Returns:
            User: User object with claims
        """
        # Verify and decode ID token
        claims = await self.verify_and_decode_id_token(id_token)

        # Optionally fetch additional userinfo if access token provided
        if access_token:
            try:
                userinfo = await self.get_userinfo(access_token)
                # Merge userinfo into claims
                claims.update(userinfo)
            except Exception as e:
                logger.warning("Failed to fetch userinfo, using ID token claims only", error=str(e))

        # Create User object
        user = User(
            sub=claims["sub"],
            email=claims.get("email"),
            name=claims.get("name"),
            preferred_username=claims.get("preferred_username"),
            iss=claims.get("iss"),
            aud=claims.get("aud"),
            exp=datetime.fromtimestamp(claims["exp"], tz=UTC) if claims.get("exp") else None,
            iat=datetime.fromtimestamp(claims["iat"], tz=UTC) if claims.get("iat") else None,
            is_default_user=False,
            raw_claims=claims,
        )

        logger.info(
            "Created user from tokens",
            sub=user.sub,
            email=user.email,
            name=user.name,
        )

        return user


# Global OIDC service instance
oidc_service = OIDCService()
