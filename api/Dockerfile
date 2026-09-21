FROM node:22-slim AS build
WORKDIR /app
# better-sqlite3 needs Node >=22 for its prebuilt binary; if for some reason
# npm still has to compile it from source, these give node-gyp what it needs.
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/db/schema.sql ./dist/db/schema.sql
VOLUME ["/app/data"]
ENV DATABASE_PATH=/app/data/data.db
EXPOSE 4000
CMD ["node", "dist/index.js"]
