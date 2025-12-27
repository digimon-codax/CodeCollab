import { describe, it, expect, beforeEach } from 'vitest';
import { documentSync } from '../services/sync';
import * as Y from 'yjs';

describe('DocumentSync', () => {
    const projectId = 'test-project';
    const filePath = 'test.ts';

    beforeEach(async () => {
        // Clean up document if it exists
        await documentSync.closeDocument(projectId, filePath);
    });

    it('should create a new document', async () => {
        const ydoc = await documentSync.getOrCreateDocument(projectId, filePath);

        expect(ydoc).toBeInstanceOf(Y.Doc);
    });

    it('should return existing document', async () => {
        const ydoc1 = await documentSync.getOrCreateDocument(projectId, filePath);
        const ydoc2 = await documentSync.getOrCreateDocument(projectId, filePath);

        expect(ydoc1).toBe(ydoc2);
    });

    it('should apply updates to document', async () => {
        await documentSync.getOrCreateDocument(projectId, filePath);

        // Create update
        const doc = new Y.Doc();
        const text = doc.getText('content');
        text.insert(0, 'Hello World');
        const update = Y.encodeStateAsUpdate(doc);

        const result = documentSync.applyUpdate(projectId, filePath, update);

        expect(result).toBe(true);
    });

    it('should get document text', async () => {
        const ydoc = await documentSync.getOrCreateDocument(projectId, filePath);
        const ytext = ydoc.getText('content');
        ytext.insert(0, 'Test content');

        const text = documentSync.getText(projectId, filePath);

        expect(text).toBe('Test content');
    });

    it('should get document state', async () => {
        const ydoc = await documentSync.getOrCreateDocument(projectId, filePath);
        const ytext = ydoc.getText('content');
        ytext.insert(0, 'State test');

        const state = documentSync.getState(projectId, filePath);

        expect(state).toBeInstanceOf(Uint8Array);
        expect(state).not.toBeNull();
    });

    it('should track active documents', async () => {
        await documentSync.getOrCreateDocument(projectId, 'file1.ts');
        await documentSync.getOrCreateDocument(projectId, 'file2.ts');

        const activeDocs = documentSync.getActiveDocuments();

        expect(activeDocs.length).toBeGreaterThanOrEqual(2);
        expect(activeDocs).toContain(`${projectId}:file1.ts`);
        expect(activeDocs).toContain(`${projectId}:file2.ts`);
    });

    it('should close document', async () => {
        await documentSync.getOrCreateDocument(projectId, filePath);

        await documentSync.closeDocument(projectId, filePath);

        // Document should be removed from cache
        const activeDocs = documentSync.getActiveDocuments();
        expect(activeDocs).not.toContain(`${projectId}:${filePath}`);
    });

    it('should handle concurrent edits', async () => {
        const ydoc = await documentSync.getOrCreateDocument(projectId, filePath);
        const ytext = ydoc.getText('content');

        // Simulate multiple edits
        ytext.insert(0, 'First ');
        ytext.insert(6, 'Second ');
        ytext.insert(13, 'Third');

        const result = documentSync.getText(projectId, filePath);

        expect(result).toBe('First Second Third');
    });
});
