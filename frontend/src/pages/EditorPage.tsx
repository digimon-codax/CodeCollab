import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Code2, Users, ArrowLeft } from 'lucide-react';
import Editor from '../components/Editor';
import FileExplorer from '../components/FileExplorer';
import UserPresence from '../components/UserPresence';
import { useSocket } from '../hooks/useSocket';
import { useEditorStore } from '../stores/editorStore';

export default function EditorPage() {
    const { projectId } = useParams<{ projectId: string }>();
    const { socket, isConnected } = useSocket();
    const [project, setProject] = useState<any>(null);
    const { activeFile, setActiveFile, setProjectId } = useEditorStore();
    const navigate = useNavigate();

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
                setActiveFile(response.data.files[0].path);
            }
        } catch (error) {
            console.error('Failed to load project:', error);
        }
    };

    return (
        <div className="h-screen flex flex-col bg-dark-bg">
            {/* Header */}
            <header className="bg-dark-elevated border-b border-dark-border flex items-center justify-between px-4 py-2">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="p-2 hover:bg-dark-surface rounded-lg transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>

                    <div className="flex items-center gap-2">
                        <Code2 size={24} className="text-blue-500" />
                        <div>
                            <h1 className="font-semibold">{project?.name || 'Loading...'}</h1>
                            {project && (
                                <p className="text-xs text-gray-400">{project.description}</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-sm text-gray-400">
                            {isConnected ? 'Connected' : 'Disconnected'}
                        </span>
                    </div>
                </div>
            </header>

            {/* Main Editor Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* File Explorer */}
                <div className="w-64 border-r border-dark-border bg-dark-surface">
                    <FileExplorer projectId={projectId || ''} files={project?.files || []} />
                </div>

                {/* Editor  */}
                <div className="flex-1 flex flex-col">
                    {activeFile && projectId ? (
                        <Editor projectId={projectId} filePath={activeFile} />
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-500">
                            <div className="text-center">
                                <Code2 size={64} className="mx-auto mb-4 opacity-50" />
                                <p className="text-lg">Select a file to start editing</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* User Presence Sidebar */}
                <div className="w-64 border-l border-dark-border bg-dark-surface">
                    <UserPresence />
                </div>
            </div>
        </div>
    );
}
