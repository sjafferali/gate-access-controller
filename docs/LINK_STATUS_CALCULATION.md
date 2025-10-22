# Link Status Calculation - Technical Documentation

## Overview

This document describes the centralized link status calculation system implemented in the Gate Access Controller application. All link status determination logic is centralized in a single utility function to ensure consistency, maintainability, and correctness across the entire application.

## The Problem (Before Centralization)

Prior to this refactoring, link status calculation logic was scattered across multiple files:
- `AccessLink.update_status()` - Main calculation in the model
- `LinkService.increment_granted_count()` - Direct status assignment
- `LinkService.check_and_expire_links()` - Direct status assignment
- `AccessLink.delete()` - Direct status assignment

This led to:
- **Duplicated logic**: Status calculation rules repeated in multiple places
- **Inconsistency risk**: Changes to status logic required updates in multiple locations
- **Difficult testing**: No single place to test all status calculation scenarios
- **Maintenance burden**: Hard to understand the complete status calculation rules

## The Solution (Centralized Function)

All link status calculation now goes through a single source of truth:

**Location**: `backend/app/utils/link_status.py`

**Function**: `calculate_link_status(link: AccessLink) -> LinkStatus`

### Function Signature

```python
def calculate_link_status(link: AccessLink) -> LinkStatus:
    """
    Calculate the correct status for an access link based on its attributes.

    This is the SINGLE SOURCE OF TRUTH for link status calculation.

    Args:
        link: The AccessLink entity to evaluate

    Returns:
        LinkStatus: The calculated status (ACTIVE, INACTIVE, or DISABLED)
    """
```

## Status Determination Logic

The function evaluates conditions in **priority order** (highest to lowest):

### 1. DISABLED (Manual Override)
**Condition**: `link.status == LinkStatus.DISABLED`

If a link is manually disabled, it stays disabled until explicitly enabled by a user. This is a manual override that takes precedence over all automatic calculations.

**Why first?** Preserves user intent - manual disables should not be auto-overridden.

### 2. INACTIVE (Deleted)
**Condition**: `link.is_deleted == True`

Deleted links are always INACTIVE and cannot be reactivated. This is a permanent state.

**Why second?** Deleted links should never become active, regardless of other attributes.

### 3. INACTIVE (Not Yet Active)
**Condition**: `current_time < link.active_on`

If the current time is before the link's activation time, the link is not yet active.

**Why third?** Time-based restrictions are fundamental to link lifecycle.

### 4. INACTIVE (Expired)
**Condition**: `current_time > link.expiration`

If the current time is after the link's expiration time, the link has expired.

**Why fourth?** Expired links should not grant access, regardless of usage count.

### 5. INACTIVE (Max Uses Exceeded)
**Condition**: `link.granted_count >= link.max_uses` (when max_uses is not None)

If the link has reached or exceeded its maximum allowed uses, it becomes inactive.

**Why fifth?** After time-based checks, usage-based limits are enforced.

### 6. ACTIVE (Default)
**Condition**: None of the above conditions are met

If all checks pass, the link is active and can grant access.

## Link Status Values

The application uses three status values:

| Status | Description | Can Grant Access? |
|--------|-------------|-------------------|
| `ACTIVE` | Link is currently active and usable | ✅ Yes |
| `INACTIVE` | Link cannot be used (expired, not active yet, or max uses reached) | ❌ No |
| `DISABLED` | Link has been manually disabled by a user | ❌ No |

## Usage Guide

### When to Call `calculate_link_status()`

You should call this function in any situation where you need to determine a link's status:

#### 1. Creating a New Link
```python
from app.utils.link_status import calculate_link_status

# In LinkService.create_link()
link = AccessLink(link_code=code, status=LinkStatus.ACTIVE, ...)
calculated_status = calculate_link_status(link)
if calculated_status != LinkStatus.ACTIVE:
    link.status = calculated_status
```

**File**: `backend/app/services/link_service.py:44`

#### 2. Updating Link Attributes
```python
# In API endpoint update_access_link()
# After updating active_on, expiration, or max_uses
link.active_on = new_active_on
link.expiration = new_expiration

# Recalculate status
status_changed = link.update_status()  # Calls calculate_link_status internally
```

**File**: `backend/app/api/v1/endpoints/access_links.py:183`

#### 3. Granting Access (Incrementing Usage)
```python
# In LinkService.increment_granted_count()
link.granted_count += 1

# Recalculate status (may become INACTIVE if max uses reached)
new_status = calculate_link_status(link)
if new_status != link.status:
    link.status = new_status
```

**File**: `backend/app/services/link_service.py:153`

#### 4. Scheduled Status Checks
```python
# In LinkService.check_and_expire_links()
for link in active_links:
    new_status = calculate_link_status(link)
    if new_status != link.status:
        link.status = new_status
        link.updated_at = now
```

**File**: `backend/app/services/link_service.py:199`

**Frequency**: Every `LINK_EXPIRATION_CHECK_INTERVAL_SECONDS` (configurable)

#### 5. Soft-Deleting a Link
```python
# In AccessLink.delete()
self.is_deleted = True
self.status = calculate_link_status(self)  # Will return INACTIVE
```

**File**: `backend/app/models/access_link.py:293`

#### 6. Enabling a Disabled Link
```python
# In AccessLink.enable()
if self.status == LinkStatus.DISABLED:
    return self.update_status()  # Recalculates using central function
```

**File**: `backend/app/models/access_link.py:349`

### Model Method: `AccessLink.update_status()`

For convenience, the `AccessLink` model provides an `update_status()` method that:
1. Calls `calculate_link_status(self)`
2. Updates `self.status` if it changed
3. Returns `True` if status changed, `False` otherwise

```python
# Using the model method
if link.update_status():
    print(f"Status changed to {link.status}")
```

**Implementation**: `backend/app/models/access_link.py:250-275`

### Important: Manual DISABLED Status

The `disable()` method is the **only place** that directly sets `LinkStatus.DISABLED` without calling `calculate_link_status()`. This is intentional because:

- DISABLED is a manual override by users
- `calculate_link_status()` preserves DISABLED status (returns DISABLED if input is DISABLED)
- Only the `enable()` method can remove DISABLED status

**How `enable()` Works:**

The `enable()` method uses a special technique to bypass the DISABLED preservation logic:

```python
# Disabling a link (direct assignment)
link.disable()  # Sets status to DISABLED directly

# Enabling a link (bypasses DISABLED preservation)
link.enable()
# 1. Temporarily sets status to ACTIVE
# 2. Calls update_status() which uses calculate_link_status()
# 3. Central function now sees ACTIVE (not DISABLED), so it evaluates normally
# 4. Result: ACTIVE if valid, INACTIVE if expired/max uses exceeded
```

This approach ensures that:
- Automatic status calculations preserve manual DISABLED status
- Explicit enable operations properly recalculate based on current conditions
- Enabled links become INACTIVE (not ACTIVE) if they're expired or maxed out

## Testing the Status Calculation

When testing link status logic, you only need to test the `calculate_link_status()` function:

```python
def test_expired_link_is_inactive():
    link = AccessLink(
        expiration=datetime.now(UTC) - timedelta(hours=1),
        status=LinkStatus.ACTIVE,
        is_deleted=False,
        granted_count=0,
        max_uses=None
    )

    assert calculate_link_status(link) == LinkStatus.INACTIVE

def test_disabled_link_stays_disabled():
    link = AccessLink(
        status=LinkStatus.DISABLED,
        is_deleted=False,
        granted_count=0,
        max_uses=10
    )

    assert calculate_link_status(link) == LinkStatus.DISABLED
```

## Code Locations Reference

### Core Implementation
- **Central Function**: `backend/app/utils/link_status.py` - `calculate_link_status()`
- **Model Method**: `backend/app/models/access_link.py:250` - `AccessLink.update_status()`

### Places That Use the Central Function
1. **Link Creation**: `backend/app/services/link_service.py:44`
2. **Link Updates**: `backend/app/api/v1/endpoints/access_links.py:183`
3. **Access Granting**: `backend/app/services/link_service.py:153`
4. **Scheduled Checks**: `backend/app/services/link_service.py:199`
5. **Link Deletion**: `backend/app/models/access_link.py:293`
6. **Link Enabling**: `backend/app/models/access_link.py:349`

### Special Cases (Direct Assignment)
- **Link Disabling**: `backend/app/models/access_link.py:312` - Direct assignment of DISABLED status

## Migration Notes

If you're adding new features that involve link status:

1. ✅ **DO** call `calculate_link_status()` or `link.update_status()` to determine status
2. ✅ **DO** update the central function if you add new status rules
3. ❌ **DON'T** directly assign status values (except for DISABLED in `disable()` method)
4. ❌ **DON'T** duplicate status calculation logic elsewhere

## Future Enhancements

Potential improvements to consider:

1. **Status Transition Events**: Emit events when status changes for webhooks/notifications
2. **Status History**: Track status changes over time for analytics
3. **Configurable Rules**: Make status rules configurable per deployment
4. **Status Reasons**: Return both status and reason for INACTIVE state
5. **Preemptive Notifications**: Warn users before links expire or reach max uses

## Questions or Issues?

If you encounter any issues with link status calculation or have questions about the implementation, please:

1. Review this document first
2. Check the central function implementation at `backend/app/utils/link_status.py`
3. Open an issue with details about the unexpected behavior

---

**Last Updated**: 2025-10-22
**Author**: Gate Access Controller Development Team
