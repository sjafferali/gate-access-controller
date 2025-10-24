"""Service for managing access links"""

from datetime import UTC, datetime, timedelta

from nanoid import generate
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.schemas import AccessLinkCreate
from app.core.config import settings
from app.core.logging import logger
from app.models import AccessLink, LinkStatus
from app.services.audit_service import AuditService


class LinkService:
    """Service for managing access links"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_link(
        self,
        link_data: AccessLinkCreate,
        ip_address: str | None = None,
        user_agent: str | None = None,
        user_id: str | None = None,
        user_name: str | None = None,
    ) -> AccessLink:
        """Create a new access link with a unique code"""
        from app.utils.link_status import calculate_link_status

        # Use custom link code if provided, otherwise generate one
        if link_data.link_code:
            # Validate that custom code is unique
            if await self._is_code_taken(link_data.link_code):
                raise ValueError(f"Link code '{link_data.link_code}' is already in use. Please choose a different code.")
            link_code = link_data.link_code
        else:
            # Generate unique link code
            link_code = await self._generate_unique_code()

        # Set default expiration if not provided
        if not link_data.expiration:
            link_data.expiration = datetime.now(UTC) + timedelta(
                hours=settings.DEFAULT_LINK_EXPIRATION_HOURS
            )

        # Create the link with initial ACTIVE status
        # Status will be recalculated immediately after creation
        link = AccessLink(
            link_code=link_code,
            status=LinkStatus.ACTIVE,
            granted_count=0,  # Initialize to 0 (database default)
            denied_count=0,  # Initialize to 0 (database default)
            owner_user_id=user_id,  # Track who created this link
            owner_user_name=user_name,  # Track who created this link
            **link_data.model_dump(),
        )

        # Calculate the correct status based on the provided fields
        # (e.g., may be INACTIVE if expiration is in the past, not yet active, etc.)
        calculated_status = calculate_link_status(link)
        status_changed = calculated_status != LinkStatus.ACTIVE

        if status_changed:
            link.status = calculated_status

        self.db.add(link)
        await self.db.commit()
        await self.db.refresh(link)

        # Create audit log entry
        await AuditService.log_link_created(
            db=self.db,
            link=link,
            ip_address=ip_address,
            user_agent=user_agent,
            user_id=user_id,
            user_name=user_name,
        )
        await self.db.commit()

        log_data = {
            "link_id": link.id,
            "link_code": link_code,
            "name": link.name,
            "status": link.status,  # Already a string since LinkStatus inherits from str
        }
        if status_changed:
            log_data["status_calculated"] = f"ACTIVE → {link.status}"

        logger.info("Created new access link", **log_data)

        return link

    async def _is_code_taken(self, code: str) -> bool:
        """Check if a link code is already taken"""
        query = select(AccessLink).filter(AccessLink.link_code == code.upper())
        result = await self.db.execute(query)
        existing = result.scalar_one_or_none()
        return existing is not None

    async def _generate_unique_code(self, max_attempts: int = 10) -> str:
        """Generate a unique link code"""
        alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"

        for attempt in range(max_attempts):
            code: str = generate(alphabet, settings.LINK_CODE_LENGTH)

            # Check if code already exists
            if not await self._is_code_taken(code):
                return code

            logger.warning(
                "Generated duplicate link code, retrying",
                attempt=attempt + 1,
                code=code,
            )

        raise ValueError(f"Failed to generate unique code after {max_attempts} attempts")

    async def get_link_by_code(self, link_code: str) -> AccessLink | None:
        """Get an access link by its code"""
        query = select(AccessLink).filter(AccessLink.link_code == link_code)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def validate_link(self, link_code: str) -> tuple[bool, str, AccessLink | None]:
        """
        Validate if a link code can grant access.

        Returns:
            tuple: (is_valid, message, link_object)
        """
        # Get the link
        link = await self.get_link_by_code(link_code)

        if not link:
            return False, "Invalid link code", None

        # Check if link can grant access
        can_grant, reason = link.can_grant_access()

        if not can_grant:
            return False, reason, link

        return True, "Link is valid", link

    async def regenerate_link_code(
        self,
        link_id: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
        user_id: str | None = None,
        user_name: str | None = None,
    ) -> AccessLink:
        """Regenerate the code for an existing link"""
        # Get the link
        query = select(AccessLink).filter(AccessLink.id == link_id)
        result = await self.db.execute(query)
        link = result.scalar_one_or_none()

        if not link:
            raise ValueError("Access link not found")

        if link.is_deleted:
            raise ValueError("Cannot regenerate code for deleted link")

        # Generate new unique code
        new_code = await self._generate_unique_code()
        old_code = link.link_code

        # Update the link
        link.link_code = new_code
        link.updated_at = datetime.now()

        await self.db.commit()
        await self.db.refresh(link)

        # Create audit log entry
        await AuditService.log_link_code_regenerated(
            db=self.db,
            link=link,
            old_code=old_code,
            new_code=new_code,
            ip_address=ip_address,
            user_agent=user_agent,
            user_id=user_id,
            user_name=user_name,
        )
        await self.db.commit()

        logger.info(
            "Regenerated link code",
            link_id=link_id,
            old_code=old_code,
            new_code=new_code,
        )

        return link

    async def increment_granted_count(self, link: AccessLink) -> None:
        """Increment the granted count for a link and recalculate status"""
        from app.utils.link_status import calculate_link_status

        original_status = link.status
        link.granted_count += 1
        link.updated_at = datetime.now()

        # Recalculate status using central function
        # (may transition to INACTIVE if max uses reached)
        new_status = calculate_link_status(link)

        if new_status != original_status:
            link.status = new_status
            logger.info(
                "Link status transitioned after granting access",
                link_id=link.id,
                link_code=link.link_code,
                link_name=link.name,
                status_transition=f"{original_status.value} → {new_status.value}",
                granted_count=link.granted_count,
                max_uses=link.max_uses,
            )

        await self.db.commit()

    async def increment_denied_count(self, link: AccessLink) -> None:
        """Increment the denied count for a link"""
        link.denied_count += 1
        link.updated_at = datetime.now()
        await self.db.commit()

    async def check_and_expire_links(self) -> int:
        """
        Check and update status for links that may need status recalculation.

        This checks all ACTIVE links and recalculates their status using the
        central calculate_link_status() function. Links may transition to INACTIVE
        if they have expired, reached max uses, or are no longer within their active window.
        """
        from app.utils.link_status import calculate_link_status

        now = datetime.now()

        # Find all ACTIVE links that might need status updates
        # (expired, not yet active, or max uses exceeded)
        query = select(AccessLink).filter(AccessLink.status == LinkStatus.ACTIVE)
        result = await self.db.execute(query)
        active_links = result.scalars().all()

        # Track which links changed status
        updated_links = []

        # Recalculate status for each link using the central function
        for link in active_links:
            original_status = link.status
            new_status = calculate_link_status(link)

            if new_status != original_status:
                link.status = new_status
                link.updated_at = now
                updated_links.append(link)

        await self.db.commit()

        if updated_links:
            logger.info(
                "Links status updated by scheduled check",
                count=len(updated_links),
                link_ids=[link.id for link in updated_links],
            )

        return len(updated_links)
