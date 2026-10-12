# Build stage. sharp needs glibc, so this uses Debian slim rather than Alpine.
FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Fail the image build when the texture pack cannot be downloaded, so a deploy never ships flat colors
ENV TEXTURES_REQUIRED=1
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
