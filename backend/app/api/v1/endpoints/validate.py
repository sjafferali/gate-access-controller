"""Validation API endpoints for checking and using access links"""

from app.api.v1.schemas import AccessLinkPublic, MessageResponse
from app.core.logging import logger
from app.db.base import get_db
from app.models import AccessLog, AccessStatus, DenialReason
from app.services.link_service import LinkService
from app.services.notification_service import NotificationService
from app.services.webhook_service import WebhookService
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


def get_client_ip(request: Request) -> str:
    """Get the client's IP address from the request"""
    # Check for X-Forwarded-For header (when behind proxy)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # Get the first IP in the chain
        return forwarded_for.split(",")[0].strip()

    # Check for X-Real-IP header
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip

    # Fall back to direct connection
    return request.client.host if request.client else "unknown"


@router.get("/{link_code}", response_model=AccessLinkPublic)
async def validate_link(
    link_code: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> AccessLinkPublic:
    """Validate if a link code is valid without using it. If auto_open is enabled, automatically trigger gate opening."""
    try:
        link_service = LinkService(db)
        is_valid, message, link = await link_service.validate_link(link_code)

        if not link:
            return AccessLinkPublic(
                is_valid=False,
                name="Unknown",
                notes=None,
                message=message,
                auto_open=False,
                active_on=None,
                expiration=None,
            )

        # If auto_open is enabled and link is valid, trigger gate opening
        if link.auto_open and is_valid:
            client_ip = get_client_ip(request)
            user_agent = request.headers.get("User-Agent", "Unknown")

            # Create access log entry
            log = AccessLog(
                link_id=link.id,
                link_code_used=link_code,
                ip_address=client_ip,
                user_agent=user_agent,
            )

            try:
                webhook_service = WebhookService(db)
                response_time = await webhook_service.trigger_gate_open()
                log.webhook_response_time_ms = response_time
                log.status = AccessStatus.GRANTED

                # Increment granted count
                await link_service.increment_granted_count(link)

                db.add(log)
                await db.commit()

                # Send notifications (in background, don't block response)
                try:
                    notification_service = NotificationService(db)
                    await notification_service.send_notifications_for_link(
                        link, event_type="access_granted"
                    )
                except Exception as notif_error:
                    logger.warning(
                        "Failed to send notifications",
                        link_code=link_code,
                        error=str(notif_error),
                    )

                logger.info(
                    "Auto-open: Access granted",
                    link_code=link_code,
                    link_name=link.name,
                    ip=client_ip,
                    response_time_ms=response_time,
                )

                return AccessLinkPublic(
                    is_valid=True,
                    name=link.name,
                    notes=link.notes,
                    message="Gate opening automatically...",
                    auto_open=True,
                    active_on=link.active_on,
                    expiration=link.expiration,
                )

            except Exception as webhook_error:
                # Webhook failed
                log.status = AccessStatus.ERROR
                log.error_message = str(webhook_error)
                log.denial_reason = DenialReason.WEBHOOK_FAILED

                db.add(log)
                await db.commit()

                logger.error(
                    "Auto-open: Webhook failed",
                    link_code=link_code,
                    ip=client_ip,
                    error=str(webhook_error),
                )

                return AccessLinkPublic(
                    is_valid=False,
                    name=link.name,
                    notes=link.notes,
                    message="Gate control system unavailable",
                    auto_open=True,
                    active_on=link.active_on,
                    expiration=link.expiration,
                )

        return AccessLinkPublic(
            is_valid=is_valid,
            name=link.name,
            notes=link.notes,
            message=message,
            auto_open=link.auto_open,
            active_on=link.active_on,
            expiration=link.expiration,
        )

    except Exception as e:
        logger.error("Error validating link", link_code=link_code, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to validate link",
        ) from e


@router.post("/{link_code}/access", response_model=MessageResponse)
async def request_access(
    link_code: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Request access using a link code - triggers the gate webhook"""
    client_ip = get_client_ip(request)
    user_agent = request.headers.get("User-Agent", "Unknown")

    try:
        link_service = LinkService(db)
        webhook_service = WebhookService(db)

        # Validate the link
        is_valid, message, link = await link_service.validate_link(link_code)

        # Create access log entry
        log = AccessLog(
            link_id=link.id if link else None,
            link_code_used=link_code,
            ip_address=client_ip,
            user_agent=user_agent,
        )

        if not is_valid:
            # Access denied
            log.status = AccessStatus.DENIED
            log.denial_reason = _get_denial_reason(message)

            # Increment denied count if link exists
            if link:
                await link_service.increment_denied_count(link)

            db.add(log)
            await db.commit()

            logger.info(
                "Access denied",
                link_code=link_code,
                ip=client_ip,
                reason=message,
            )

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=message,
            )

        # Link is valid, trigger the webhook
        # At this point, link must exist (is_valid=True guarantees this)
        assert link is not None, "Link must exist for valid access"

        try:
            response_time = await webhook_service.trigger_gate_open()
            log.webhook_response_time_ms = response_time

            # Access granted
            log.status = AccessStatus.GRANTED

            # Increment granted count
            await link_service.increment_granted_count(link)

            db.add(log)
            await db.commit()

            # Send notifications (in background, don't block response)
            try:
                notification_service = NotificationService(db)
                await notification_service.send_notifications_for_link(
                    link, event_type="access_granted"
                )
            except Exception as notif_error:
                logger.warning(
                    "Failed to send notifications",
                    link_code=link_code,
                    error=str(notif_error),
                )

            logger.info(
                "Access granted",
                link_code=link_code,
                link_name=link.name,
                ip=client_ip,
                response_time_ms=response_time,
            )

            return MessageResponse(
                message=f"Access granted - {link.name}",
                success=True,
                data={
                    "link_name": link.name,
                    "notes": link.notes,
                    "remaining_uses": link.remaining_uses,
                },
            )

        except Exception as webhook_error:
            # Webhook failed
            log.status = AccessStatus.ERROR
            log.error_message = str(webhook_error)
            log.denial_reason = DenialReason.WEBHOOK_FAILED

            db.add(log)
            await db.commit()

            logger.error(
                "Webhook failed",
                link_code=link_code,
                ip=client_ip,
                error=str(webhook_error),
            )

            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Gate control system unavailable",
            ) from webhook_error

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Error processing access request",
            link_code=link_code,
            ip=client_ip,
            error=str(e),
        )

        # Try to log the error
        try:
            error_log = AccessLog(
                link_code_used=link_code,
                ip_address=client_ip,
                user_agent=user_agent,
                status=AccessStatus.ERROR,
                error_message=str(e),
            )
            db.add(error_log)
            await db.commit()
        except Exception:
            pass

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process access request",
        ) from e


def _get_denial_reason(message: str) -> DenialReason:
    """Map denial message to denial reason enum"""
    message_lower = message.lower()

    if "expired" in message_lower:
        return DenialReason.EXPIRED
    elif "disabled" in message_lower:
        return DenialReason.DISABLED
    elif "deleted" in message_lower:
        return DenialReason.DELETED
    elif "not active" in message_lower:
        return DenialReason.NOT_ACTIVE_YET
    elif "maximum uses" in message_lower or "max uses" in message_lower:
        return DenialReason.MAX_USES_EXCEEDED
    elif "invalid" in message_lower:
        return DenialReason.INVALID_CODE
    else:
        return DenialReason.OTHER
