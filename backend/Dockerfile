# Using standard node image for better native build support
FROM node:20 AS base

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y python3 git make g++ gcc && rm -rf /var/lib/apt/lists/*

# Copy package files explicitly
COPY package.json package-lock.json* ./

# Debug: list files to ensure they were copied
RUN ls -la

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Remove devDependencies
RUN npm prune --production

# Production stage
FROM node:20-slim AS production

WORKDIR /app

# Copy dependencies and built files
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist
COPY --from=base /app/package.json /app/package-lock.json* ./

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# Start server
CMD ["npm", "start"]
