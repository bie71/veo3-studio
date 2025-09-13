FROM node:20-alpine AS base
WORKDIR /app

# ffmpeg for concat/frame-extract
RUN apk add --no-cache ffmpeg

COPY package.json package-lock.json* .npmrc* ./ 2>/dev/null || :
COPY server/package.json ./server/package.json

WORKDIR /app/server
RUN npm install --production=false

COPY server .
RUN npm run build

EXPOSE 5174
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]

