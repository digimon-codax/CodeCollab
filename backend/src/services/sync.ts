import * as Y from 'yjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
        try {
            const file = await prisma.projectFile.findUnique({
                where: {
                    projectId_path: { projectId, path: filePath }
                }
            });

            if (file && file.content) {
                ytext.insert(0, file.content);
            }
        } catch (error) {
            console.error('Error loading file from database:', error);
        }

        // Set up update listener for persistence
        ydoc.on('update', (update: Uint8Array) => {
            this.schedulePersis(projectId, filePath);
        });

        this.docs.set(key, ydoc);
        return ydoc;
    }

    applyUpdate(projectId: string, filePath: string, update: Uint8Array): boolean {
        const key = `${projectId}:${filePath}`;
        const ydoc = this.docs.get(key);

        if (!ydoc) {
            console.error(`Document not found: ${key}`);
            return false;
        }

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

    // Debounced persistence to avoid too many DB writes
    private persistTimers: Map<string, NodeJS.Timeout> = new Map();

    private schedulePersis(projectId: string, filePath: string) {
        const key = `${projectId}:${filePath}`;

        // Clear existing timer
        if (this.persistTimers.has(key)) {
            clearTimeout(this.persistTimers.get(key)!);
        }

        // Schedule new persistence after 2 seconds of inactivity
        const timer = setTimeout(() => {
            this.persistToDatabase(projectId, filePath);
            this.persistTimers.delete(key);
        }, 2000);

        this.persistTimers.set(key, timer);
    }

    async persistToDatabase(projectId: string, filePath: string) {
        try {
            const content = this.getText(projectId, filePath);

            await prisma.projectFile.upsert({
                where: { projectId_path: { projectId, path: filePath } },
                create: {
                    projectId,
                    path: filePath,
                    content,
                    language: this.detectLanguage(filePath),
                },
                update: {
                    content,
                    updatedAt: new Date(),
                }
            });

            console.log(`Persisted file: ${projectId}:${filePath}`);
        } catch (error) {
            console.error('Error persisting to database:', error);
        }
    }

    private detectLanguage(filePath: string): string {
        const ext = filePath.split('.').pop()?.toLowerCase();
        const languageMap: Record<string, string> = {
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'py': 'python',
            'java': 'java',
            'go': 'go',
            'rs': 'rust',
            'cpp': 'cpp',
            'c': 'c',
            'css': 'css',
            'html': 'html',
            'json': 'json',
            'md': 'markdown',
        };
        return languageMap[ext || ''] || 'plaintext';
    }

    async closeDocument(projectId: string, filePath: string) {
        const key = `${projectId}:${filePath}`;

        // Persist before closing
        await this.persistToDatabase(projectId, filePath);

        const ydoc = this.docs.get(key);
        if (ydoc) {
            ydoc.destroy();
            this.docs.delete(key);
        }

        // Clear any pending persist timers
        if (this.persistTimers.has(key)) {
            clearTimeout(this.persistTimers.get(key)!);
            this.persistTimers.delete(key);
        }
    }

    getActiveDocuments(): string[] {
        return Array.from(this.docs.keys());
    }
}

export const documentSync = new DocumentSync();
