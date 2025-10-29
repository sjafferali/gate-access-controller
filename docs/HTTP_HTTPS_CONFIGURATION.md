# HTTP/HTTPS URL Configuration Guide

## Problem Resolution

Fixed an issue where the application was forcing HTTPS redirects even when HTTP URLs were explicitly configured.

## The Issue

When accessing `http://entergate.app/l/O758TA9Y`, users were being redirected to `https://entergate.app/l/O758TA9Y`, breaking HTTP-only configurations.

## The Fix

Updated `frontend/src/utils/linkUrl.ts` to properly respect the protocol specified in the configuration:
- If a URL includes `http://` or `https://`, it's now used exactly as specified
- Only defaults to HTTPS when no protocol is provided (for security)

## Configuration Examples

### HTTP-only Configuration
To use HTTP for your public links:
```yaml
# In System Settings
Links URL: http://entergate.app
```

### HTTPS Configuration
For secure HTTPS links:
```yaml
# In System Settings
Links URL: https://entergate.app
# OR just the domain (defaults to HTTPS)
Links URL: entergate.app
```

### Mixed Configuration
You can have different protocols for different URLs:
```yaml
# In System Settings
Admin URL: https://entergateadmin.home.samir.network  # HTTPS for admin
Links URL: http://entergate.app                       # HTTP for public links
```

## Important Notes

1. **Protocol Specification**: Always include the protocol (`http://` or `https://`) in your configuration if you want to use HTTP. Without a protocol, the system defaults to HTTPS for security.

2. **Nginx Configuration**: Ensure your nginx proxy passes the correct headers:
   ```nginx
   proxy_set_header X-Forwarded-Proto $scheme;
   ```

3. **Docker Deployment**: The fix is implemented in the frontend code and will be included in the next Docker image build.

4. **Browser Security**: Note that some browsers may still warn users about HTTP connections, especially if submitting forms or handling sensitive data.

## Deployment Steps

1. **Update Configuration**: Set your `Links URL` in System Settings to include `http://` explicitly:
   ```
   http://entergate.app
   ```

2. **Rebuild Docker Image**: Build and deploy the updated Docker image with the fix:
   ```bash
   docker build -t gate-access-controller .
   docker-compose up -d
   ```

3. **Clear Browser Cache**: Users may need to clear their browser cache to see the changes take effect.

## Testing

After deployment, verify the fix:
1. Access a link using HTTP: `http://entergate.app/l/YOUR_CODE`
2. Confirm no redirect to HTTPS occurs
3. The page should load correctly over HTTP

## Security Considerations

While this fix allows HTTP access when explicitly configured, consider:
- Use HTTPS whenever possible for security
- HTTP should only be used in controlled environments or for specific use cases
- Consider using HTTP only for public access links while keeping admin interface on HTTPS