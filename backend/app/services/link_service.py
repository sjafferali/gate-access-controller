"""Service for managing access links"""

from datetime import UTC, datetime, timedelta

from nanoid import generate
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.schemas import AccessLinkCreate
from app.core.config import settings
from app.core.logging import logger
from app.models import AccessLink, LinkStatus


class LinkService:
    """Service for managing access links"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_link(self, link_data: AccessLinkCreate) -> AccessLink:
        """Create a new access link with a unique code"""
        # Generate unique link code
        link_code = await self._generate_unique_code()

        # Set default expiration if not provided
        if not link_data.expiration:
            link_data.expiration = datetime.now(UTC) + timedelta(
                hours=settings.DEFAULT_LINK_EXPIRATION_HOURS
            )

        # Create the link
        link = AccessLink(
            link_code=link_code,
            status=LinkStatus.ACTIVE,
            **link_data.model_dump(),
        )

        # Auto-calculate status based on the provided fields
        # (e.g., if expiration is already past or max_uses is 0)
        status_changed = link.update_status()

        self.db.add(link)
        await self.db.commit()
        await self.db.refresh(link)

        log_data = {
            "link_id": link.id,
            "link_code": link_code,
            "name": link.name,
            "status": link.status.value,
        }
        if status_changed:
            log_data["initial_status_override"] = f"ACTIVE → {link.status.value}"

        logger.info("Created new access link", **log_data)

        return link

    async def _generate_unique_code(self, max_attempts: int = 10) -> str:
        """Generate a unique link code"""
        alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"

        for attempt in range(max_attempts):
            code: str = generate(alphabet, settings.LINK_CODE_LENGTH)

            # Check if code already exists
            query = select(AccessLink).filter(AccessLink.link_code == code)
            result = await self.db.execute(query)
            existing = result.scalar_one_or_none()

            if not existing:
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

    async def regenerate_link_code(self, link_id: str) -> AccessLink:
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

        logger.info(
            "Regenerated link code",
            link_id=link_id,
            old_code=old_code,
            new_code=new_code,
        )

        return link

    async def increment_granted_count(self, link: AccessLink) -> None:
        """Increment the granted count for a link and transition status if max uses reached"""
        link.granted_count += 1
        link.updated_at = datetime.now()

        # Check if max uses has been reached and transition status to EXHAUSTED
        if link.max_uses is not None and link.granted_count >= link.max_uses:
            link.status = LinkStatus.EXHAUSTED
            logger.info(
                "Link status transitioned to EXHAUSTED - max uses reached",
                link_id=link.id,
                link_code=link.link_code,
                link_name=link.name,
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
        """Check and set links to inactive that have passed their expiration date"""
        now = datetime.now()

        # Find links that should be inactive (expired)
        query = select(AccessLink).filter(
            AccessLink.status == LinkStatus.ACTIVE,
            AccessLink.expiration <= now,
        )
        result = await self.db.execute(query)
        expired_links = result.scalars().all()

        # Update their status to INACTIVE
        for link in expired_links:
            link.status = LinkStatus.INACTIVE
            link.updated_at = now

        await self.db.commit()

        if expired_links:
            logger.info(
                "Links set to inactive (expired)",
                count=len(expired_links),
                link_ids=[link.id for link in expired_links],
            )

        return len(expired_links)
