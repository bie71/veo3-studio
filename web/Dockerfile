FROM node:20-alpine AS build
WORKDIR /app

COPY web/package.json web/package-lock.json* web/.npmrc* ./ 2>/dev/null || :
RUN npm install

COPY web .
# Build with env; default API base points to server service name
ENV VITE_API_BASE=http://server:5174/api/veo3
RUN npm run build

FROM node:20-alpine AS run
WORKDIR /app
COPY --from=build /app/dist ./dist
RUN npm install -g serve
EXPOSE 5173
CMD ["serve", "-s", "dist", "-l", "5173"]

