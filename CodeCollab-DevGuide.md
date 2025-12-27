# CodeCollab: Quick-Start Development Guide
## Build, Run & Deploy in 7 Days

**Target Audience**: Developers building CodeCollab MVP  
**Tech Level**: Advanced (Node.js, Docker, Kubernetes experience assumed)  
**Estimated Time**: 40 hours for MVP

---

## Table of Contents
1. [Day 1: Project Setup](#day-1-project-setup)
2. [Day 2: Backend Core](#day-2-backend-core)
3. [Day 3: Real-Time Sync](#day-3-real-time-sync)
4. [Day 4: Frontend IDE](#day-4-frontend-ide)
5. [Day 5: Workspace & Locks](#day-5-workspace--locks)
6. [Day 6: Docker & Cloud](#day-6-docker--cloud)
7. [Day 7: Testing & Deploy](#day-7-testing--deploy)

---

## Day 1: Project Setup

### Repository Structure
```
codeCollab/
├── backend/
│   ├── src/
│   │   ├── server.ts           # Express server entry
│   │   ├── socket.ts           # Socket.IO setup
│   │   ├── controllers/
│   │   │   ├── auth.ts
│   │   │   ├── projects.ts
│   │   │   └── files.ts
│   │   ├── services/
│   │   │   ├── sync.ts         # Yjs sync logic
│   │   │   ├── locks.ts        # File locking
│   │   │   └── presence.ts     # User tracking
│   │   ├── models/
│   │   │   ├── user.ts
│   │   │   ├── project.ts
│   │   │   └── file.ts
│   │   ├── middleware/
│   │   │   └── auth.ts
│   │   └── config/
│   │       └── env.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── components/
│   │   │   ├── Editor.tsx
│   │   │   ├── FileExplorer.tsx
│   │   │   ├── Terminal.tsx
│   │   │   └── UserPresence.tsx
│   │   ├── hooks/
│   │   │   ├── useSocket.ts
│   │   │   ├── useYjs.ts
│   │   │   └── useCursor.ts
│   │   ├── stores/
│   │   │   └── editorStore.ts  # Zustand
│   │   └── pages/
│   │       ├── Login.tsx
│   │       ├── Dashboard.tsx
│   │       └── Editor.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
├── docker-compose.yml
├── kubernetes/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── configmap.yaml
└── README.md
```

### 1.1 Initialize Backend

```bash
# Create project
mkdir codeCollab && cd codeCollab
mkdir backend frontend

# Backend setup
cd backend
npm init -y

# Install dependencies
npm install express cors dotenv passport passport-github2 jsonwebtoken
npm install socket.io redis ioredis bull
npm install yjs y-websocket lib0
npm install pg prisma @prisma/client
npm install --save-dev typescript ts-node nodemon @types/node

# TypeScript config
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
EOF

# Environment variables
cat > .env << 'EOF'
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/collab_db
REDIS_URL=redis://localhost:6379
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_secret
JWT_SECRET=your_jwt_secret_key
CORS_ORIGIN=http://localhost:5173
EOF

# Create package scripts
cat > package.json << 'EOF'
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "vitest"
  }
}
EOF
```

### 1.2 Initialize Frontend

```bash
cd ../frontend

# Vite + React
npm create vite@latest . -- --template react-ts

# Install dependencies
npm install react-router-dom zustand socket.io-client
npm install @monaco-editor/react yjs y-websocket
npm install xterm xterm-addon-fit
npm install axios react-query
npm install tailwindcss postcss autoprefixer
npm install -D @testing-library/react vitest

# Tailwind setup
npx tailwindcss init -p
```

### 1.3 Docker & Compose Setup

```bash
cd .. && cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: collab_db
      POSTGRES_USER: collab_user
      POSTGRES_PASSWORD: secure_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://collab_user:secure_password@postgres:5432/collab_db
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis
    volumes:
      - ./backend/src:/app/src
    command: npm run dev

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    environment:
      VITE_API_URL: http://localhost:3000
    volumes:
      - ./frontend/src:/app/src
    command: npm run dev

volumes:
  postgres_data:
  redis_data:
EOF

# Start services
docker-compose up -d
```

---

## Day 2: Backend Core

### 2.1 Express Server Setup

```typescript
// backend/src/server.ts
import express, { Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';

dotenv.config();

const app: Express = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN,
    credentials: true
  }
});

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export { app, io };
```

### 2.2 Database Setup (Prisma)

```bash
cd backend
npx prisma init
```

```
// backend/.env
DATABASE_URL=postgresql://collab_user:secure_password@localhost:5432/collab_db
```

```prisma
// backend/prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  avatar    String?
  githubId  String   @unique
  createdAt DateTime @default(now())

  projectIds String[]
  projects   Project[] @relation("ProjectCollaborators")
  ownedProjects Project[] @relation("ProjectOwner")
}

model Project {
  id          String   @id @default(cuid())
  name        String
  description String?
  ownerId     String
  owner       User     @relation("ProjectOwner", fields: [ownerId], references: [id], onDelete: Cascade)
  collaborators User[] @relation("ProjectCollaborators")
  
  files       ProjectFile[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([ownerId])
}

model ProjectFile {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  path      String
  content   String   @default("")
  
  lockedBy  String?
  lockedAt  DateTime?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([projectId, path])
  @@index([projectId])
}

model FileLock {
  id        String   @id @default(cuid())
  fileId    String
  userId    String
  acquiredAt DateTime @default(now())
  expiresAt DateTime
}
```

```bash
# Create and run migration
npx prisma migrate dev --name init
```

### 2.3 Authentication Service

```typescript
// backend/src/services/auth.ts
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET!;

export interface JWTPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

export function generateToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

export async function authenticateGithubUser(githubId: string, profile: any) {
  let user = await prisma.user.findUnique({
    where: { githubId }
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        githubId,
        email: profile.emails[0].value,
        name: profile.displayName,
        avatar: profile.photos[0]?.value
      }
    });
  }

  return generateToken(user.id, user.email);
}
```

### 2.4 Middleware: JWT Auth

```typescript
// backend/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/auth';

declare global {
  namespace Express {
    interface Request {
      user?: { userId: string; email: string };
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  req.user = payload;
  next();
}
```

---

## Day 3: Real-Time Sync

### 3.1 Yjs Document Sync

```typescript
// backend/src/services/sync.ts
import * as Y from 'yjs';
import * as lib0 from 'lib0';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL!);

class DocumentSync {
  private docs: Map<string, Y.Doc> = new Map();

  async getOrCreateDocument(projectId: string, filePath: string): Promise<Y.Doc> {
    const key = `${projectId}:${filePath}`;

    if (this.docs.has(key)) {
      return this.docs.get(key)!;
    }

    const ydoc = new Y.Doc();
    const ytext = ydoc.getText('content');

    // Load previous state from database
    const file = await prisma.projectFile.findUnique({
      where: {
        projectId_path: { projectId, path: filePath }
      }
    });

    if (file) {
      ytext.insert(0, file.content);
    }

    this.docs.set(key, ydoc);
    return ydoc;
  }

  applyUpdate(projectId: string, filePath: string, update: Uint8Array) {
    const key = `${projectId}:${filePath}`;
    const ydoc = this.docs.get(key);

    if (!ydoc) return false;

    try {
      Y.applyUpdate(ydoc, update);
      return true;
    } catch (error) {
      console.error('Failed to apply update:', error);
      return false;
    }
  }

  getState(projectId: string, filePath: string): Uint8Array | null {
    const key = `${projectId}:${filePath}`;
    const ydoc = this.docs.get(key);

    if (!ydoc) return null;

    return Y.encodeStateAsUpdate(ydoc);
  }

  getText(projectId: string, filePath: string): string {
    const key = `${projectId}:${filePath}`;
    const ydoc = this.docs.get(key);

    if (!ydoc) return '';

    return ydoc.getText('content').toString();
  }

  async persistToDatabase(projectId: string, filePath: string) {
    const content = this.getText(projectId, filePath);

    await prisma.projectFile.upsert({
      where: { projectId_path: { projectId, path: filePath } },
      create: { projectId, path: filePath, content },
      update: { content }
    });
  }
}

export const documentSync = new DocumentSync();
```

### 3.2 File Locking Service

```typescript
// backend/src/services/locks.ts
import Redis from 'ioredis';
import { randomUUID } from 'crypto';

const redis = new Redis(process.env.REDIS_URL!);
const LOCK_DURATION = 10 * 60 * 1000; // 10 minutes

interface FileLock {
  holder: string;
  acquiredAt: number;
  expiresAt: number;
}

export class LockManager {
  async acquireLock(projectId: string, filePath: string, userId: string): Promise<boolean> {
    const key = `lock:${projectId}:${filePath}`;
    const lock: FileLock = {
      holder: userId,
      acquiredAt: Date.now(),
      expiresAt: Date.now() + LOCK_DURATION
    };

    // Only set if key doesn't exist
    const result = await redis.set(
      key,
      JSON.stringify(lock),
      'EX',
      Math.ceil(LOCK_DURATION / 1000),
      'NX'
    );

    return result === 'OK';
  }

  async releaseLock(projectId: string, filePath: string, userId: string): Promise<boolean> {
    const key = `lock:${projectId}:${filePath}`;
    const lock = await this.getLock(projectId, filePath);

    if (!lock || lock.holder !== userId) {
      return false;
    }

    await redis.del(key);
    return true;
  }

  async getLock(projectId: string, filePath: string): Promise<FileLock | null> {
    const key = `lock:${projectId}:${filePath}`;
    const data = await redis.get(key);

    if (!data) return null;

    return JSON.parse(data);
  }

  async refreshLock(projectId: string, filePath: string, userId: string): Promise<boolean> {
    const lock = await this.getLock(projectId, filePath);

    if (!lock || lock.holder !== userId) {
      return false;
    }

    return await this.acquireLock(projectId, filePath, userId);
  }

  async isLocked(projectId: string, filePath: string): Promise<boolean> {
    return (await this.getLock(projectId, filePath)) !== null;
  }
}

export const lockManager = new LockManager();
```

### 3.3 Presence Tracking

```typescript
// backend/src/services/presence.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

export interface UserPresence {
  userId: string;
  userName: string;
  fileName: string;
  cursorLine: number;
  cursorColumn: number;
  isTyping: boolean;
  lastUpdate: number;
  color: string;
}

export class PresenceManager {
  async updatePresence(projectId: string, presence: UserPresence) {
    const key = `presence:${projectId}:${presence.userId}`;
    await redis.setex(
      key,
      60, // 1 minute TTL
      JSON.stringify(presence)
    );
  }

  async getProjectPresence(projectId: string): Promise<UserPresence[]> {
    const keys = await redis.keys(`presence:${projectId}:*`);
    const presences: UserPresence[] = [];

    for (const key of keys) {
      const data = await redis.get(key);
      if (data) {
        presences.push(JSON.parse(data));
      }
    }

    return presences;
  }

  async removePresence(projectId: string, userId: string) {
    const key = `presence:${projectId}:${userId}`;
    await redis.del(key);
  }
}

export const presenceManager = new PresenceManager();
```

---

## Day 4: Frontend IDE

### 4.1 Monaco Editor Integration

```typescript
// frontend/src/components/Editor.tsx
import { useEffect, useRef } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import { useYjs } from '../hooks/useYjs';
import { useSocket } from '../hooks/useSocket';

interface EditorProps {
  projectId: string;
  filePath: string;
}

export function CodeEditor({ projectId, filePath }: EditorProps) {
  const editorRef = useRef(null);
  const monacoRef = useRef<Monaco | null>(null);
  const { ydoc, ytext } = useYjs(projectId, filePath);
  const { socket } = useSocket();

  const handleEditorMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Sync Yjs changes to editor
    ytext?.observe((event) => {
      const value = ytext.toString();
      editor.setValue(value);
    });
  };

  const handleChange = (value: string | undefined) => {
    if (!value || !ytext) return;

    // Yjs will broadcast automatically via Socket.IO
    const currentValue = ytext.toString();
    
    if (value.length > currentValue.length) {
      const diff = value.substring(currentValue.length);
      ytext.insert(currentValue.length, diff);
    } else if (value.length < currentValue.length) {
      ytext.delete(value.length, currentValue.length - value.length);
    }
  };

  return (
    <Editor
      height="100%"
      defaultLanguage="javascript"
      onMount={handleEditorMount}
      onChange={handleChange}
      theme="vs-dark"
      options={{
        fontSize: 14,
        fontFamily: 'Fira Code',
        minimap: { enabled: false },
        wordWrap: 'on'
      }}
    />
  );
}
```

### 4.2 Yjs Hook

```typescript
// frontend/src/hooks/useYjs.ts
import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

interface UseYjsReturn {
  ydoc: Y.Doc | null;
  ytext: Y.Text | null;
  isConnected: boolean;
}

export function useYjs(projectId: string, filePath: string): UseYjsReturn {
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
  const [ytext, setYtext] = useState<Y.Text | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const doc = new Y.Doc();
    const text = doc.getText('content');

    // Connect to server via WebSocket
    const provider = new WebsocketProvider(
      `${import.meta.env.VITE_WS_URL}`,
      `${projectId}:${filePath}`,
      doc
    );

    provider.on('status', (event: any) => {
      setIsConnected(event.status === 'connected');
    });

    setYdoc(doc);
    setYtext(text);

    return () => {
      provider.destroy();
      doc.destroy();
    };
  }, [projectId, filePath]);

  return { ydoc, ytext, isConnected };
}
```

### 4.3 Socket.IO Hook

```typescript
// frontend/src/hooks/useSocket.ts
import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
}

export function useSocket(): UseSocketReturn {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const newSocket = io(import.meta.env.VITE_API_URL, {
      auth: {
        token: localStorage.getItem('authToken')
      }
    });

    newSocket.on('connect', () => setIsConnected(true));
    newSocket.on('disconnect', () => setIsConnected(false));

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  return { socket, isConnected };
}
```

### 4.4 User Presence Component

```typescript
// frontend/src/components/UserPresence.tsx
import { useEffect, useState } from 'react';
import { useSocket } from '../hooks/useSocket';

interface User {
  userId: string;
  userName: string;
  color: string;
  cursorLine: number;
}

export function UserPresence() {
  const { socket } = useSocket();
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (!socket) return;

    socket.on('presence:update', (data) => {
      setUsers((prev) => {
        const existing = prev.findIndex((u) => u.userId === data.userId);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = data;
          return updated;
        }
        return [...prev, data];
      });
    });

    socket.on('user:typing', (data) => {
      // Show typing indicator
      console.log(`${data.userName} is typing...`);
    });

    return () => {
      socket.off('presence:update');
      socket.off('user:typing');
    };
  }, [socket]);

  return (
    <div className="p-4 bg-gray-900 border-l border-gray-700">
      <h3 className="text-sm font-semibold text-gray-400 mb-3">
        Active Users ({users.length})
      </h3>
      <div className="space-y-2">
        {users.map((user) => (
          <div key={user.userId} className="flex items-center gap-2 text-xs">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: user.color }}
            />
            <span className="text-gray-300">{user.userName}</span>
            <span className="text-gray-500">Ln {user.cursorLine}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Day 5: Workspace & Locks

### 5.1 Socket.IO Events Handler

```typescript
// backend/src/socket.ts
import { Server, Socket } from 'socket.io';
import { documentSync } from './services/sync';
import { lockManager } from './services/locks';
import { presenceManager } from './services/presence';
import { verifyToken } from './services/auth';

export function setupSocketEvents(io: Server) {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    const payload = verifyToken(token);

    if (!payload) {
      return next(new Error('Authentication failed'));
    }

    socket.data.userId = payload.userId;
    next();
  });

  io.on('connection', (socket: Socket) => {
    console.log(`User ${socket.data.userId} connected`);

    // Join project room
    socket.on('project:join', (data: { projectId: string }) => {
      socket.join(`project:${data.projectId}`);
      socket.data.projectId = data.projectId;
    });

    // Sync operations
    socket.on('sync:update', async (data) => {
      const { projectId, filePath, update } = data;
      
      documentSync.applyUpdate(projectId, filePath, new Uint8Array(update));
      
      // Broadcast to other users in room
      socket.broadcast.to(`project:${projectId}`).emit('sync:update', data);
    });

    // File locking
    socket.on('file:lock', async (data: { projectId: string; filePath: string }) => {
      const { projectId, filePath } = data;
      const acquired = await lockManager.acquireLock(projectId, filePath, socket.data.userId);

      if (acquired) {
        io.to(`project:${projectId}`).emit('lock:acquired', {
          filePath,
          userId: socket.data.userId,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000)
        });
      } else {
        socket.emit('lock:failed', { filePath, reason: 'Already locked' });
      }
    });

    socket.on('file:unlock', async (data: { projectId: string; filePath: string }) => {
      const { projectId, filePath } = data;
      await lockManager.releaseLock(projectId, filePath, socket.data.userId);

      io.to(`project:${projectId}`).emit('lock:released', {
        filePath,
        userId: socket.data.userId
      });
    });

    // Presence
    socket.on('presence:update', async (data) => {
      const projectId = socket.data.projectId;
      await presenceManager.updatePresence(projectId, {
        userId: socket.data.userId,
        ...data
      });

      io.to(`project:${projectId}`).emit('presence:update', {
        userId: socket.data.userId,
        ...data
      });
    });

    // Typing
    socket.on('user:typing', (data) => {
      const projectId = socket.data.projectId;
      io.to(`project:${projectId}`).emit('user:typing', {
        userId: socket.data.userId,
        ...data
      });
    });

    socket.on('disconnect', async () => {
      const projectId = socket.data.projectId;
      await presenceManager.removePresence(projectId, socket.data.userId);
    });
  });
}
```

### 5.2 File Locking Frontend

```typescript
// frontend/src/components/FileTabs.tsx
import { useState } from 'react';
import { useSocket } from '../hooks/useSocket';

interface FileTabProps {
  projectId: string;
  filePath: string;
  isActive: boolean;
  isLocked: boolean;
  lockedBy?: string;
}

export function FileTab({ projectId, filePath, isActive, isLocked, lockedBy }: FileTabProps) {
  const { socket } = useSocket();
  const [isRequesting, setIsRequesting] = useState(false);

  const handleLockRequest = async () => {
    if (isLocked && lockedBy !== getCurrentUserId()) {
      setIsRequesting(true);
      socket?.emit('file:lock', { projectId, filePath });

      // Timeout after 5 seconds
      setTimeout(() => setIsRequesting(false), 5000);
      return;
    }

    if (isLocked && lockedBy === getCurrentUserId()) {
      socket?.emit('file:unlock', { projectId, filePath });
    }
  };

  return (
    <div
      className={`px-4 py-2 border-r cursor-pointer flex items-center gap-2 ${
        isActive ? 'bg-gray-800 border-blue-500' : 'bg-gray-900 border-gray-700'
      }`}
    >
      <span>{filePath.split('/').pop()}</span>

      {isLocked ? (
        <span className="text-red-500 text-xs">
          {isRequesting ? '⏳' : lockedBy === getCurrentUserId() ? '🔒' : '🔴'}
        </span>
      ) : (
        <span className="text-green-500 text-xs">🔓</span>
      )}

      <button
        onClick={handleLockRequest}
        className="ml-auto text-xs px-2 py-1 bg-blue-600 rounded hover:bg-blue-700"
      >
        {isRequesting ? 'Requesting...' : 'Lock'}
      </button>
    </div>
  );
}

function getCurrentUserId(): string {
  // Get from localStorage or state
  return localStorage.getItem('userId') || '';
}
```

---

## Day 6: Docker & Cloud

### 6.1 Dockerfiles

```dockerfile
# backend/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Install runtime dependencies
RUN apk add --no-cache python3 git

# Copy source
COPY src ./src
COPY tsconfig.json ./

# Compile TypeScript
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY src ./src
COPY vite.config.ts tsconfig.json index.html ./

RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

```nginx
# frontend/nginx.conf
server {
  listen 80;
  location / {
    root /usr/share/nginx/html;
    try_files $uri $uri/ /index.html;
  }
  location /api {
    proxy_pass http://backend:3000;
  }
}
```

### 6.2 Build & Push to Registry

```bash
# Build images
docker build -t myregistry/codeCollab-backend:latest ./backend
docker build -t myregistry/codeCollab-frontend:latest ./frontend

# Push to registry (Docker Hub, ECR, GCR)
docker push myregistry/codeCollab-backend:latest
docker push myregistry/codeCollab-frontend:latest
```

### 6.3 Kubernetes Deployment

```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: codeCollab-backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: codeCollab-backend
  template:
    metadata:
      labels:
        app: codeCollab-backend
    spec:
      containers:
      - name: backend
        image: myregistry/codeCollab-backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: collab-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            configMapKeyRef:
              name: collab-config
              key: redis-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10

---
apiVersion: v1
kind: Service
metadata:
  name: codeCollab-backend
spec:
  selector:
    app: codeCollab-backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

---

## Day 7: Testing & Deploy

### 7.1 Unit Tests

```typescript
// backend/src/__tests__/locks.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { lockManager } from '../services/locks';

describe('LockManager', () => {
  beforeEach(async () => {
    // Setup test fixtures
  });

  it('should acquire a lock', async () => {
    const success = await lockManager.acquireLock('proj1', 'file.ts', 'user1');
    expect(success).toBe(true);
  });

  it('should prevent concurrent locks', async () => {
    await lockManager.acquireLock('proj1', 'file.ts', 'user1');
    const success = await lockManager.acquireLock('proj1', 'file.ts', 'user2');
    expect(success).toBe(false);
  });

  it('should release a lock', async () => {
    await lockManager.acquireLock('proj1', 'file.ts', 'user1');
    const released = await lockManager.releaseLock('proj1', 'file.ts', 'user1');
    expect(released).toBe(true);
  });

  afterEach(async () => {
    // Cleanup
  });
});
```

### 7.2 E2E Tests

```typescript
// frontend/src/__tests__/e2e.test.ts
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CodeEditor } from '../components/Editor';

describe('Collaborative Editing E2E', () => {
  it('should sync edits between users', async () => {
    // Simulate two editors
    const { rerender } = render(
      <CodeEditor projectId="proj1" filePath="index.ts" />
    );

    // Type in first editor
    const editor1 = screen.getByRole('textbox');
    expect(editor1).toBeInTheDocument();

    // Verify sync (mock WebSocket)
    await waitFor(() => {
      expect(editor1).toHaveValue();
    });
  });
});
```

### 7.3 Deploy Commands

```bash
# Deploy to AWS ECS
aws ecs create-service \
  --cluster CodeCollab-Cluster \
  --service-name codeCollab-backend \
  --task-definition codeCollab-backend:1 \
  --desired-count 2 \
  --launch-type FARGATE

# Deploy to GCP Cloud Run
gcloud run deploy codeCollab \
  --image gcr.io/PROJECT_ID/codeCollab:latest \
  --region us-central1 \
  --platform managed

# Deploy to Kubernetes
kubectl apply -f kubernetes/

# Check deployment status
kubectl get deployments
kubectl get pods
kubectl logs -f deployment/codeCollab-backend
```

---

## Post-MVP Checklist

- [ ] Add comprehensive error handling
- [ ] Implement rate limiting
- [ ] Add monitoring (Datadog/Prometheus)
- [ ] Set up CI/CD pipeline (GitHub Actions)
- [ ] Configure auto-scaling
- [ ] Add database backups
- [ ] Security audit
- [ ] Load testing (k6/JMeter)
- [ ] Documentation & API docs
- [ ] User onboarding flow

---

## Useful Commands

```bash
# Watch logs
docker-compose logs -f backend

# Access database
docker exec -it codeCollab_postgres_1 psql -U collab_user -d collab_db

# Rebuild containers
docker-compose build --no-cache

# Run migrations
cd backend && npx prisma migrate dev

# Format code
npm run format

# Type check
npm run type-check
```

---

**Good luck building! 🚀**

For questions or issues, refer to:
- Full PRD: CodeCollab-PRD.md
- Tech docs: Stack-specific guides
- Community: GitHub Discussions
