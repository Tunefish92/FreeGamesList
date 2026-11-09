FROM node:26-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:26-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build && npm run build:worker

# One image, two roles (see docker-compose.yml):
#   web    → node server.js        (serves pages, only reads the database)
#   worker → node worker.mjs       (cron job, the only process calling external APIs)
FROM node:26-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 \
    DB_PATH=/data/freegames.db NODE_OPTIONS=--no-warnings TZ=Europe/Berlin
RUN apk add --no-cache tzdata \
 && addgroup -S app && adduser -S app -G app \
 && mkdir -p /data && chown app:app /data
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
COPY --from=build --chown=app:app /app/dist/worker.mjs ./worker.mjs
USER app
VOLUME /data
EXPOSE 3000
CMD ["node", "server.js"]
