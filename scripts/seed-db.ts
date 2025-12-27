import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create test users
    const user1 = await prisma.user.upsert({
        where: { email: 'alice@example.com' },
        update: {},
        create: {
            email: 'alice@example.com',
            name: 'Alice Developer',
            githubId: 'github_alice',
            avatar: 'https://avatars.githubusercontent.com/u/1?v=4',
        },
    });

    const user2 = await prisma.user.upsert({
        where: { email: 'bob@example.com' },
        update: {},
        create: {
            email: 'bob@example.com',
            name: 'Bob Engineer',
            githubId: 'github_bob',
            avatar: 'https://avatars.githubusercontent.com/u/2?v=4',
        },
    });

    console.log('✓ Created users:', user1.name, user2.name);

    // Create sample projects
    const project1 = await prisma.project.upsert({
        where: { id: 'demo-project-1' },
        update: {},
        create: {
            id: 'demo-project-1',
            name: 'Demo Project - Node.js API',
            description: 'A sample Node.js REST API project for demonstration',
            template: 'nodejs-express',
            runtime: 'node:20',
            ownerId: user1.id,
            collaborators: {
                create: [
                    { userId: user1.id, role: 'owner' },
                    { userId: user2.id, role: 'editor' },
                ],
            },
            files: {
                create: [
                    {
                        path: 'README.md',
                        content: `# Demo Project
            
This is a sample project for CodeCollab demonstration.

## Features
- Real-time collaboration
- File locking
- Live presence tracking

## Getting Started
1. Install dependencies: \`npm install\`
2. Start server: \`npm start\`
`,
                        language: 'markdown',
                    },
                    {
                        path: 'package.json',
                        content: `{
  "name": "demo-api",
  "version": "1.0.0",
  "description": "Demo API project",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  }
}`,
                        language: 'json',
                    },
                    {
                        path: 'index.js',
                        content: `const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ message: 'Hello from CodeCollab!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});
`,
                        language: 'javascript',
                    },
                ],
            },
        },
    });

    const project2 = await prisma.project.upsert({
        where: { id: 'demo-project-2' },
        update: {},
        create: {
            id: 'demo-project-2',
            name: 'Demo Project - React App',
            description: 'A sample React application',
            template: 'react-vite',
            runtime: 'node:20',
            ownerId: user2.id,
            collaborators: {
                create: [
                    { userId: user2.id, role: 'owner' },
                    { userId: user1.id, role: 'editor' },
                ],
            },
            files: {
                create: [
                    {
                        path: 'README.md',
                        content: '# React Demo App\n\nA sample React application.',
                        language: 'markdown',
                    },
                    {
                        path: 'src/App.jsx',
                        content: `import React from 'react';

function App() {
  return (
    <div className="App">
      <h1>Welcome to CodeCollab</h1>
      <p>Real-time collaborative coding!</p>
    </div>
  );
}

export default App;
`,
                        language: 'javascript',
                    },
                ],
            },
        },
    });

    console.log('✓ Created projects:', project1.name, project2.name);
    console.log('');
    console.log('✅ Database seeded successfully!');
    console.log('');
    console.log('Test Users:');
    console.log(`  - ${user1.name} (${user1.email})`);
    console.log(`  - ${user2.name} (${user2.email})`);
    console.log('');
    console.log('Test Projects:');
    console.log(`  - ${project1.name} (${project1.id})`);
    console.log(`  - ${project2.name} (${project2.id})`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
