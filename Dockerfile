FROM node:24-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY openapi.yaml ./
COPY src ./src

# 以非 root 使用者執行
USER node

EXPOSE 3000
# 啟動前先套用尚未執行的 migration
CMD ["sh", "-c", "node src/scripts/migrate.js && node src/server.js"]
