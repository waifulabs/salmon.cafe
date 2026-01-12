# Container Guide for Salmon.cafe

This document describes how to build and run the Salmon.cafe application in a container.

## Quick Start

### Using Pre-built Image

Pull and run the latest image from GitHub Container Registry:

```bash
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  --name salmon-cafe \
  ghcr.io/waifulabs/salmon.cafe:latest
```

Access the application at http://localhost:3000

### Building Locally

1. Install dependencies:
```bash
npm ci
```

2. Build the container:
```bash
docker build -f Containerfile -t salmon.cafe:latest .
```

3. Run the container:
```bash
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  --name salmon-cafe \
  salmon.cafe:latest
```

## Container Architecture

### Multi-Stage Build

The Containerfile uses a multi-stage build process:

1. **Builder Stage**: Uses `node:20-bookworm-slim` to install native dependencies (better-sqlite3)
2. **Runtime Stage**: Uses Google's `distroless/nodejs20` for minimal attack surface

### Image Characteristics

- **Base Image**: `gcr.io/distroless/nodejs20-debian12:nonroot`
- **Size**: ~177MB
- **User**: `nonroot` (non-root user for security)
- **Node Version**: 20.x

## Volume Mounts

The container requires a volume mount for persistent data:

- **Mount Point**: `/app/data`
- **Purpose**: SQLite database storage
- **Permissions**: Must be writable by UID 65532 (nonroot user)

### Setting Permissions

```bash
# Create data directory with proper permissions
mkdir -p data
chmod 777 data  # Or: chown 65532:65532 data

# Run container
docker run -v $(pwd)/data:/app/data salmon.cafe:latest
```

## Environment Variables

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Node environment (default: production)

## Health Check

The container includes a built-in health check:

```bash
# Check container health status
docker inspect --format='{{.State.Health.Status}}' salmon-cafe
```

The health endpoint is available at: `http://localhost:3000/health`

## Docker Compose

Example `docker-compose.yml`:

```yaml
version: '3.8'

services:
  salmon-cafe:
    image: ghcr.io/waifulabs/salmon.cafe:latest
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=production
      - PORT=3000
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "/nodejs/bin/node", "-e", "require('http').get('http://localhost:3000/health',(r)=>process.exit(r.statusCode===200?0:1))"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s
```

## CI/CD Integration

Containers are automatically built and pushed to GitHub Container Registry on:

- Push to `main` branch
- Git tags matching `v*`
- Pull requests (build only, no push)

### Image Tags

- `latest`: Latest build from main branch
- `v*`: Semantic version tags (e.g., v1.0.0)
- `main-<sha>`: Specific commit from main branch

## Security

### Distroless Benefits

- Minimal attack surface (no shell, package managers, or unnecessary tools)
- Smaller image size
- Fewer vulnerabilities to patch

### Security Scanning

All images are automatically scanned with Trivy for vulnerabilities. Results are uploaded to GitHub Security tab.

### Running as Non-Root

The container runs as the `nonroot` user (UID 65532) by default, following security best practices.

## Troubleshooting

### Permission Denied on /app/data

The nonroot user (UID 65532) needs write access to the data directory:

```bash
# Option 1: Make directory world-writable
chmod 777 data

# Option 2: Change ownership to nonroot user
chown -R 65532:65532 data
```

### Database Lock Errors

SQLite database files use WAL mode. Ensure the data directory is on a filesystem that supports file locking.

### Container Won't Start

Check logs:
```bash
docker logs salmon-cafe
```

Common issues:
- Missing or inaccessible data volume
- Port 3000 already in use
- Insufficient permissions on data directory

## Development

For development, you can use the Node slim image instead:

```dockerfile
FROM node:20-bookworm-slim
# ... rest of Dockerfile
```

This provides a shell and debugging tools not available in distroless.

## Notes

- The container uses ESM (ES Modules) for Node.js
- SQLite database is stored in `/app/data/salmon.db`
- Native dependencies (better-sqlite3) are compiled during build
- Health checks use the `/health` endpoint
