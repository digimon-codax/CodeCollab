FROM node:20-alpine AS base

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache python3 git make g++ gcc

# Copy EVERYTHING first to detect context (monorepo or subfolder)
COPY . .

# SMART CONTEXT DISCOVERY: 
# If we find a 'backend' folder, we are in the root context. 
# We move everything from backend/ to the current dir.
RUN if [ -d "backend" ]; then \
  echo ">>> AUTO-DETECTED: Root context. Moving files from backend/ to /app"; \
  cp -rp backend/* ./ && rm -rf backend; \
  else \
  echo ">>> AUTO-DETECTED: Subdirectory context."; \
  fi

# Final check for package.json
RUN if [ ! -f "package.json" ]; then \
  echo "FATAL ERROR: package.json not found!"; \
  ls -la; \
  exit 1; \
  fi

# Clean install
RUN npm install

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
