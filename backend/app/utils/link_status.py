"""
Central utility for calculating access link status.

This module provides the single source of truth for determining the status
of an access link based on its attributes.
"""

from datetime import UTC, datetime

from app.models.access_link import AccessLink, LinkStatus


def calculate_link_status(link: AccessLink) -> LinkStatus:
    """
    Calculate the correct status for an access link based on its attributes.

    This is the SINGLE SOURCE OF TRUTH for link status calculation. All code
    that needs to determine a link's status should call this function.

    Status determination logic (in order of priority):
    1. DISABLED - if link is manually disabled (preserves manual override)
    2. INACTIVE - if link is deleted
    3. INACTIVE - if current time is before active_on (not yet active)
    4. INACTIVE - if current time is after expiration (expired)
    5. INACTIVE - if granted_count >= max_uses (usage limit reached)
    6. ACTIVE - if none of the above conditions are met

    Args:
        link: The AccessLink entity to evaluate

    Returns:
        LinkStatus: The calculated status (ACTIVE, INACTIVE, or DISABLED)

    Example:
        >>> link = AccessLink(...)
        >>> new_status = calculate_link_status(link)
        >>> if link.status != new_status:
        ...     link.status = new_status
        ...     # save to database

    Note:
        This function is pure and does not modify the link entity.
        The caller is responsible for updating the link's status field
        and persisting changes to the database.
    """
    # Priority 1: Preserve manual DISABLED status
    # If a link is manually disabled, it stays disabled until explicitly enabled
    if link.status == LinkStatus.DISABLED:
        return LinkStatus.DISABLED

    # Priority 2: Deleted links are always INACTIVE
    # Deleted links cannot be reactivated
    if link.is_deleted:
        return LinkStatus.INACTIVE

    # Get current time for temporal checks
    now = datetime.now(UTC)

    # Priority 3: Check if link is not yet active (before start time)
    if link.active_on:
        active_on = link.active_on if link.active_on.tzinfo else link.active_on.replace(tzinfo=UTC)
        if now < active_on:
            return LinkStatus.INACTIVE

    # Priority 4: Check if link has expired (after end time)
    if link.expiration:
        expiration = (
            link.expiration if link.expiration.tzinfo else link.expiration.replace(tzinfo=UTC)
        )
        if now > expiration:
            return LinkStatus.INACTIVE

    # Priority 5: Check if maximum uses have been exceeded
    # Note: granted_count should always be set, but we check defensively
    if link.max_uses is not None and (link.granted_count or 0) >= link.max_uses:
        return LinkStatus.INACTIVE

    # If none of the inactive conditions are met, link should be ACTIVE
    return LinkStatus.ACTIVE
