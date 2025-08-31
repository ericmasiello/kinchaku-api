# --- Build stage ---
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
RUN npm run build && npm prune --production

# --- Runtime stage ---
FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
# non-root user
RUN useradd -m appuser
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
VOLUME ["/data"]
ENV DATABASE_PATH=/data/db.sqlite
EXPOSE 3000
USER appuser
CMD ["node", "dist/index.js"]
