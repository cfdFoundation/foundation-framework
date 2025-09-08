# Multi-stage build for production optimization
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++ curl

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (use npm install instead of npm ci)
# npm install works without lockfile, npm ci requires package-lock.json
RUN npm install --only=production && npm cache clean --force

# Production stage
FROM node:18-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    curl \
    tini \
    && addgroup -g 1001 -S nodejs \
    && adduser -S api -u 1001

# Create app directory
WORKDIR /app

# Copy built node_modules from builder stage
COPY --from=builder --chown=api:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=api:nodejs . .

# Create necessary directories
RUN mkdir -p logs uploads temp \
    && chown -R api:nodejs logs uploads temp

# Environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    UV_THREADPOOL_SIZE=128

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Expose port
EXPOSE 3000

# Switch to non-root user
USER api

# Use tini as init system for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "server.js"]