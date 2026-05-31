FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json vitest.config.ts ./
COPY src ./src
RUN npm run build
# 将前端产物复制到后端期望的位置
RUN cp -r src/webui/dist dist/webui/dist

FROM node:22-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 appgroup && adduser --system --uid 1001 appuser
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
RUN mkdir -p /app/data && chown appuser:appgroup /app/data
USER appuser
VOLUME /app/data
ENV NODE_ENV=production
ENV DB_PATH=/app/data/orchestrator.db
EXPOSE 3000
CMD ["node", "dist/index.js"]
