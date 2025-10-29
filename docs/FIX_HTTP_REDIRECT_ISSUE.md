# HTTP to HTTPS Redirect Issue - Complete Fix

## What Was Fixed

### 1. Frontend URL Generation (`frontend/src/utils/linkUrl.ts`)
- **Previous behavior**: Always forced HTTPS for URLs without explicit protocol
- **Fixed behavior**: Now respects HTTP when explicitly specified in configuration
- **Files changed**:
  - `frontend/src/utils/linkUrl.ts` - Both `generateLinkUrl()` and `generateLinkUrlSync()` functions

### 2. Nginx X-Forwarded-Proto Header (`deployment/nginx/default.conf`)
- **Previous behavior**: Overwrote `X-Forwarded-Proto` with `$scheme` (internal connection scheme)
- **Fixed behavior**: Now preserves `X-Forwarded-Proto` from upstream proxy
- **Implementation**: Added nginx map directive to preserve upstream header or fallback to current scheme

## Configuration Requirements

### 1. In Your External Nginx (REQUIRED)

Your external nginx configuration MUST properly set the X-Forwarded-Proto header:

```nginx
server {
    listen 80;
    server_name entergate.app;

    location / {
        proxy_pass http://your-docker-container:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        # CRITICAL: Pass the original protocol
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. In System Settings

Configure your Links URL with explicit HTTP protocol:
```
Links URL: http://entergate.app
Admin URL: https://entergateadmin.home.samir.network
```

## Troubleshooting Persistent Redirects

If you're still experiencing redirects after applying these fixes, check:

### 1. Cloudflare or CDN
- Cloudflare often forces HTTPS by default
- Check Cloudflare SSL/TLS settings:
  - Set to "Flexible" or "Off" for HTTP-only domains
  - Disable "Always Use HTTPS" setting
  - Check Page Rules for forced HTTPS redirects

### 2. Browser Cache
- Clear browser cache and cookies for the domain
- Test with curl to bypass browser caching:
  ```bash
  curl -I -L http://entergate.app/l/O758TA9Y
  ```

### 3. HSTS Headers
- Check if HSTS was previously set for the domain
- Clear HSTS cache in browser:
  - Chrome: chrome://net-internals/#hsts
  - Firefox: Clear all history and data for the domain

### 4. External Nginx Redirect Rules
Check your external nginx for any redirect rules:
```nginx
# Remove or comment out any rules like:
# return 301 https://$host$request_uri;
# if ($scheme != "https") { return 301 https://$host$request_uri; }
```

### 5. DNS Settings
- Ensure DNS points directly to your server, not through a proxy that forces HTTPS

## Deployment Steps

1. **Rebuild Docker Image**:
   ```bash
   docker build -t gate-access-controller .
   docker-compose down
   docker-compose up -d
   ```

2. **Update System Settings**:
   - Go to Settings in admin panel
   - Set Links URL to: `http://entergate.app`
   - Save settings

3. **Clear Caches**:
   - Clear browser cache
   - Clear any CDN cache if applicable

4. **Test with curl**:
   ```bash
   # This should NOT redirect to HTTPS
   curl -I http://entergate.app/l/YOUR_CODE
   ```

## How the Fix Works

1. **Frontend**: When generating link URLs, the application now checks if the configured URL starts with `http://` or `https://` and preserves the exact protocol specified.

2. **Nginx Proxy Headers**: The Docker nginx now preserves the `X-Forwarded-Proto` header from your external proxy, ensuring the application knows the original request protocol.

3. **No Forced Redirects**: The application doesn't force HTTPS redirects, allowing HTTP access when configured.

## Important Security Note

Using HTTP for public access links means data is transmitted unencrypted. Only use HTTP when:
- The links don't contain sensitive information
- You're in a controlled network environment
- SSL certificates are not available for the domain

Consider using Let's Encrypt for free SSL certificates when possible.