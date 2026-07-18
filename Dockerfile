FROM node:24-alpine AS builder
WORKDIR /build
COPY package.json package-lock.json* ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src/ ./src/
RUN npm run build
RUN npm run build:css
RUN npm prune --omit=dev

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json ./
COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/dist ./dist
COPY --from=builder /build/public ./public
RUN ln -s /app/node_modules/htmx.org/dist/htmx.min.js public/htmx.min.js
USER node
CMD ["npm", "run", "server"]
