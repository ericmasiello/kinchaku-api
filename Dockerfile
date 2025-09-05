# --- Build stage ---
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run typecheck && npm prune --production

# --- Runtime stage ---
FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
# non-root user
RUN useradd -m appuser
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/src ./src
EXPOSE 3000
USER appuser
CMD ["node", "src/index.ts"]
