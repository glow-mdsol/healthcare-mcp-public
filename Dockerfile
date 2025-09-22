# Healthcare MCP Server - Node.js Docker Image
FROM node:18-alpine

WORKDIR /app

# Install system dependencies for native modules (sqlite3)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    curl

# Copy package files first for better layer caching
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies
RUN npm install --production

# Copy application code
COPY . .

# Create data directory for database
RUN mkdir -p /app/data

# Set environment variables
ENV NODE_ENV=production
ENV DATA_DIR=/app/data
ENV CACHE_DB_PATH=/app/data/cache.db
ENV USAGE_DB_PATH=/app/data/usage.db

# Expose the port the app runs on
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Command to run the application in HTTP mode
CMD ["npm", "run", "server:http"]
