"""Service for handling notification provider management and sending notifications"""

from datetime import UTC, datetime
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.models.access_link import AccessLink
from app.models.notification_provider import NotificationProvider, NotificationProviderType


class NotificationService:
    """Service for managing notification providers and sending notifications"""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_all_providers(
        self,
        include_deleted: bool = False,
        enabled_only: bool = False,
    ) -> list[NotificationProvider]:
        """
        Get all notification providers.

        Args:
            include_deleted: Include soft-deleted providers
            enabled_only: Only return enabled providers

        Returns:
            List of notification providers
        """
        query = select(NotificationProvider)

        if not include_deleted:
            query = query.where(NotificationProvider.is_deleted == False)  # noqa: E712

        if enabled_only:
            query = query.where(NotificationProvider.enabled == True)  # noqa: E712

        query = query.order_by(NotificationProvider.created_at.desc())

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_provider_by_id(self, provider_id: str) -> NotificationProvider | None:
        """Get a notification provider by ID"""
        result = await self.db.execute(
            select(NotificationProvider)
            .where(NotificationProvider.id == provider_id)
            .where(NotificationProvider.is_deleted == False)  # noqa: E712
        )
        return result.scalar_one_or_none()

    async def create_provider(
        self,
        name: str,
        provider_type: NotificationProviderType,
        config: dict[str, Any],
        enabled: bool = True,
    ) -> NotificationProvider:
        """
        Create a new notification provider.

        Args:
            name: Friendly name for the provider
            provider_type: Type of provider (pushover, webhook)
            config: Provider-specific configuration
            enabled: Whether the provider is enabled

        Returns:
            Created notification provider
        """
        provider = NotificationProvider(
            name=name,
            provider_type=provider_type,
            config=config,
            enabled=enabled,
        )

        self.db.add(provider)
        await self.db.commit()
        await self.db.refresh(provider)

        logger.info(
            "Notification provider created",
            provider_id=provider.id,
            name=name,
            type=provider_type.value,
        )

        return provider

    async def update_provider(
        self,
        provider_id: str,
        name: str | None = None,
        config: dict[str, Any] | None = None,
        enabled: bool | None = None,
    ) -> NotificationProvider | None:
        """
        Update an existing notification provider.

        Args:
            provider_id: ID of the provider to update
            name: New name (optional)
            config: New configuration (optional)
            enabled: New enabled state (optional)

        Returns:
            Updated notification provider or None if not found
        """
        provider = await self.get_provider_by_id(provider_id)
        if not provider:
            return None

        if name is not None:
            provider.name = name
        if config is not None:
            provider.config = config
        if enabled is not None:
            provider.enabled = enabled

        provider.updated_at = datetime.now(UTC)

        await self.db.commit()
        await self.db.refresh(provider)

        logger.info(
            "Notification provider updated",
            provider_id=provider.id,
            name=provider.name,
        )

        return provider

    async def delete_provider(self, provider_id: str) -> bool:
        """
        Soft-delete a notification provider.

        Args:
            provider_id: ID of the provider to delete

        Returns:
            True if deleted, False if not found
        """
        provider = await self.get_provider_by_id(provider_id)
        if not provider:
            return False

        provider.delete()
        await self.db.commit()

        logger.info(
            "Notification provider deleted",
            provider_id=provider.id,
            name=provider.name,
        )

        return True

    async def send_notification(
        self,
        provider: NotificationProvider,
        link: AccessLink,
        event_type: str = "access_granted",
    ) -> tuple[bool, str]:
        """
        Send a notification via the specified provider.

        Args:
            provider: Notification provider to use
            link: Access link that triggered the notification
            event_type: Type of event (access_granted, access_denied, etc.)

        Returns:
            tuple: (success, message)
        """
        if not provider.enabled:
            logger.debug(
                "Skipping notification - provider disabled",
                provider_id=provider.id,
                provider_name=provider.name,
            )
            return False, "Provider is disabled"

        try:
            if provider.provider_type == NotificationProviderType.PUSHOVER:
                return await self._send_pushover(provider, link, event_type)
            elif provider.provider_type == NotificationProviderType.WEBHOOK:
                return await self._send_webhook(provider, link, event_type)
            else:
                logger.error(
                    "Unknown notification provider type",
                    provider_type=provider.provider_type,
                )
                return False, f"Unknown provider type: {provider.provider_type}"

        except Exception as e:
            logger.error(
                "Failed to send notification",
                provider_id=provider.id,
                provider_name=provider.name,
                provider_type=provider.provider_type.value,
                error=str(e),
                error_type=type(e).__name__,
            )
            return False, f"Error: {str(e)}"

    async def _send_pushover(
        self,
        provider: NotificationProvider,
        link: AccessLink,
        event_type: str,
    ) -> tuple[bool, str]:
        """Send notification via Pushover"""
        config = provider.config

        # Build message based on event type
        if event_type == "access_granted":
            title = "Gate Access Granted"
            message = f"Access granted via link: {link.name} ({link.link_code})"
        elif event_type == "access_denied":
            title = "Gate Access Denied"
            message = f"Access denied for link: {link.name} ({link.link_code})"
        else:
            title = "Gate Access Event"
            message = f"Event: {event_type} - Link: {link.name} ({link.link_code})"

        # Prepare Pushover API request
        payload: dict[str, Any] = {
            "token": config.get("api_token"),
            "user": config.get("user_key"),
            "title": title,
            "message": message,
            "priority": config.get("priority", 0),
        }

        if config.get("sound"):
            payload["sound"] = config["sound"]
        if config.get("device"):
            payload["device"] = config["device"]

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.pushover.net/1/messages.json",
                    json=payload,
                    timeout=10.0,
                )

                if response.status_code == 200:
                    logger.info(
                        "Pushover notification sent successfully",
                        provider_id=provider.id,
                        link_code=link.link_code,
                    )
                    return True, "Notification sent"
                else:
                    error_msg = f"Pushover API error: {response.status_code}"
                    logger.error(
                        "Pushover notification failed",
                        provider_id=provider.id,
                        status_code=response.status_code,
                        response_text=response.text,
                    )
                    return False, error_msg

        except httpx.TimeoutException as e:
            logger.error(
                "Pushover notification timeout",
                provider_id=provider.id,
                error=str(e),
            )
            return False, "Timeout"

        except httpx.RequestError as e:
            logger.error(
                "Pushover notification request error",
                provider_id=provider.id,
                error=str(e),
            )
            return False, f"Request error: {str(e)}"

    async def _send_webhook(
        self,
        provider: NotificationProvider,
        link: AccessLink,
        event_type: str,
    ) -> tuple[bool, str]:
        """Send notification via custom webhook"""
        config = provider.config

        url = config.get("url")
        if not url:
            return False, "Webhook URL not configured"

        method = config.get("method", "POST").upper()
        headers = config.get("headers", {})
        body_template = config.get("body_template")

        # Prepare default body if no template provided
        if body_template:
            # Replace placeholders in template
            body = body_template.format(
                link_code=link.link_code,
                link_name=link.name,
                event_type=event_type,
                timestamp=datetime.now(UTC).isoformat(),
            )
        else:
            # Default JSON body
            body = {
                "event_type": event_type,
                "link_code": link.link_code,
                "link_name": link.name,
                "timestamp": datetime.now(UTC).isoformat(),
            }

        try:
            async with httpx.AsyncClient() as client:
                if method == "POST":
                    if isinstance(body, str):
                        headers["Content-Type"] = "text/plain"
                        response = await client.post(
                            url, headers=headers, content=body, timeout=10.0
                        )
                    else:
                        response = await client.post(url, headers=headers, json=body, timeout=10.0)
                elif method == "GET":
                    response = await client.get(url, headers=headers, timeout=10.0)
                elif method == "PUT":
                    if isinstance(body, str):
                        headers["Content-Type"] = "text/plain"
                        response = await client.put(
                            url, headers=headers, content=body, timeout=10.0
                        )
                    else:
                        response = await client.put(url, headers=headers, json=body, timeout=10.0)
                elif method == "PATCH":
                    if isinstance(body, str):
                        headers["Content-Type"] = "text/plain"
                        response = await client.patch(
                            url, headers=headers, content=body, timeout=10.0
                        )
                    else:
                        response = await client.patch(url, headers=headers, json=body, timeout=10.0)
                else:
                    return False, f"Unsupported HTTP method: {method}"

                if 200 <= response.status_code < 300:
                    logger.info(
                        "Webhook notification sent successfully",
                        provider_id=provider.id,
                        link_code=link.link_code,
                        status_code=response.status_code,
                    )
                    return True, "Notification sent"
                else:
                    error_msg = f"Webhook error: {response.status_code}"
                    logger.error(
                        "Webhook notification failed",
                        provider_id=provider.id,
                        status_code=response.status_code,
                        response_text=response.text,
                    )
                    return False, error_msg

        except httpx.TimeoutException as e:
            logger.error(
                "Webhook notification timeout",
                provider_id=provider.id,
                error=str(e),
            )
            return False, "Timeout"

        except httpx.RequestError as e:
            logger.error(
                "Webhook notification request error",
                provider_id=provider.id,
                error=str(e),
            )
            return False, f"Request error: {str(e)}"

    async def send_notifications_for_link(
        self,
        link: AccessLink,
        event_type: str = "access_granted",
    ) -> dict[str, tuple[bool, str]]:
        """
        Send notifications to all providers configured for a link.

        Args:
            link: Access link that triggered notifications
            event_type: Type of event

        Returns:
            Dictionary mapping provider_id to (success, message)
        """
        results: dict[str, tuple[bool, str]] = {}

        if not link.notification_providers:
            logger.debug(
                "No notification providers configured for link",
                link_id=link.id,
                link_code=link.link_code,
            )
            return results

        for provider in link.notification_providers:
            success, message = await self.send_notification(provider, link, event_type)
            results[provider.id] = (success, message)

        logger.info(
            "Notifications sent for link",
            link_code=link.link_code,
            provider_count=len(results),
            success_count=sum(1 for success, _ in results.values() if success),
        )

        return results
