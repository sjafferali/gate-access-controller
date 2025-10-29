# Access Link Rate Limiting - Testing Guide

## Overview
Access links now have rate limiting implemented to prevent abuse. Each link can only be used **once every 60 seconds**.

## What Changed

### Backend Changes
1. **Database Model** (`backend/app/models/access_link.py`):
   - Added `last_accessed_at` field to track the timestamp of the last successful access
   - Modified `can_grant_access()` method to check if the link was used in the last 60 seconds

2. **Link Service** (`backend/app/services/link_service.py`):
   - Updated `increment_granted_count()` to also update `last_accessed_at` timestamp

3. **Access Log Model** (`backend/app/models/access_log.py`):
   - Added `RATE_LIMITED` to the `DenialReason` enum

4. **Validation Endpoint** (`backend/app/api/v1/endpoints/validate.py`):
   - Updated `_get_denial_reason()` function to detect rate limiting messages

5. **Database Migration**:
   - Created migration `7c09b4a3f048_add_rate_limiting_to_access_links.py` to add the new field

## How Rate Limiting Works

When an access link is used:
1. The system checks if `last_accessed_at` is within the last 60 seconds
2. If yes, access is denied with a message showing how many seconds to wait
3. If no, access is granted and `last_accessed_at` is updated to the current time
4. The denial reason is logged as `RATE_LIMITED` in the access logs

## Testing Instructions

### Automated Test
Run the provided test script:
```bash
cd gate-access-controller
python test_rate_limiting.py
```

This script will:
- Create a test link
- Attempt to use it multiple times
- Verify that rate limiting is working
- Clean up the test link

### Manual Testing

1. **Start the backend server**:
   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```

2. **Create a test access link** via the admin interface or API:
   - Set a reasonable expiration (e.g., 1 hour from now)
   - Note the link code

3. **Test the rate limiting**:
   - Open the access portal: `http://localhost:3000/portal/{LINK_CODE}`
   - Click "Open Gate" - it should work the first time
   - Immediately click "Open Gate" again - you should see an error message like:
     "Link was recently used. Please wait X seconds before trying again"
   - Wait 60 seconds
   - Click "Open Gate" again - it should work
   - Try again immediately - you should be rate limited again

4. **Check the access logs** in the admin interface:
   - Navigate to the Access Logs section
   - Look for entries with `denial_reason: "rate_limited"`
   - Verify that the timestamps match your testing

## Expected Behavior

### Successful Access (First Use)
- Response: `200 OK`
- Message: "Access granted - {link name}"
- `last_accessed_at` is updated
- `granted_count` is incremented
- Access log shows `status: "granted"`

### Rate Limited (Within 60 Seconds)
- Response: `403 Forbidden`
- Message: "Link was recently used. Please wait {X} seconds before trying again"
- `last_accessed_at` is NOT updated
- `denied_count` is incremented
- Access log shows `status: "denied"` with `denial_reason: "rate_limited"`

### Successful Access (After 60 Seconds)
- Same as first use - access is granted normally

## Frontend Display
The frontend (Access Portal) will automatically display the rate limiting error message when a link is rate limited. No frontend changes were required as it already displays the error message from the backend.

## Configuration
Currently, the rate limit is hardcoded to 60 seconds. If you need to change this value, modify the check in `backend/app/models/access_link.py` in the `can_grant_access()` method:

```python
if time_since_last_access < 60:  # Change 60 to your desired seconds
    wait_time = int(60 - time_since_last_access)  # Update here too
```

## Troubleshooting

If rate limiting is not working:
1. Check that the migration was applied: `cd backend && alembic current`
2. Verify the `last_accessed_at` field exists in the database
3. Check the server logs for any errors
4. Ensure you're testing with the same link code (not creating new links each time)

## Security Considerations
This rate limiting helps prevent:
- Rapid automated attacks on access links
- Accidental multiple uses of links
- Abuse of temporary access permissions
- Excessive webhook triggers to the gate system

The 60-second window provides a good balance between security and usability for legitimate users.