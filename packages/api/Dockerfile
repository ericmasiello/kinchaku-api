# --- Build stage ---
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
COPY packages/api/package.json packages/api/
RUN npm ci
COPY tsconfig.json ./
COPY packages/api/tsconfig.json packages/api/
COPY packages/api/src ./packages/api/src
COPY packages/api/scripts ./packages/api/scripts
COPY .git ./.git
RUN npm run -w packages/api typecheck && npm run -w packages/api prebuild && npm prune --production

# --- Runtime stage ---
FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
# non-root user
RUN useradd -m appuser
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/api/src ./packages/api/src
COPY --from=build /app/packages/api/version.json ./packages/api/version.json
EXPOSE 3000
USER appuser
CMD ["node", "packages/api/src/index.ts"]
