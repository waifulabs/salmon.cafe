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

# Copy package files and pre-installed node_modules
# Note: node_modules is copied from host due to npm ci extraction bug in some Docker environments
# In CI/CD, this should be: COPY package*.json ./ && RUN npm ci
COPY package*.json ./
COPY node_modules ./node_modules

# Verify dependencies are installed correctly
RUN test -f node_modules/express/index.js || (echo "ERROR: Dependencies not installed" && exit 1)

# Stage 2: Runtime stage with distroless
FROM gcr.io/distroless/nodejs20-debian12:nonroot

WORKDIR /app

# Copy node_modules and package files from builder
COPY --from=builder --chown=nonroot:nonroot /app/node_modules ./node_modules
COPY --from=builder --chown=nonroot:nonroot /app/package*.json ./

# Copy application source
COPY --chown=nonroot:nonroot drizzle.config.js ./
COPY --chown=nonroot:nonroot src ./src

# Use nonroot user for security
USER nonroot

# Volume for persistent data (mount with appropriate permissions)
VOLUME ["/app/data"]

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Health check (requires HTTP module)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["/nodejs/bin/node", "-e", "require('http').get('http://localhost:3000/health',(r)=>process.exit(r.statusCode===200?0:1))"]

# Run the application
CMD ["src/index.js"]
