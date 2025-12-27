import { useEffect, useRef, useState } from 'react';
import MonacoEditor, { Monaco } from '@monaco-editor/react';
import { useYjs } from '../hooks/useYjs';
import { useFileLock } from '../hooks/useFileLock';
import { Lock, Unlock } from 'lucide-react';

interface EditorProps {
    projectId: string;
    filePath: string;
    onCursorChange?: (line: number, column: number) => void;
}

export default function Editor({ projectId, filePath, onCursorChange }: EditorProps) {
    const editorRef = useRef<any>(null);
    const { ytext, isConnected } = useYjs(projectId, filePath);
    const { lockInfo, acquireLock, releaseLock } = useFileLock(projectId, filePath);
    const [, setCursorPosition] = useState({ line: 1, column: 1 });

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
            const initialContent = ytext.toString();
            if (initialContent) {
                editor.setValue(initialContent);
            }
        }

        // Track cursor position
        editor.onDidChangeCursorPosition((e: any) => {
            const { lineNumber, column } = e.position;
            setCursorPosition({ line: lineNumber, column });
            onCursorChange?.(lineNumber, column);
        });

        // Keyboard shortcuts
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            console.log('Save triggered');
        });

        // Focus editor
        setTimeout(() => editor.focus(), 100);
    };

    const handleChange = (value: string | undefined) => {
        if (value === undefined || !ytext) return;

        const currentValue = ytext.toString();

        // Only update if content actually changed
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
        <div className="flex-1 flex flex-col bg-[#1E1E1E] relative">
            {/* Lock/Unlock Toolbar */}
            <div className="bg-[#252526] border-b border-[#1E1E1E] px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400">
                        {isConnected ? (
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                Synced
                            </span>
                        ) : (
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                                Connecting...
                            </span>
                        )}
                    </span>

                    {lockInfo.locked && (
                        <span className={`text-xs px-2 py-1 rounded ${
                            lockInfo.isOwnedByCurrentUser 
                                ? 'bg-green-600/20 text-green-400' 
                                : 'bg-yellow-600/20 text-yellow-400'
                        }`}>
                            {lockInfo.isOwnedByCurrentUser 
                                ? '🔒 Locked by you' 
                                : `🔒 Locked by ${lockInfo.holder?.name}`
                            }
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {lockInfo.isOwnedByCurrentUser ? (
                        <button
                            onClick={releaseLock}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded transition-colors"
                        >
                            <Unlock size={14} />
                            Release Lock
                        </button>
                    ) : (
                        <button
                            onClick={acquireLock}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                        >
                            <Lock size={14} />
                            Acquire Lock
                        </button>
                    )}
                </div>
            </div>

            {/* Monaco Editor - ALWAYS EDITABLE */}
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
                        fontLigatures: true,
                        minimap: { enabled: true },
                        wordWrap: 'on',
                        automaticLayout: true,
                        scrollBeyondLastLine: false,
                        readOnly: false, // ALWAYS EDITABLE
                        lineNumbers: 'on',
                        renderLineHighlight: 'all',
                        cursorBlinking: 'smooth',
                        cursorSmoothCaretAnimation: 'on',
                        padding: { top: 10, bottom: 10 },
                        suggestOnTriggerCharacters: true,
                        quickSuggestions: true,
                        tabSize: 2,
                        insertSpaces: true,
                        formatOnPaste: true,
                        formatOnType: true,
                        autoClosingBrackets: 'always',
                        autoClosingQuotes: 'always',
                        autoIndent: 'full',
                        bracketPairColorization: {
                            enabled: true,
                        },
                    }}
                />
            </div>

            {/* Lock info overlay (non-blocking) */}
            {lockInfo.locked && !lockInfo.isOwnedByCurrentUser && (
                <div className="absolute top-20 right-4 bg-yellow-600/90 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 pointer-events-none">
                    <Lock size={16} />
                    <span className="text-sm font-medium">
                        File locked by {lockInfo.holder?.name} (you can still edit)
                    </span>
                </div>
            )}
        </div>
    );
}
