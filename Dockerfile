# ── dev stage ────────────────────────────────────────────
FROM node:24-slim AS dev

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

EXPOSE 3000
CMD ["npx", "tsx", "src/server.ts"]

# ── prod stage ───────────────────────────────────────────
FROM node:24-slim AS prod

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["node", "dist/server.js"]
