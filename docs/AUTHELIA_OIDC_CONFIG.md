# Authelia OIDC Configuration Guide

## Consent Screen Issue Resolution

This document explains how to configure Authelia to prevent the consent screen from appearing on every login.

## The Problem

When using Authelia as an OIDC provider, users may see the consent screen repeatedly, even after accepting consent in previous sessions.

## The Solution

### 1. Application Code Fix (Already Implemented)

We've updated the application to include `prompt=login` in the authorization URL (`backend/app/services/oidc_service.py:193`). This parameter tells Authelia to:
- Force user authentication (show login if needed)
- Skip consent screen if consent has been pre-configured or previously granted

### 2. Required Authelia Configuration

To completely eliminate recurring consent screens, configure your OIDC client in Authelia with one of these approaches:

#### Option A: Pre-configured Consent (Recommended)

In your Authelia configuration (`configuration.yml`):

```yaml
identity_providers:
  oidc:
    clients:
      - id: accessgate  # Your client ID
        description: Gate Access Controller
        secret: $pbkdf2-sha512$...  # Your hashed secret
        authorization_policy: two_factor  # or one_factor

        # Enable pre-configured consent
        consent_mode: pre-configured
        pre_configured_consent_duration: 1y  # Consent valid for 1 year

        redirect_uris:
          - https://your-app.example.com/auth/callback
        scopes:
          - openid
          - profile
          - email
```

#### Option B: Implicit Consent (Less Secure)

```yaml
identity_providers:
  oidc:
    clients:
      - id: accessgate
        # ... other settings ...

        # Automatically grant consent without prompting
        consent_mode: implicit
```

**Warning**: Implicit consent mode is discouraged for security reasons. Use pre-configured consent instead.

## How Pre-configured Consent Works

When `consent_mode: pre-configured` is set with a duration:
1. User sees consent screen on first login
2. If user accepts, their choice is remembered for the specified duration
3. Future logins within that period skip the consent screen
4. Consent is only valid for the same client ID and requested scopes

## Important Notes

- Pre-configured consents are only valid if:
  - The subject (user) is the same
  - The client ID matches exactly
  - The requested scopes/audience match exactly with previously granted ones

- If you change scopes in your application, users will need to re-consent

- The `prompt=login` parameter in the application ensures:
  - Users always authenticate (no silent/automatic login)
  - Consent screen is skipped when appropriate

## Troubleshooting

If users still see the consent screen after these changes:

1. **Check Authelia logs** for consent-related messages
2. **Verify client configuration** matches exactly between app and Authelia
3. **Clear browser cookies** to reset any cached consent state
4. **Ensure scopes match** - any difference in requested scopes triggers new consent

## References

- [Authelia OIDC Configuration](https://www.authelia.com/configuration/identity-providers/openid-connect/clients/)
- [OpenID Connect Core 1.0 - Authentication Request](https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest)