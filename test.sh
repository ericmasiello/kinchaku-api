# note substitute with http://192.168.4.49:3000 to run from synology

# Signup
curl -sX POST http://localhost:3000/api/auth/signup \
  -H "content-type: application/json" \
  -d '{"email":"me@example.com","password":"correct horse battery staple"}' | jq

# Login -> token
export TOKEN=$(curl -sX POST http://localhost:3000/api/auth/login \
  -H "content-type: application/json" \
  -d '{"email":"me@example.com","password":"correct horse battery staple"}' | jq -r .token)

# Create article
curl -sX POST http://localhost:3000/api/articles \
  -H "authorization: Bearer $TOKEN" -H "content-type: application/json" \
  -d '{"url":"https://example.com/great-read","favorited":true}'

  # Get articles
curl -sX GET http://localhost:3000/api/articles \
  -H "authorization: Bearer $TOKEN" -H "content-type: application/json"
