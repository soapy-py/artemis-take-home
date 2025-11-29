# syntax = docker/dockerfile:1

ARG NODE_VERSION=20.19.0
FROM node:${NODE_VERSION}-slim AS base

WORKDIR /app
ENV NODE_ENV=production

FROM base AS build
# Build dependencies for native modules (duckdb)
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3 && \
    rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM base
# Ensure app listens on Fly's internal port
ENV PORT=3000

COPY --from=build /app /app

EXPOSE 3000
CMD ["npm", "run", "start"]
