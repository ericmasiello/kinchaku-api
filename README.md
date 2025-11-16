# Common Commands

> Substitute with http://192.168.4.49:3000/api/v1/<path> to run from Synology
> https://kinchaku.synology.me/api/v1/<path>

## Configuration

### CORS Setup

If you want to use the bookmarklet feature, set `CORS_ORIGIN=*` in your `.env` file:

```
CORS_ORIGIN=*
```

For web-only access (no bookmarklet), specify your domain:

```
CORS_ORIGIN=https://kinchaku.example.com
```

See [API Security](#security-notes) below for more details.

## Signup

```sh
curl -sX POST http://localhost:3000/api/v1/auth/signup \
  -H "content-type: application/json" \
  -d '{"email":"me@example.com","password":"correct horse battery staple"}' | jq
```

## Login -> token

```sh
export TOKEN=$(curl -sX POST http://localhost:3000/api/v1/auth/login \
  -H "content-type: application/json" \
  -d '{"email":"me@example.com","password":"correct horse battery staple"}' | jq -r .token)
```

## Create article

```sh
curl -sX POST http://localhost:3000/api/v1/articles \
  -H "authorization: Bearer $TOKEN" -H "content-type: application/json" \
  -d '{"url":"https://example.com/great-read","favorited":true}'
```

## Get articles

```sh
curl -sX GET http://localhost:3000/api/v1/articles \
  -H "authorization: Bearer $TOKEN" -H "content-type: application/json"
```

# Build For Docker

```sh
docker compose -f packages/api/docker-compose.yml up -d --build
```

At this point, it'll run locally on port 3000.

You can attach to the running container by running the following:

```sh
docker exec -it kinchaku-api /bin/sh
```

To exit, run:

```sh
exit
```

## Bookmarklet

The bookmarklet allows you to save URLs from any website with a single click. See `packages/bookmarklet/README.md` for full setup and usage instructions.

**Quick start**:

```bash
cd packages/bookmarklet
npm run build && npm run generate && npm run dev
# Visit http://localhost:3001
```

**To deploy**: Ensure `CORS_ORIGIN=*` is set in your `.env` file.

## Security Notes

### Authentication

- All API endpoints require JWT bearer token authentication
- Tokens expire after 1 hour (configurable via `JWT_TOKEN_EXPIRY`)
- Refresh tokens can be used to get new access tokens
- Rate limiting is applied to auth and article creation endpoints

### Bookmarklet Security

When `CORS_ORIGIN=*` (bookmarklet mode):

- All state-changing requests (POST, PUT, DELETE, PATCH) require valid JWT authentication
- Tokens are short-lived (1 hour by default)
- Refresh tokens provide the only way to extend sessions
- This prevents malicious websites from making authenticated requests

Security is maintained through:
1. Required JWT authentication on all modifications
2. Short-lived tokens (1h default)
3. Refresh token rotation
4. Rate limiting (100 auth requests/10min, 50 articles/10min)
5. User-initiated bookmarklet clicks

## Modifying Turso Database

```
turso auth login

turso db shell kinchaku
```
