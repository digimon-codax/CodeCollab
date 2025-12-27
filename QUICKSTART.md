# CodeCollab - Quick Start Guide

## ✅ MongoDB Conversion Complete!

The entire backend has been converted from PostgreSQL/Prisma to **MongoDB/Mongoose**.

## 🚀 Running the Project

### Prerequisites
- Docker Desktop installed and running

### Start Everything
```bash
cd C:\Users\NAYANANSHU GARAI\CodeCollab
docker compose up --build
```

This starts:
- **MongoDB 7** on port 27017
- **Redis 7** on port 6379  
- **Backend** on port 3000
- **Frontend** on port 5173

### Access the Application
- Frontend: http://localhost:5173
- Backend Health: http://localhost:3000/health

### First Time Setup
1. Open http://localhost:5173
2. Enter any text as auth code (e.g., "testuser")
3. Click "Sign in"  
4. Create a new project
5. Start coding!

## 📊 What's Included

**Backend (MongoDB + Mongoose):**
- User authentication (JWT + GitHub OAuth simulation)
- Real-time collaboration with Yjs  
- File locking with Redis
- User presence tracking
- Terminal integration (xterm.js + PTY)
- Winston logging

**Frontend (React + TypeScript):**
- Monaco Editor
- Real-time sync hooks
- File explorer
- User presence sidebar
- Responsive UI with Tailwind CSS

**Infrastructure:**
- Docker Compose with MongoDB
- Kubernetes manifests
- GitHub Actions CI/CD
- Health monitoring

## 🎉 All MVP Features Ready!

You can now test real-time collaboration, file locking, presence tracking, and terminal functionality!
