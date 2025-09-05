# Common Commands

> Substitute with http://192.168.4.49:3000/api/v1/<path> to run from Synology
> https://kinchaku.synology.me/api/v1/<path>

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
docker compose up -d --build
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
