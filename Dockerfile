# ============================================
# Vuna Digital - Production Dockerfile
# ============================================
# Multi-stage build: install dependencies, then
# run the app in a slim production image.
# ============================================

# Stage 1: Install dependencies
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install all dependencies (including dev for build tooling)
RUN npm install

# Stage 2: Production image
FROM node:20-alpine

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

# Copy application source
COPY --from=builder /app/node_modules ./node_modules
COPY server ./server
COPY scripts ./scripts
COPY public ./public
COPY .env.example ./.env.example

# Ensure non-root user owns the app directory
RUN chown -R node:node /app

# Switch to non-root user for security
USER node

# Expose the application port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "server/index.js"]
