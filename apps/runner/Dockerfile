# Phase 2 後半用 Fly.io Dockerfile。git + node 22 + pnpm を含む。
# 値の確定は実デプロイ時。

FROM node:22-bookworm-slim AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV PNPM_HOME=/usr/local/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

WORKDIR /app

# 依存解決のためモノレポ全体をコピー (改善余地: turbo prune)
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY tsconfig.base.json biome.json ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --frozen-lockfile --prod=false

CMD ["pnpm", "--filter", "@migrate-bot/runner", "exec", "tsx", "src/index.ts"]
