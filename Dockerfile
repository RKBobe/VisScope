# Multi-stage Dockerfile for Vis-Scope Progressive Web Application
# Stage 1: Build static assets with Node.js and Vite
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install all dependencies including devDependencies for build
RUN npm ci

# Copy application source code and configuration
COPY . .

# Compile TypeScript and build production bundle into /app/dist
RUN npm run build

# Stage 2: Production runtime container
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy dependency manifests and install production-only dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy server entrypoint and compiled production bundle from builder
COPY server.js ./
COPY --from=builder /app/dist ./dist

# Use non-root node user for container security
USER node

# Expose HTTP port
EXPOSE 3000

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/ || exit 1

# Start Vis-Scope server
CMD ["node", "server.js"]
