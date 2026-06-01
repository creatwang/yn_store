# Storefront：Astro Hybrid（@astrojs/node standalone）
# Build 阶段需能访问 Store API（Content Loader 同步商品）
#
# 构建示例（monorepo 根目录）：
#   docker build -f apps/storefront/Dockerfile \
#     --build-arg PUBLIC_API_URL=https://api.example.com \
#     --build-arg PUBLIC_SITE_URL=https://shop.example.com \
#     -t my-store-storefront .

FROM node:20-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@10.17.1 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/storefront/package.json apps/storefront/
RUN pnpm install --frozen-lockfile --filter @my-store/storefront...

FROM deps AS build
ARG PUBLIC_API_URL=http://host.docker.internal:9000
ARG PUBLIC_SITE_URL=http://localhost:4321
ENV PUBLIC_API_URL=${PUBLIC_API_URL}
ENV PUBLIC_SITE_URL=${PUBLIC_SITE_URL}
ENV ASTRO_DEPLOY_TARGET=node

COPY apps/storefront apps/storefront
RUN pnpm --filter @my-store/storefront build

FROM base AS runtime
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321
WORKDIR /app

COPY --from=build /app/apps/storefront/dist ./dist
COPY --from=build /app/apps/storefront/package.json ./package.json
COPY --from=deps /app/node_modules ./node_modules

EXPOSE 4321
CMD ["node", "./dist/server/entry.mjs"]
