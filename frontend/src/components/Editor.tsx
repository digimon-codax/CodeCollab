import { useEffect, useRef } from 'react';
import MonacoEditor, { Monaco } from '@monaco-editor/react';
import { useYjs } from '../hooks/useYjs';
import { useFileLock } from '../hooks/useFileLock';
import * as Y from 'yjs';

interface EditorProps {
    projectId: string;
    filePath: string;
}

export default function Editor({ projectId, filePath }: EditorProps) {
    const editorRef = useRef<any>(null);
    const { ytext, isConnected } = useYjs(projectId, filePath);
    const { lockInfo, acquireLock, releaseLock } = useFileLock(projectId, filePath);

    useEffect(() => {
        if (!ytext || !editorRef.current) return;

        // Sync Yjs changes to Monaco
        const observer = () => {
            const value = ytext.toString();
            if (editorRef.current && editorRef.current.getValue() !== value) {
                const position = editorRef.current.getPosition();
                editorRef.current.setValue(value);
                if (position) {
                    editorRef.current.setPosition(position);
                }
            }
        };

        ytext.observe(observer);

        return () => {
            ytext.unobserve(observer);
        };
    }, [ytext]);

    const handleEditorMount = (editor: any, monaco: Monaco) => {
        editorRef.current = editor;

        // Initial sync
        if (ytext) {
            editor.setValue(ytext.toString());
        }
    };

    const handleChange = (value: string | undefined) => {
        if (!value || !ytext) return;

        const currentValue = ytext.toString();

        // Simple sync - replace entire content
        // For production, use delta-based sync for better performance
        if (value !== currentValue) {
            ytext.delete(0, currentValue.length);
            ytext.insert(0, value);
        }
    };

    const detectLanguage = (path: string) => {
        const ext = path.split('.').pop()?.toLowerCase();
        const map: Record<string, string> = {
            js: 'javascript',
            jsx: 'javascript',
            ts: 'typescript',
            tsx: 'typescript',
            python: 'python',
            py: 'python',
            java: 'java',
            go: 'go',
            rs: 'rust',
            cpp: 'cpp',
            c: 'c',
            css: 'css',
            html: 'html',
            json: 'json',
            md: 'markdown',
        };
        return map[ext || ''] || 'plaintext';
    };

    return (
        <div className="flex-1 flex flex-col">
            {/* File Tab */}
            <div className="bg-dark-surface border-b border-dark-border flex items-center justify-between px-4 py-2">
                <div className="flex items-center gap-2">
                    <span className="font-medium">{filePath.split('/').pop()}</span>
                    {!isConnected && (
                        <span className="text-xs text-yellow-500">● Reconnecting...</span>
                    )}
                    {lockInfo.locked && (
                        <span className={`text-xs ${lockInfo.isOwnedByCurrentUser ? 'text-green-500' : 'text-red-500'}`}>
                            {lockInfo.isOwnedByCurrentUser ? '🔒 Locked by you' : `🔒 Locked by ${lockInfo.holder?.name}`}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {lockInfo.locked && !lockInfo.isOwnedByCurrentUser ? (
                        <span className="text-xs text-gray-400">Read-only mode</span>
                    ) : lockInfo.isOwnedByCurrentUser ? (
                        <button
                            onClick={releaseLock}
                            className="text-xs px-3 py-1 bg-red-600 hover:bg-red-700 rounded transition-colors"
                        >
                            Release Lock
                        </button>
                    ) : (
                        <button
                            onClick={acquireLock}
                            className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                        >
                            Acquire Lock
                        </button>
                    )}
                </div>
            </div>

            {/* Monaco Editor */}
            <div className="flex-1">
                <MonacoEditor
                    height="100%"
                    language={detectLanguage(filePath)}
                    onMount={handleEditorMount}
                    onChange={handleChange}
                    theme="vs-dark"
                    options={{
                        fontSize: 14,
                        fontFamily: 'Fira Code, Monaco, Courier New, monospace',
                        minimap: { enabled: true },
                        wordWrap: 'on',
                        automaticLayout: true,
                        scrollBeyondLastLine: false,
                        readOnly: lockInfo.locked && !lockInfo.isOwnedByCurrentUser,
                        lineNumbers: 'on',
                        renderLineHighlight: 'all',
                        cursorBlinking: 'smooth',
                        cursorSmoothCaretAnimation: 'on',
                    }}
                />
            </div>
        </div>
    );
}
