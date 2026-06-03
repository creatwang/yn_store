# 后台发行镜像：/api + /app（需先 build:admin 产出 public/app）
FROM node:20-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@10.17.1 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/server/package.json apps/server/
COPY apps/admin/package.json apps/admin/
COPY packages/db/package.json packages/db/
COPY packages/validators/package.json packages/validators/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/server apps/server
COPY apps/admin apps/admin
COPY packages packages
RUN pnpm build:backend

FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=7000
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/apps/server ./apps/server
COPY --from=build /app/packages ./packages
COPY package.json pnpm-workspace.yaml ./

WORKDIR /app/apps/server
EXPOSE 7000
CMD ["npx", "tsx", "entry.ts"]
