# Bookmarklet Workspace Setup Complete ✓

## Prerequisites

**Important**: Your Kinchaku API must be configured with `CORS_ORIGIN=*` to support bookmarklets.

Update your `.env` file:

```
CORS_ORIGIN=*
```

Then restart the API for the changes to take effect.

## What Was Created

A new `packages/bookmarklet` workspace containing everything needed to generate and use a Kinchaku bookmarklet.

### Directory Structure

```
packages/bookmarklet/
├── package.json           # Workspace dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── README.md              # Comprehensive documentation
├── .gitignore             # Git ignore rules
├── src/
│   └── bookmarklet.ts     # Main bookmarklet source code
└── scripts/
    ├── generate.mjs       # Generates the bookmarklet setup HTML
    └── serve.mjs          # Local dev server for setup page
```

## Getting Started

### 1. Install Dependencies

```bash
cd packages/bookmarklet
npm install
```

### 2. Build the Bookmarklet

```bash
npm run build
npm run generate
```

### 3. Start the Setup Server

```bash
npm run dev
```

This starts a server on `http://localhost:3001`

### 4. Install in Your Browser

Visit `http://localhost:3001` and:

- Set the API URL (default: `http://localhost:3000`)
- Copy the bookmarklet code
- Create a new bookmark in your browser
- Paste the code into the URL field
- Name it "Save to Kinchaku" (or similar)

## How It Works

**When you click the bookmarklet:**

1. ✓ Checks if you're logged in (token in localStorage)
2. 🔓 If not logged in, prompts for email/password
3. 🔐 Handles token refresh automatically when expired
4. 💾 Saves current page URL to your Kinchaku API
5. ✨ Shows confirmation message

## Features

- **Auto-Authentication**: No need to log in repeatedly
- **One-Click Saving**: Save any URL from any website instantly
- **Token Management**: Automatically refreshes expired tokens
- **Cross-Domain**: Works on any website
- **Setup Interface**: User-friendly HTML page for easy installation

## API Endpoints Used

- `POST /auth/login` - Get authentication tokens
- `POST /auth/refresh` - Refresh expired access token
- `GET /articles` - Validate token
- `POST /articles` - Save new article URL

## Configuration

### Server Configuration

Ensure your API has the following environment variables set:

```bash
# Enable bookmarklet support
CORS_ORIGIN=*

# Security settings (defaults shown)
NODE_ENV=production
JWT_TOKEN_EXPIRY=1h
REFRESH_TOKEN_EXPIRY=7d
```

The server will log a security info message on startup confirming bookmarklet mode is enabled.

### Client Configuration

To use a different API URL:

- Edit the setup page's input field and regenerate the bookmarklet code
- Or modify `API_BASE_URL` in `src/bookmarklet.ts` before building

## Security Architecture

The bookmarklet uses a multi-layered security approach:

### Server-Side Protection

When `CORS_ORIGIN=*` is configured, the API enforces:

1. **Mandatory JWT Authentication**: All POST/PUT/DELETE/PATCH requests must have a valid Bearer token
2. **Token Expiration**: Access tokens are short-lived (1 hour default)
3. **Token Refresh**: Only valid refresh tokens can extend a session
4. **Rate Limiting**: Auth endpoints limited to 100 requests/10 minutes
5. **Audit Trail**: All requests are logged with origin information

### Client-Side Protection

- Bookmarklet stores tokens in localStorage (same-origin only)
- Tokens visible only to JavaScript on the same domain
- User must explicitly click the bookmarklet
- Password entered only once, then tokens manage subsequent requests

### Deployment Checklist

- ✅ Set `CORS_ORIGIN=*` in production `.env`
- ✅ Set `NODE_ENV=production`
- ✅ Use strong `JWT_SECRET` (minimum 32 characters)
- ✅ Restart API after environment changes
- ✅ Monitor rate limiting and failed auth attempts
- ✅ Review logs for unusual access patterns

### Tokens Storage

⚠️ Important:

- Tokens stored in browser localStorage (one origin = one set of credentials)
- Only install the bookmarklet in browsers you trust
- Consider using private browsing mode for public computers
- Clear localStorage with: `localStorage.removeItem('kinchaku_auth')`

## Development

### Available Scripts

- `npm run build` - Compile TypeScript
- `npm run generate` - Create bookmarklet HTML
- `npm run dev` - Start setup server
- `npm run typecheck` - Run TypeScript compiler (from monorepo)
- `npm run lint` - Lint code (from monorepo)

## Integration with Monorepo

The bookmarklet is now part of your monorepo and:

- Can be tested alongside other packages
- Shares the root `package.json` workspace configuration
- Runs tests/linting through monorepo scripts
- Can be built/published with other packages

## Next Steps

1. ✅ Build: `npm run build && npm run generate`
2. ✅ Start server: `npm run dev`
3. ✅ Visit setup page: `http://localhost:3001`
4. ✅ Copy and install bookmarklet
5. ✅ Test by clicking bookmarklet on any webpage

Enjoy saving URLs to Kinchaku! 📌
