# Docker Setup for Promptexify

This directory contains Docker configuration files for running Promptexify in a containerized environment.

## Prerequisites

1. **Docker & Docker Compose**: Make sure you have Docker and Docker Compose installed
2. **SSL Certificates**: Your mkcert certificates should be located at `/Users/chhayvoinvy/.ssl/promptexify.dev/`
3. **Domain Setup**: Ensure `promptexify.dev` points to `127.0.0.1` in your `/etc/hosts` file

## Quick Start

1. **Copy environment file**:

   ```bash
   cp .env.production.template .env.production.local
   ```

2. **Edit environment variables**:
   Update `.env.production.local` with your actual credentials (Supabase, AWS S3, Stripe, etc.)

3. **Run setup script**:

   ```bash
   chmod +x docker/scripts/setup.sh
   ./docker/scripts/setup.sh
   ```

4. **Access your application**:
   - Main app: https://promptexify.dev
   - pgAdmin (optional): http://localhost:5050
   - Redis Commander (optional): http://localhost:8081

## Services

### Core Services

- **app**: Next.js application (production build)
- **postgres**: PostgreSQL 16 database
- **nginx**: Reverse proxy with SSL termination
- **redis**: Redis for caching

### Optional Development Services

Enable with profiles:

```bash
# Enable pgAdmin
docker-compose --profile pgadmin up -d

# Enable Redis Commander
docker-compose --profile redis-ui up -d

# Enable both
docker-compose --profile pgadmin --profile redis-ui up -d
```

## Manual Commands

### Build and Start

```bash
# Build images
docker-compose build

# Start all services
docker-compose up -d

# Start with logs
docker-compose up
```

### Database Operations

```bash
# Run Prisma migrations
docker-compose exec app npx prisma migrate deploy

# Generate Prisma client
docker-compose exec app npx prisma generate

# Access database shell
docker-compose exec postgres psql -U promptexify -d promptexify

# Reset database
docker-compose exec app npx prisma migrate reset
```

### Application Management

```bash
# View logs
docker-compose logs -f app

# Restart application
docker-compose restart app

# Execute commands in app container
docker-compose exec app npm run build

# Install new dependencies
docker-compose exec app npm install package-name
```

### Cleanup

```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Remove everything including images
docker-compose down -v --rmi all
```

## Environment Variables

Key environment variables for Docker setup:

| Variable               | Description                  | Default                                                                   |
| ---------------------- | ---------------------------- | ------------------------------------------------------------------------- |
| `DATABASE_URL`         | PostgreSQL connection string | `postgresql://promptexify:promptexify_password@postgres:5432/promptexify` |
| `NEXT_PUBLIC_BASE_URL` | Application base URL         | `https://promptexify.dev`                                                 |
| `NODE_ENV`             | Environment mode             | `production`                                                              |

## SSL Configuration

The Nginx container expects SSL certificates at:

- Certificate: `/etc/ssl/certs/promptexify.dev.pem`
- Private Key: `/etc/ssl/certs/promptexify.dev-key.pem`

These are mapped from your local mkcert certificates at `/Users/chhayvoinvy/.ssl/promptexify.dev/`.

## Security Features

- Rate limiting (API: 10 req/s, General: 5 req/s)
- Security headers (HSTS, XSS protection, etc.)
- HTTPS-only with HTTP to HTTPS redirect
- Modern SSL/TLS configuration
- Blocked access to sensitive files

## Performance Optimizations

- Gzip compression
- Static file caching
- Connection pooling
- Proper proxy timeouts

## Troubleshooting

### Certificate Issues

```bash
# Verify certificates exist
ls -la /Users/chhayvoinvy/.ssl/promptexify.dev/

# Check certificate validity
openssl x509 -in /Users/chhayvoinvy/.ssl/promptexify.dev/promptexify.dev.pem -text -noout
```

### Database Connection Issues

```bash
# Check if PostgreSQL is ready
docker-compose exec postgres pg_isready -U promptexify -d promptexify

# View PostgreSQL logs
docker-compose logs postgres
```

### Application Issues

```bash
# Check application logs
docker-compose logs app

# Rebuild and restart
docker-compose down
docker-compose build --no-cache app
docker-compose up -d
```

### Network Issues

```bash
# Check if domain resolves correctly
nslookup promptexify.dev

# Verify /etc/hosts entry
grep promptexify.dev /etc/hosts
```

## Switching Between Production and Development

### Default: Production Test Mode

By default, this Docker setup runs in **production test mode** using `.env.production.local`.

### Switch to Development Mode

To use development mode with hot reloading:

1. **Create development environment file**:

   ```bash
   cp .env.production.template .env.local
   # Edit .env.local and set NODE_ENV=development
   ```

2. **Run with development overrides**:

   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d
   ```

3. **Switch back to production test mode**:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

## Development Workflow

### Production Test Mode (Default)

1. **Code changes**: Requires rebuilding the container
2. **Testing**: Production-like environment for final testing
3. **Database changes**: Run migrations in the container
4. **Dependencies**: Rebuild container after package.json changes

### Development Mode (with override)

1. **Code changes**: Files are automatically synced via volumes
2. **Hot reloading**: Next.js dev server provides instant updates
3. **Database changes**: Run migrations in the container
4. **Dependencies**: Install in container to update package-lock.json

## Production Considerations

For production deployment:

1. Use `target: production` in Dockerfile
2. Set `NODE_ENV=production`
3. Configure proper SSL certificates
4. Set up health checks
5. Configure log rotation
6. Use external database
7. Set up monitoring and alerts
