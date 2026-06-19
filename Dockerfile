 
# -------- Target: dev (main API, live reload) --------
FROM node:20-alpine AS dev

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

EXPOSE 4000

CMD ["npm", "run", "dev"]
 
# -------- Target: dev-socket --------
FROM dev AS dev-socket
EXPOSE 4001
CMD ["npm", "run", "dev:socket"]

# -------- Target: dev-admin (admin API, live reload) --------
FROM dev AS dev-admin
EXPOSE 4002
CMD ["npm", "run", "dev:admin"]

# -------- Target: dev-worker --------
FROM dev AS dev-worker
CMD ["npm", "run", "dev:worker"]

# -------- Target: dev-schedule --------
FROM dev AS dev-schedule
CMD ["npm", "run", "dev:schedule"]

# -------- Target: dev-message-worker (BullMQ message persistence) --------
FROM dev AS dev-message-worker
CMD ["npm", "run", "dev:message-worker"]

# -------- Stage: builder (for all prod targets) --------
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY prisma ./prisma/
RUN npx prisma generate

COPY . .
RUN npm run build

# -------- Stage: prod base (shared runtime, no CMD) --------
FROM node:20-alpine AS prod-base

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json* ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/templates ./dist/templates

EXPOSE 4000

# -------- Target: prod (main API) --------
FROM prod-base AS prod
CMD ["node", "dist/server.js"]

# -------- Target: prod-socket --------
FROM prod-base AS prod-socket
EXPOSE 4001
CMD ["node", "dist/socket-server.js"]

# -------- Target: prod-admin (admin API) --------
FROM prod-base AS prod-admin
EXPOSE 4002
CMD ["node", "dist/adminServer.js"]

# -------- Target: prod-worker --------
FROM prod-base AS prod-worker
CMD ["node", "dist/workerServer.js"]

# -------- Target: prod-schedule --------
FROM prod-base AS prod-schedule
CMD ["node", "dist/scheduleServer.js"]

# -------- Target: prod-message-worker --------
FROM prod-base AS prod-message-worker
CMD ["node", "dist/workers/MessageWorker.js"]
