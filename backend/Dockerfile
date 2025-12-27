FROM node:20-alpine AS base

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache python3 git make g++ gcc

# Copy package files
COPY package*.json ./

# Install dependencies
# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Remove devDependencies
RUN npm prune --production

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy dependencies and built files
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist
COPY --from=base /app/package*.json ./

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# Start server
CMD ["npm", "start"]
