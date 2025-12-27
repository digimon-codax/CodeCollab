import * as Y from 'yjs';
import { ProjectFile } from '../models';

class DocumentSyncManager {
    private documents: Map<string, Y.Doc> = new Map();
    private saveTimeouts: Map<string, NodeJS.Timeout> = new Map();

    getDocumentKey(projectId: string, filePath: string): string {
        return `${projectId}:${filePath}`;
    }

    async getOrCreateDocument(projectId: string, filePath: string): Promise<Y.Doc> {
        const key = this.getDocumentKey(projectId, filePath);

        if (this.documents.has(key)) {
            return this.documents.get(key)!;
        }

        const ydoc = new Y.Doc();

        // Load from database if exists
        try {
            const file = await ProjectFile.findOne({ projectId, path: filePath });

            if (file && file.yjsState) {
                Y.applyUpdate(ydoc, file.yjsState);
            } else if (file && file.content) {
                // Initialize with content
                const ytext = ydoc.getText('content');
                ytext.insert(0, file.content);
            }
        } catch (error) {
            console.error('Error loading document:', error);
        }

        this.documents.set(key, ydoc);

        // Set up auto-save on updates
        ydoc.on('update', () => {
            this.debouncedSave(projectId, filePath);
        });

        return ydoc;
    }

    applyUpdate(projectId: string, filePath: string, update: Uint8Array): boolean {
        const key = this.getDocumentKey(projectId, filePath);
        const ydoc = this.documents.get(key);

        if (!ydoc) {
            return false;
        }

        try {
            Y.applyUpdate(ydoc, update);
            return true;
        } catch (error) {
            console.error('Error applying update:', error);
            return false;
        }
    }

    getState(projectId: string, filePath: string): Uint8Array | null {
        const key = this.getDocumentKey(projectId, filePath);
        const ydoc = this.documents.get(key);

        if (!ydoc) {
            return null;
        }

        return Y.encodeStateAsUpdate(ydoc);
    }

    getText(projectId: string, filePath: string): string {
        const key = this.getDocumentKey(projectId, filePath);
        const ydoc = this.documents.get(key);

        if (!ydoc) {
            return '';
        }

        const ytext = ydoc.getText('content');
        return ytext.toString();
    }

    private debouncedSave(projectId: string, filePath: string) {
        const key = this.getDocumentKey(projectId, filePath);

        // Clear existing timeout
        if (this.saveTimeouts.has(key)) {
            clearTimeout(this.saveTimeouts.get(key)!);
        }

        // Set new timeout for  saving
        const timeout = setTimeout(async () => {
            await this.saveToDatabase(projectId, filePath);
            this.saveTimeouts.delete(key);
        }, 2000); // Save after 2 seconds of inactivity

        this.saveTimeouts.set(key, timeout);
    }

    private async saveToDatabase(projectId: string, filePath: string) {
        const key = this.getDocumentKey(projectId, filePath);
        const ydoc = this.documents.get(key);

        if (!ydoc) {
            return;
        }

        try {
            const content = this.getText(projectId, filePath);
            const yjsState = Y.encodeStateAsUpdate(ydoc);
            const language = this.detectLanguage(filePath);

            await ProjectFile.findOneAndUpdate(
                { projectId, path: filePath },
                {
                    content,
                    yjsState: Buffer.from(yjsState),
                    language,
                },
                { upsert: true, new: true }
            );

            console.log(`Saved document: ${filePath}`);
        } catch (error) {
            console.error('Error saving document:', error);
        }
    }

    private detectLanguage(filePath: string): string {
        const ext = filePath.split('.').pop()?.toLowerCase();
        const langMap: Record<string, string> = {
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'py': 'python',
            'java': 'java',
            'cpp': 'cpp',
            'c': 'c',
            'cs': 'csharp',
            'go': 'go',
            'rs': 'rust',
            'rb': 'ruby',
            'php': 'php',
            'html': 'html',
            'css': 'css',
            'json': 'json',
            'md': 'markdown',
            'yaml': 'yaml',
            'yml': 'yaml',
            'xml': 'xml',
            'sh': 'shell',
        };

        return langMap[ext || ''] || 'plaintext';
    }

    async closeDocument(projectId: string, filePath: string) {
        const key = this.getDocumentKey(projectId, filePath);

        // Clear save timeout
        if (this.saveTimeouts.has(key)) {
            clearTimeout(this.saveTimeouts.get(key)!);
            this.saveTimeouts.delete(key);
        }

        // Final save
        await this.saveToDatabase(projectId, filePath);

        // Remove from memory
        this.documents.delete(key);
    }

    getActiveDocuments(): string[] {
        return Array.from(this.documents.keys());
    }
}

export const documentSync = new DocumentSyncManager();
