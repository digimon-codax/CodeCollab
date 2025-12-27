import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft } from 'lucide-react';
import Editor from '../components/Editor';
import FileExplorer from '../components/FileExplorer';
import UserPresence from '../components/UserPresence';
import ActivityBar from '../components/ActivityBar';
import EditorTabs from '../components/EditorTabs';
import Breadcrumb from '../components/Breadcrumb';
import StatusBar from '../components/StatusBar';
import { useSocket } from '../hooks/useSocket';
import { useEditorStore } from '../stores/editorStore';
import { useFileLock } from '../hooks/useFileLock';

export default function EditorPage() {
    const { projectId } = useParams<{ projectId: string }>();
    const { socket, isConnected } = useSocket();
    const [project, setProject] = useState<any>(null);
    const { activeFile, setActiveFile, setProjectId, addTab, users } = useEditorStore();
    const navigate = useNavigate();
    const [activeView, setActiveView] = useState<'files' | 'search' | 'git' | 'settings'>('files');
    const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
    const { lockInfo } = useFileLock(projectId || '', activeFile || '');

    useEffect(() => {
        if (projectId) {
            setProjectId(projectId);
            loadProject();
        }
    }, [projectId]);

    useEffect(() => {
        if (socket && isConnected && projectId) {
            // Join project room
            socket.emit('project:join', { projectId });
        }
    }, [socket, isConnected, projectId]);

    const loadProject = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await axios.get(`/api/projects/${projectId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProject(response.data);

            // Set first file as active if none selected
            if (response.data.files.length > 0 && !activeFile) {
                const firstFile = response.data.files[0];
                setActiveFile(firstFile.path);
                addTab({
                    path: firstFile.path,
                    language: firstFile.language,
                    isLocked: false,
                });
            }
        } catch (error) {
            console.error('Failed to load project:', error);
        }
    };

    const detectLanguage = (path: string) => {
        const ext = path.split('.').pop()?.toLowerCase();
        const map: Record<string, string> = {
            js: 'javascript',
            jsx: 'javascript',
            ts: 'typescript',
            tsx: 'typescript',
            py: 'python',
            java: 'java',
            go: 'go',
            rs: 'rust',
            css: 'css',
            html: 'html',
            json: 'json',
            md: 'markdown',
        };
        return map[ext || ''] || 'plaintext';
    };

    return (
        <div className="h-screen flex flex-col bg-[#1E1E1E] text-white">
            {/* Top Header */}
            <header className="bg-[#323233] border-b border-[#1E1E1E] flex items-center justify-between px-4 py-1.5 h-9">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="p-1 hover:bg-[#2A2A2A] rounded transition-colors"
                        title="Back to Dashboard"
                    >
                        <ArrowLeft size={18} />
                    </button>

                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{project?.name || 'Loading...'}</span>
                        {project && (
                            <span className="text-xs text-gray-400">- {project.description}</span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs">
                        <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-gray-400">
                            {isConnected ? 'Connected' : 'Disconnected'}
                        </span>
                    </div>
                </div>
            </header>

            {/* Main Layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* Activity Bar */}
                <ActivityBar activeView={activeView} onViewChange={setActiveView} />

                {/* Sidebar - File Explorer */}
                {activeView === 'files' && (
                    <div className="w-64 border-r border-[#1E1E1E]">
                        <FileExplorer 
                            projectId={projectId || ''} 
                            files={project?.files || []} 
                            onRefresh={loadProject}
                        />
                    </div>
                )}

                {/* Main Editor Area */}
                <div className="flex-1 flex flex-col min-w-0">
                    {activeFile && projectId ? (
                        <>
                            {/* Breadcrumb */}
                            <Breadcrumb 
                                projectName={project?.name || 'Project'} 
                                filePath={activeFile} 
                            />

                            {/* Editor Tabs */}
                            <EditorTabs projectId={projectId} />

                            {/* Editor */}
                            <div className="flex-1 relative">
                                <Editor 
                                    projectId={projectId} 
                                    filePath={activeFile}
                                    onCursorChange={(line, column) => setCursorPosition({ line, column })}
                                />
                            </div>

                            {/* Status Bar */}
                            <StatusBar
                                cursorPosition={cursorPosition}
                                language={detectLanguage(activeFile)}
                                isConnected={isConnected}
                                activeUsers={users.length + 1}
                                lockStatus={{
                                    locked: lockInfo.locked,
                                    lockedBy: lockInfo.holder?.name,
                                }}
                            />
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-500">
                            <div className="text-center">
                                <div className="text-6xl mb-4">📝</div>
                                <p className="text-lg">Select a file to start editing</p>
                                <p className="text-sm text-gray-600 mt-2">or create a new file from the explorer</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* User Presence Sidebar */}
                <div className="w-64 border-l border-[#1E1E1E] bg-[#252526]">
                    <UserPresence />
                </div>
            </div>
        </div>
    );
}
