"""Service for creating audit log entries"""

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.models.access_link import AccessLink
from app.models.audit_log import AuditAction, AuditLog, ResourceType


class AuditService:
    """Service for creating and managing audit logs"""

    @staticmethod
    async def log_link_created(
        db: AsyncSession,
        link: AccessLink,
        ip_address: str | None = None,
        user_agent: str | None = None,
        user_id: str | None = None,
        user_email: str | None = None,
    ) -> AuditLog:
        """Log creation of a new access link"""
        audit_log = AuditLog(
            id=str(uuid.uuid4()),
            action=AuditAction.LINK_CREATED.value,
            resource_type=ResourceType.ACCESS_LINK.value,
            resource_id=link.id,
            link_code=link.link_code,
            link_name=link.name,
            user_id=user_id,
            user_email=user_email,
            ip_address=ip_address,
            user_agent=user_agent,
            changes=None,  # No changes for creation
            context_data={
                "purpose": link.purpose,
                "status": link.status,
                "expiration": link.expiration.isoformat() if link.expiration else None,
                "active_on": link.active_on.isoformat() if link.active_on else None,
                "max_uses": link.max_uses,
                "auto_open": link.auto_open,
            },
        )
        db.add(audit_log)
        await db.flush()

        logger.info(
            f"Audit log created: Link created - {link.name} ({link.link_code})",
            extra={"audit_log_id": audit_log.id, "link_id": link.id},
        )
        return audit_log

    @staticmethod
    async def log_link_updated(
        db: AsyncSession,
        link: AccessLink,
        changes: dict[str, dict[str, Any]],
        ip_address: str | None = None,
        user_agent: str | None = None,
        user_id: str | None = None,
        user_email: str | None = None,
    ) -> AuditLog:
        """
        Log update of an access link

        Args:
            db: Database session
            link: The updated link
            changes: Dictionary of changed fields in format:
                {'field_name': {'old': old_value, 'new': new_value}}
            ip_address: IP address of requester
            user_agent: User agent of requester
            user_id: ID of user (for future multi-user support)
            user_email: Email of user (for future multi-user support)
        """
        audit_log = AuditLog(
            id=str(uuid.uuid4()),
            action=AuditAction.LINK_UPDATED.value,
            resource_type=ResourceType.ACCESS_LINK.value,
            resource_id=link.id,
            link_code=link.link_code,
            link_name=link.name,
            user_id=user_id,
            user_email=user_email,
            ip_address=ip_address,
            user_agent=user_agent,
            changes=changes,
            context_data={
                "updated_fields": list(changes.keys()),
                "current_status": link.status,
            },
        )
        db.add(audit_log)
        await db.flush()

        logger.info(
            f"Audit log created: Link updated - {link.name} ({link.link_code}), "
            f"fields: {', '.join(changes.keys())}",
            extra={"audit_log_id": audit_log.id, "link_id": link.id, "changes": changes},
        )
        return audit_log

    @staticmethod
    async def log_link_deleted(
        db: AsyncSession,
        link: AccessLink,
        ip_address: str | None = None,
        user_agent: str | None = None,
        user_id: str | None = None,
        user_email: str | None = None,
    ) -> AuditLog:
        """Log deletion (soft delete) of an access link"""
        audit_log = AuditLog(
            id=str(uuid.uuid4()),
            action=AuditAction.LINK_DELETED.value,
            resource_type=ResourceType.ACCESS_LINK.value,
            resource_id=link.id,
            link_code=link.link_code,
            link_name=link.name,
            user_id=user_id,
            user_email=user_email,
            ip_address=ip_address,
            user_agent=user_agent,
            changes=None,
            context_data={
                "deleted_at": datetime.now(UTC).isoformat(),
                "previous_status": link.status,
                "total_uses": link.total_uses,
                "granted_count": link.granted_count,
                "denied_count": link.denied_count,
            },
        )
        db.add(audit_log)
        await db.flush()

        logger.info(
            f"Audit log created: Link deleted - {link.name} ({link.link_code})",
            extra={"audit_log_id": audit_log.id, "link_id": link.id},
        )
        return audit_log

    @staticmethod
    async def log_link_disabled(
        db: AsyncSession,
        link: AccessLink,
        ip_address: str | None = None,
        user_agent: str | None = None,
        user_id: str | None = None,
        user_email: str | None = None,
    ) -> AuditLog:
        """Log disabling of an access link"""
        audit_log = AuditLog(
            id=str(uuid.uuid4()),
            action=AuditAction.LINK_DISABLED.value,
            resource_type=ResourceType.ACCESS_LINK.value,
            resource_id=link.id,
            link_code=link.link_code,
            link_name=link.name,
            user_id=user_id,
            user_email=user_email,
            ip_address=ip_address,
            user_agent=user_agent,
            changes={"status": {"old": "ACTIVE", "new": "DISABLED"}},
            context_data={
                "disabled_at": datetime.now(UTC).isoformat(),
            },
        )
        db.add(audit_log)
        await db.flush()

        logger.info(
            f"Audit log created: Link disabled - {link.name} ({link.link_code})",
            extra={"audit_log_id": audit_log.id, "link_id": link.id},
        )
        return audit_log

    @staticmethod
    async def log_link_enabled(
        db: AsyncSession,
        link: AccessLink,
        ip_address: str | None = None,
        user_agent: str | None = None,
        user_id: str | None = None,
        user_email: str | None = None,
    ) -> AuditLog:
        """Log enabling of a previously disabled access link"""
        audit_log = AuditLog(
            id=str(uuid.uuid4()),
            action=AuditAction.LINK_ENABLED.value,
            resource_type=ResourceType.ACCESS_LINK.value,
            resource_id=link.id,
            link_code=link.link_code,
            link_name=link.name,
            user_id=user_id,
            user_email=user_email,
            ip_address=ip_address,
            user_agent=user_agent,
            changes={"status": {"old": "DISABLED", "new": link.status}},
            context_data={
                "enabled_at": datetime.now(UTC).isoformat(),
                "resulting_status": link.status,
            },
        )
        db.add(audit_log)
        await db.flush()

        logger.info(
            f"Audit log created: Link enabled - {link.name} ({link.link_code}), "
            f"resulting status: {link.status}",
            extra={"audit_log_id": audit_log.id, "link_id": link.id},
        )
        return audit_log

    @staticmethod
    async def log_link_code_regenerated(
        db: AsyncSession,
        link: AccessLink,
        old_code: str,
        new_code: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
        user_id: str | None = None,
        user_email: str | None = None,
    ) -> AuditLog:
        """Log regeneration of a link code"""
        audit_log = AuditLog(
            id=str(uuid.uuid4()),
            action=AuditAction.LINK_CODE_REGENERATED.value,
            resource_type=ResourceType.ACCESS_LINK.value,
            resource_id=link.id,
            link_code=new_code,  # Store the new code
            link_name=link.name,
            user_id=user_id,
            user_email=user_email,
            ip_address=ip_address,
            user_agent=user_agent,
            changes={"link_code": {"old": old_code, "new": new_code}},
            context_data={
                "regenerated_at": datetime.now(UTC).isoformat(),
            },
        )
        db.add(audit_log)
        await db.flush()

        logger.info(
            f"Audit log created: Link code regenerated - {link.name}, "
            f"from {old_code} to {new_code}",
            extra={"audit_log_id": audit_log.id, "link_id": link.id},
        )
        return audit_log

    @staticmethod
    def serialize_value(value: Any) -> Any:
        """Serialize a value for storage in audit log changes"""
        if isinstance(value, datetime):
            return value.isoformat()
        elif hasattr(value, "value"):  # Enum
            return value.value
        elif value is None:
            return None
        else:
            return value
