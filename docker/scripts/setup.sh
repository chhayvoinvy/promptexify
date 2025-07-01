#!/bin/bash

# Docker Setup Script for Promptexify
# This script helps initialize the Docker environment

set -e

echo "🚀 Setting up Promptexify Docker environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker is running${NC}"

# Check if .env.production.local exists
if [ ! -f ".env.production.local" ]; then
    echo -e "${YELLOW}⚠️  .env.production.local not found. Creating from .env.production.template...${NC}"
    cp .env.production.template .env.production.local
    echo -e "${YELLOW}📝 Please edit .env.production.local with your actual credentials before proceeding.${NC}"
    echo -e "${BLUE}Press any key to continue after editing .env.production.local...${NC}"
    read -n 1 -s
fi

# Check SSL certificates
if [ ! -f "/Users/chhayvoinvy/.ssl/promptexify.dev/promptexify.dev.pem" ]; then
    echo -e "${RED}❌ SSL certificate not found at /Users/chhayvoinvy/.ssl/promptexify.dev/promptexify.dev.pem${NC}"
    echo -e "${YELLOW}Make sure your mkcert certificates are properly generated and located.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ SSL certificates found${NC}"

# Create docker network if it doesn't exist
if ! docker network ls | grep -q "promptexify-network"; then
    echo -e "${BLUE}🌐 Creating Docker network...${NC}"
    docker network create promptexify-network
fi

# Build and start services
echo -e "${BLUE}🏗️  Building Docker images...${NC}"
docker-compose build

echo -e "${BLUE}🚀 Starting services...${NC}"
docker-compose up -d postgres redis

# Wait for PostgreSQL to be ready
echo -e "${BLUE}⏳ Waiting for PostgreSQL to be ready...${NC}"
timeout 60 bash -c 'until docker-compose exec postgres pg_isready -U promptexify -d promptexify; do sleep 1; done'

echo -e "${GREEN}✅ PostgreSQL is ready${NC}"

# Run Prisma migrations
echo -e "${BLUE}🗄️  Running Prisma migrations...${NC}"
docker-compose run --rm app npx prisma migrate deploy
docker-compose run --rm app npx prisma generate

# Start the application
echo -e "${BLUE}🚀 Starting the application...${NC}"
docker-compose up -d

echo -e "${GREEN}🎉 Setup complete!${NC}"
echo -e "${BLUE}📱 Your application should be available at:${NC}"
echo -e "${GREEN}   https://promptexify.dev${NC}"
echo -e "${BLUE}📊 Services status:${NC}"
docker-compose ps

echo -e "${YELLOW}💡 Useful commands:${NC}"
echo -e "   View logs: ${BLUE}docker-compose logs -f app${NC}"
echo -e "   Stop all: ${BLUE}docker-compose down${NC}"
echo -e "   Restart app: ${BLUE}docker-compose restart app${NC}"
echo -e "   Database shell: ${BLUE}docker-compose exec postgres psql -U promptexify -d promptexify${NC}" 