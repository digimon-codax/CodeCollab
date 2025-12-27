# C# CodeCollab - Real-Time Collaborative Code Editor

![CodeCollab Banner](https://via.placeholder.com/1200x300/1E1E1E/3B82F6?text=CodeCollab+-+Real-Time+Code+Collaboration)

> **Production-grade, cloud-deployable VS Code-inspired real-time collaborative code editor** with file locking, live presence tracking, and zero merge conflicts.

## 🚀 Features

### Core Capabilities
- ✅ **Real-time collaborative editing** with Yjs CRDT synchronization
- ✅ **File-level locking system** to prevent concurrent edit conflicts
- ✅ **Live cursor tracking** with color-coded user identification
- ✅ **Typing indicators** showing who's actively editing
- ✅ **User presence sidebar** with real-time status updates
- ✅ **Monaco Editor integration** (VS Code editing experience)
- ✅ **Multi-user project workspaces** with role-based access
- ✅ **WebSocket communication** via Socket.IO
- ✅ **Automatic conflict resolution** (zero merge conflicts)

### Infrastructure
- ✅ **Docker containerization** for easy deployment
- ✅ **Kubernetes orchestration** with auto-scaling
- ✅ **PostgreSQL database** for persistence
- ✅ **Redis caching** for locks and presence
- ✅ **Multi-cloud support** (AWS, GCP, Azure)
- ✅ **CI/CD pipeline** with GitHub Actions
- ✅ **Production-ready** with health checks and monitoring

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                   │
│  Monaco Editor • File Explorer • User Presence • Socket.IO   │
└────────────────────────┬────────────────────────────────────┘
                         │ WebSocket + HTTP
┌────────────────────────▼────────────────────────────────────┐
│                 BACKEND (Node.js + Express)                  │
│  Socket.IO Server • Yjs Sync • File Locks • Presence        │
└───┬──────────────┬─────────────┬────────────────────────────┘
    │              │             │
┌───▼────┐   ┌─────▼──────┐  ┌──▼──────┐
│Postgres│   │   Redis    │  │  S3/GCS │
│(Prisma)│   │(Locks/Cache│  │(Storage)│
└────────┘   └────────────┘  └─────────┘
```

## 📦 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for blazing-fast builds
- **Monaco Editor** (VS Code engine)
- **Socket.IO Client** for real-time communication
- **Yjs** for CRDT synchronization
- **Zustand** for state management
- **Tailwind CSS** for styling
- **xterm.js** for terminal emulation (planned)

### Backend
- **Node.js 20 LTS** with TypeScript
- **Express.js** framework
- **Socket.IO** for WebSocket management
- **Yjs** for server-side CRDT sync
- **Prisma ORM** for database operations
- **PostgreSQL 15** for data persistence
- **Redis 7** for caching and locks
- **Passport.js** for OAuth authentication
- **JWT** for token-based auth

### Infrastructure
- **Docker** & Docker Compose
- **Kubernetes** for orchestration
- **GitHub Actions** for CI/CD
- **Nginx** for frontend serving
- **Multi-cloud** deployment ready

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- Git

### Local Development with Docker

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/CodeCollab.git
   cd CodeCollab
   ```

2. **Set up environment variables**
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your configuration
   ```

3. **Start all services**
   ```bash
   docker-compose up --build
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - Health check: http://localhost:3000/health

5. **Login**
   - For development, enter any text as the auth code (e.g., "testuser")
   - Production requires GitHub OAuth setup

### Manual Setup (Without Docker)

#### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Configure .env with your database URLs

# Run database migrations
npx prisma migrate dev
npx prisma generate

# Start development server
npm run dev
```

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## 📚 API Documentation

### Authentication
```http
POST /api/auth/github/callback
Body: { "code": "github_oauth_code" }
Response: { "token": "jwt_token", "user": {...} }
```

### Projects
```http
GET    /api/projects              # List user's projects
POST   /api/projects              # Create new project
GET    /api/projects/:id          # Get project details
PUT    /api/projects/:id          # Update project
DELETE /api/projects/:id          # Delete project
```

### Files & Locking
```http
GET    /api/projects/:id/files/:path           # Get file content
POST   /api/projects/:id/files/:path/lock      # Acquire file lock
DELETE /api/projects/:id/files/:path/unlock    # Release file lock
GET    /api/projects/:id/files/:path/lock-status  # Check lock status
```

### WebSocket Events
```javascript
// Join project room
socket.emit('project:join', { projectId })

// Document synchronization
socket.emit('sync:update', { projectId, filePath, update })
socket.on('sync:update', (data) => {})

// File locking
socket.emit('file:lock', { projectId, filePath })
socket.on('lock:acquired', (data) => {})

// Presence tracking
socket.emit('presence:update', { fileName, cursorLine, cursorColumn })
socket.on('presence:update', (data) => {})

// Typing indicators
socket.emit('user:typing', { fileName, isTyping })
socket.on('user:typing', (data) => {})
```

## 🐳 Deployment

### Docker Compose (Development)
```bash
docker-compose up -d
```

### Kubernetes (Production)
```bash
# Create namespace and apply configs
kubectl apply -f kubernetes/namespace.yaml
kubectl apply -f kubernetes/configmap.yaml
kubectl apply -f kubernetes/secrets.yaml

# Deploy services
kubectl apply -f kubernetes/backend-deployment.yaml
kubectl apply -f kubernetes/frontend-deployment.yaml
kubectl apply -f kubernetes/hpa.yaml

# Check status
kubectl get pods -n codecollab
kubectl get services -n codecollab
```

### Cloud Deployment

#### AWS (ECS + RDS)
```bash
# Build and push images
docker build -t your-registry/codecollab-backend:latest ./backend
docker push your-registry/codecollab-backend:latest

# Deploy using ECS
aws ecs create-service --cluster CodeCollab ...
```

#### Google Cloud (Cloud Run)
```bash
gcloud run deploy codecollab \
  --image gcr.io/PROJECT_ID/codecollab:latest \
  --region us-central1 \
  --platform managed
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

### E2E Testing
```bash
# Start all services
docker-compose up -d

# Run E2E tests
npm run test:e2e
```

## 🔒 Security

- **JWT-based authentication** with secure token storage
- **GitHub OAuth integration** (production)
- **CORS protection** with whitelisted origins
- **Rate limiting** on API endpoints
- **Helmet.js** security headers
- **Input validation** on all endpoints
- **SQL injection protection** via Prisma ORM
- **XSS protection** in Monaco Editor

## 📊 Performance

- **Sync latency**: <100ms round-trip time
- **Concurrent users**: 50+ per project
- **Lock acquisition**: <50ms
- **Uptime target**: 99.9%
- **Cold start**: <10s with Docker
- **Auto-scaling**: Horizontal Pod Autoscaler configured

## 🛠️ Development

### Project Structure
```
CodeCollab/
├── backend/
│   ├── src/
│   │   ├── server.ts          # Express server
│   │   ├── socket.ts          # Socket.IO handlers
│   │   ├── services/          # Business logic
│   │   ├── controllers/       # Route handlers
│   │   ├── middleware/        # Auth, validation
│   │   └── config/            # Configuration
│   ├── prisma/schema.prisma   # Database schema
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/             # Page components
│   │   ├── hooks/             # Custom hooks
│   │   ├── stores/            # Zustand stores
│   │   └── main.tsx           # Entry point
│   └── Dockerfile
├── kubernetes/                # K8s manifests
├── docker-compose.yml
└── README.md
```

### Environment Variables

See `backend/.env.example` for required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: Secret for JWT signing
- `GITHUB_CLIENT_ID`: GitHub OAuth client ID
- `GITHUB_CLIENT_SECRET`: GitHub OAuth secret
- `CORS_ORIGIN`: Allowed frontend origin

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Monaco Editor** by Microsoft
- **Yjs** CRDT library by Kevin Jahns
- **Socket.IO** for real-time communication
- **Prisma** ORM for database management
- **React** team for the amazing framework

## 📧 Support

For issues and questions:
- Open an issue on GitHub
- Email: support@codecollab.dev
- Documentation: https://docs.codecollab.dev

## 🗺️ Roadmap

- [x] MVP with real-time editing
- [x] File locking system
- [x] User presence tracking
- [x] Docker & Kubernetes deployment
- [ ] Terminal integration (xterm.js)
- [ ] Code review system
- [ ] Git integration
- [ ] Voice collaboration
- [ ] AI code completion
- [ ] Mobile app

---

**Built with ❤️ by the CodeCollab Team**