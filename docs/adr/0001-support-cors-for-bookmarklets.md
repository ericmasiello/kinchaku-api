# ADR 0001: Support CORS for Bookmarklets

**Status:** Accepted

**Date:** 2025-11-16

**Deciders:** Eric Masiello

## Context

The Kinchaku API needs to support bookmarklets—client-side scripts that allow users to save URLs from any website with a single click. Bookmarklets execute in the context of third-party websites and must make cross-origin requests to the API.

Previously, the API rejected CORS requests with `CORS_ORIGIN='*'` in production, only allowing specific origin domains. While this was secure for traditional web applications, it prevented the bookmarklet feature from functioning in production environments.

The challenge: Enable bookmarklets to work across all websites while maintaining strong security posture.

## Decision

We will support `CORS_ORIGIN='*'` (allow-all origins) in production when explicitly configured for bookmarklet mode. Security is maintained through multiple compensating controls rather than relying on CORS origin restrictions alone.

### Key Changes:

1. **Allow `CORS_ORIGIN='*'` in Production** - Removed the error thrown when this setting is used in production and replaced it with a console warning documenting the security measures in place.

2. **Route-level Authentication** - Article endpoints enforce JWT Bearer token authentication via `router.use(requireAuth)`. Auth endpoints (signup, login, refresh) are intentionally unauthenticated to allow users to obtain tokens.

3. **Rate Limiting** - Applied rate limits to auth endpoints (100 requests/10 minutes) and article creation (50 requests/10 minutes) to prevent abuse.

4. **Short-lived Access Tokens** - Access tokens expire after 1 hour (configurable), limiting the window of exposure if credentials are compromised.

5. **Refresh Token Rotation** - Refresh tokens are rotated separately with a 7-day expiry, adding an additional layer of session management.

6. **Configuration Flexibility** - The `CORS_ORIGIN` environment variable supports multiple deployment modes:
   - `CORS_ORIGIN='*'` - Bookmarklet mode (all origins allowed)
   - `CORS_ORIGIN='https://example.com'` - Single origin (web app only)
   - `CORS_ORIGIN='https://app1.com,https://app2.com'` - Multiple specific origins

## Rationale

### Why Allow `CORS_ORIGIN='*'`?

Bookmarklets inherently require cross-origin access from any website. There's no way to restrict which websites a bookmarklet will be executed from—this is a fundamental characteristic of browser bookmarklets.

### Why This Security Model Works

**Threat Model:** The primary attack vector in a bookmarklet context is malicious JavaScript from third-party websites attempting to make authenticated API requests on behalf of the user.

**Defense Mechanism:**

- Bookmarklets by nature can only execute in the context of authenticated user sessions (they run as part of the user's browser context where the user is authenticated)
- State-changing operations require valid JWT tokens that are:
  - Bound to user sessions
  - Short-lived (1 hour)
  - User-initiated (bookmarklet action)
- The key insight: A malicious website cannot execute a bookmarklet; only the user can initiate it, and when they do, it operates within their authenticated session

### Design Philosophy

This decision separates concerns:

- **CORS:** Controls which origins can make requests (allows all for bookmarklets)
- **Authentication:** Controls who can perform actions (only authenticated users via valid JWT)
- **Rate Limiting:** Controls how frequently requests can be made (prevents brute force/DoS)
- **Token Expiry:** Controls how long a token remains valid (limits exposure window)

This is more secure than attempting to use CORS as the primary security boundary.

## Alternatives Considered

### 1. Use a Separate Bookmarklet-specific Domain

- **Pros:** Cleaner separation, CORS would only apply to bookmarklet domain
- **Cons:** Still requires `CORS_ORIGIN='*'` for bookmarklets to work from arbitrary websites; adds complexity without security benefit

### 2. Implement Bookmarklet Authentication via Tokens in URL

- **Pros:** Could avoid needing `CORS_ORIGIN='*'`
- **Cons:** Tokens visible in URL/browser history; less secure than Bearer tokens; harder to refresh; incompatible with standard security practices

### 3. Server-Side Proxy for Bookmarklet Requests

- **Pros:** API remains behind restrictive CORS
- **Cons:** Adds operational complexity; creates bottleneck; fails if proxy is down
- **Impractical:** Bookmarklets operate client-side; a proxy would require users to interact with an intermediary

### 4. Restrict Bookmarklet to Specific Websites

- **Pros:** Narrower CORS policy
- **Cons:** Defeats the purpose of a bookmarklet; users couldn't use it from arbitrary websites

## Consequences

### Positive

- ✅ Bookmarklet feature fully functional across all websites
- ✅ Strong security through authentication-centric model
- ✅ Flexible configuration for different deployment modes
- ✅ Clear documentation of security tradeoffs
- ✅ Production-ready without requiring security exceptions

### Negative/Risks

- ⚠️ Requires all clients to properly implement JWT-based authentication
- ⚠️ Must maintain rate limiting infrastructure to prevent abuse
- ⚠️ Operational overhead of monitoring token usage and anomalies
- ⚠️ Developers unfamiliar with this security model may misunderstand it

### Mitigation

- ✅ Added comprehensive comments in code explaining the security model
- ✅ Updated README with clear security documentation
- ✅ Updated `.env.example` with explanation of CORS_ORIGIN usage
- ✅ Added console warning when `CORS_ORIGIN='*'` is detected in production
- ✅ This ADR documents the rationale for future maintainers

## Implementation Details

### Code Changes:

1. **`config.ts`** - Changed production validation from error to warning; added security summary
2. **`index.ts`** - Added CORS configuration supporting wildcard origins with flexible origin matching
3. **`.env.example`** - Updated with clear guidance on CORS_ORIGIN configuration
4. **`README.md`** - Added Configuration, Bookmarklet, and Security Notes sections

### Testing Recommendations

- [ ] Test bookmarklet execution from various third-party websites
- [ ] Verify state-changing requests fail without JWT token
- [ ] Verify rate limits are enforced
- [ ] Verify token expiry prevents access
- [ ] Test refresh token rotation

## References

- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [OWASP: Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [JWT Best Practices](https://tools.ietf.org/html/draft-ietf-oauth-jwt-bcp-8259-07)

## Questions for Review

1. Does the security model adequately address concerns about allowing `CORS_ORIGIN='*'`?
2. Are the rate limits sufficient without being overly restrictive?
3. Should bookmarklet mode include additional security headers or checks?
4. Is the configuration documentation clear enough for operators?
