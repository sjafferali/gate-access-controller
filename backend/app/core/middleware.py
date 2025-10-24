"""Custom middleware for request handling"""

from app.core.config import settings
from app.db.base import get_db
from app.models.system_settings import SystemSettings
from fastapi import Request
from sqlalchemy import select
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response


class URLContextMiddleware(BaseHTTPMiddleware):
    """Middleware to detect admin vs links URL context"""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        """
        Detect if request is for admin or links URL and store in request.state

        This allows authentication logic to differentiate between:
        - Admin requests (should require OIDC when enabled)
        - Links requests (should never require authentication)
        """
        # Default to admin context
        request.state.is_admin_request = True
        request.state.is_links_request = False

        # Get the host from the request
        host = request.headers.get("host", "")

        # Try to load URL settings from database or environment
        admin_url = settings.ADMIN_URL
        links_url = settings.LINKS_URL

        # Try to get settings from database (these override environment variables)
        try:
            async for db in get_db():
                result = await db.execute(select(SystemSettings).limit(1))
                db_settings = result.scalar_one_or_none()

                if db_settings:
                    if db_settings.admin_url:
                        admin_url = db_settings.admin_url
                    if db_settings.links_url:
                        links_url = db_settings.links_url
                break
        except Exception:
            # If database not available or error, fall back to environment variables
            pass

        # Determine context based on host
        # Remove port from host for comparison
        host_without_port = host.split(":")[0] if ":" in host else host

        if links_url:
            # Remove protocol and port from links_url for comparison
            links_domain = links_url.replace("https://", "").replace("http://", "").split(":")[0]
            if host_without_port == links_domain:
                request.state.is_admin_request = False
                request.state.is_links_request = True

        if admin_url:
            # Remove protocol and port from admin_url for comparison
            admin_domain = admin_url.replace("https://", "").replace("http://", "").split(":")[0]
            if host_without_port == admin_domain:
                request.state.is_admin_request = True
                request.state.is_links_request = False

        response = await call_next(request)
        return response
