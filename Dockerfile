FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NODE_ENV=production
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    APP_HOST=0.0.0.0 \
    APP_PORT=3000
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder --chown=node:node /app/dist ./dist
RUN mkdir -p /app/uploads && chown node:node /app/uploads
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health/live').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["node", "dist/main.js"]
