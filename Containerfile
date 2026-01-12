# Multi-stage build for minimal container
# Stage 1: Build stage with dependencies
FROM node:20-bookworm-slim AS builder

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev for builds)
RUN npm ci

# Stage 2: Runtime stage - use node slim for now (not distroless) for debugging
FROM node:20-bookworm-slim

WORKDIR /app

# Copy node_modules and package files from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Copy application source
COPY drizzle.config.js ./
COPY src ./src

# Use node user for security
USER node

# Volume for persistent data
VOLUME ["/app/data"]

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Run the application
CMD ["node", "src/index.js"]
