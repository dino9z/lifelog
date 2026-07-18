# Stage 1 — build the static frontend
FROM node:20-alpine AS web
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2 — run the sync server (which also serves the built SPA)
FROM node:20-alpine
WORKDIR /app/server
# better-sqlite3 is a native module; prebuilt binaries usually suffice, but keep
# build tools available in case a prebuilt is missing for this platform.
RUN apk add --no-cache python3 make g++
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev
COPY server/ ./
COPY --from=web /app/dist /app/dist
ENV NODE_ENV=production
ENV STATIC_DIR=/app/dist
EXPOSE 8787
VOLUME ["/app/server/data"]
CMD ["node", "index.js"]
