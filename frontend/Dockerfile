# Development stage
FROM node:20-alpine AS development

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]

# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy EVERYTHING first to detect context (monorepo or subfolder)
COPY . .

# SMART CONTEXT DISCOVERY: 
# If we find a 'frontend' folder, we are in the root context. 
# We move everything from frontend/ to current dir.
RUN if [ -d "frontend" ]; then \
    echo ">>> AUTO-DETECTED: Root context. Moving files from frontend/ to /app"; \
    cp -rp frontend/* ./ && rm -rf frontend; \
    else \
    echo ">>> AUTO-DETECTED: Subdirectory context."; \
    fi

# Build production files
RUN npm install && npm run build

# Production stage 
FROM nginx:alpine AS production

# Copy custom nginx config
# Copy custom nginx config template
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Copy built files
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
