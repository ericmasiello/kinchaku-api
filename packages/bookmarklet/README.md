# Kinchaku Bookmarklet

A browser bookmarklet for quickly saving the current webpage's URL to your Kinchaku collection.

## Features

- 🔐 **Auto-Authentication**: Handles login automatically and manages token refresh
- 💾 **One-Click Saving**: Click the bookmarklet to instantly save any page URL
- 🌐 **Cross-Domain**: Works from any website
- 📦 **Token Management**: Securely stores auth tokens in browser localStorage
- 🔄 **Token Refresh**: Automatically refreshes expired access tokens using refresh tokens

## Installation

### Prerequisites

- Your Kinchaku API must have `CORS_ORIGIN=*` configured in `.env`
- You need to be able to access your API from your browser

### Quick Start

1. **Build the bookmarklet**:

   ```bash
   npm run build && npm run generate
   ```

2. **Start the setup server**:

   ```bash
   npm run dev
   ```

3. **Open the setup page**:

   - Visit `http://localhost:3001` in your browser (or your configured domain)
   - The page displays the complete bookmarklet code
   - Update the API URL if different from default (default: `https://kinchaku.synology.me`)

4. **Create the bookmark**:
   - Copy the bookmarklet code from the page
   - In your browser:
     - **Chrome/Edge**: Press `Ctrl+Shift+B` (or `Cmd+Shift+B` on Mac) to show bookmarks bar
     - **Firefox**: Press `Ctrl+D` (or `Cmd+D` on Mac) to bookmark, then edit it
   - Create a new bookmark/add new favorite
   - Name it something memorable like "Save to Kinchaku"
   - Paste the entire code into the URL field
   - Save the bookmark

## Usage

Once installed, simply click the bookmarklet while viewing any webpage:

1. **First Time**: You'll be prompted to enter your email and password
2. **Subsequent Uses**: Authentication tokens are cached, so you can click repeatedly without re-entering credentials
3. **Success**: You'll see a confirmation message when the URL is saved

## How It Works

The bookmarklet performs these steps:

1. Checks for stored authentication tokens in `localStorage`
2. If no tokens exist:
   - Prompts you for email and password
   - Calls the `/auth/login` endpoint
   - Stores the returned tokens for future use
3. Validates the access token by making a test request to `/articles`
4. If token is expired (401 response):
   - Attempts to refresh using the refresh token at `/auth/refresh`
   - Updates stored tokens if successful
5. Saves the current page URL via `POST /articles` with the valid token
6. Shows success/error feedback

## Development

### Building

```bash
# Compile TypeScript to JavaScript
npm run build

# Generate the bookmarklet HTML page
npm run generate
```

The build process:

- Compiles `src/bookmarklet.ts` to `dist/bookmarklet.js`
- Minifies the code and wraps it in a `javascript:` protocol URL
- Creates `dist/bookmarklet.html` with an interactive setup page

### Serving Locally

```bash
npm run dev
```

This starts a local HTTP server on port 3001 that serves the bookmarklet setup page.

## Configuration

### API URL Configuration

The bookmarklet defaults to `https://kinchaku.synology.me`. To change it:

**Option 1: At runtime (recommended)**

1. Open the setup page (`http://localhost:3001`)
2. Enter your API URL in the input field
3. The bookmarklet code updates automatically
4. Copy the new code and install

**Option 2: At build time**

1. Edit `API_BASE_URL` in `src/bookmarklet.ts`
2. Rebuild: `npm run build && npm run generate`
3. The setup page will use the new URL

## Storage

Authentication tokens are stored in the browser's `localStorage` under the key `kinchaku_auth`:

```javascript
{
  "token": "eyJhbGc...",      // JWT access token
  "refreshToken": "eyJhbGc..."  // JWT refresh token
}
```

### Clearing Stored Tokens

To force re-authentication:

```javascript
localStorage.removeItem('kinchaku_auth');
```

## Security Considerations

⚠️ **Important**:

### API Security (Server-side)

The API implements multiple layers of security for bookmarklet requests:

1. **Required Authentication**: All bookmarklet requests must include a valid JWT token
2. **Short-lived Tokens**: Access tokens expire after 1 hour (default)
3. **Refresh Token Rotation**: Only refresh tokens allow extending sessions
4. **Rate Limiting**: Auth endpoints (100/10min), article creation (50/10min)
5. **CORS Enforcement**: Only enabled when explicitly configured with `CORS_ORIGIN=*`

### Browser Security (Client-side)

- Bookmarklets can access and modify any website's DOM
- Stored tokens are visible in localStorage to any script on the same origin
- Only install the bookmarklet in browsers you trust
- Consider using private/incognito mode for sensitive browsing
- Do not share bookmarklet code in public channels (it contains no secrets, but install on trusted devices only)

### Recommended Setup

- **Development**: Use `CORS_ORIGIN=*` and `NODE_ENV=development`
- **Production**: Use `CORS_ORIGIN=*` if supporting bookmarklets, or set to specific domain(s) if not
- **Storage**: Keep only the setup page URL bookmarked; regenerate bookmarklet for each browser/device

## API Integration

The bookmarklet expects these endpoints on your Kinchaku API:

### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response: 200 OK
{
  "token": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

### Refresh Token

```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}

Response: 200 OK
{
  "token": "eyJhbGc..."
}
```

### Save Article

```http
POST /articles
Content-Type: application/json
Authorization: Bearer eyJhbGc...

{
  "url": "https://example.com/article",
  "archived": false,
  "favorited": false
}

Response: 201 Created
{
  "id": "123",
  "url": "https://example.com/article",
  "archived": 0,
  "favorited": 0,
  "date_added": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

### Validate Token (GET Articles)

```http
GET /articles
Authorization: Bearer eyJhbGc...

Response: 200 OK (token valid)
or
Response: 401 Unauthorized (token expired)
```

## Troubleshooting

### "Login failed" message

- Check that your email and password are correct
- Verify the API is running and accessible at the configured URL
- Ensure the API URL is correct (no trailing slash)

### "Token validation error" message

- The API might be unreachable
- Check network connectivity
- Verify the API URL in the bookmarklet

### Bookmarklet doesn't work

- Clear browser cache and localStorage
- Re-generate and re-install the bookmarklet
- Check browser console for errors (F12)
- Ensure you're using a modern browser (ES2020+ support required)

### CORS errors

- Configure CORS on your API to allow requests from your website domains
- Bookmarklets run in the context of the webpage, not the setup page

## Browser Compatibility

The bookmarklet requires:

- ES2020 JavaScript support
- Fetch API support
- localStorage support
- Modern browser (Chrome/Edge/Firefox/Safari from 2020+)

## License

MIT
