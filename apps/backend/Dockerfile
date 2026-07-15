# syntax=docker/dockerfile:1

# ---------- Base ----------
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY packages ./packages

# ---------- Development ----------
FROM base AS development
ENV NODE_ENV=development
RUN pnpm install --frozen-lockfile || pnpm install
COPY apps/backend ./apps/backend
RUN pnpm --filter @trading-backend/exchange-adapters build
RUN pnpm install --no-frozen-lockfile
RUN npx prisma@5.22.0 generate --schema=./apps/backend/prisma/schema.prisma
# Business source is bind-mounted in docker-compose.yml for dev; this COPY
# only makes the image self-sufficient if it's ever run standalone.
CMD ["pnpm", "--filter", "backend", "start:dev"]

# ---------- Build (used only for the production stage) ----------
FROM base AS build
ENV NODE_ENV=production
RUN pnpm install --frozen-lockfile || pnpm install
COPY apps/backend ./apps/backend
RUN pnpm --filter @trading-backend/exchange-adapters build
RUN pnpm install --no-frozen-lockfile && ./apps/backend/node_modules/.bin/prisma generate
RUN pnpm --filter backend build

# ---------- Production ----------
FROM node:22-alpine AS production
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/backend/dist ./dist
COPY --from=build /app/apps/backend/prisma ./prisma
COPY --from=build /app/apps/backend/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
EXPOSE 3000
CMD ["node", "dist/main.js"]