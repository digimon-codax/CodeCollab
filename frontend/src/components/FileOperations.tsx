import { useState } from 'react';
import { FilePlus, FolderPlus, Upload, Save, Trash2 } from 'lucide-react';
import axios from 'axios';

interface FileOperationsProps {
    projectId: string;
    currentFile?: string;
    onFileCreated?: () => void;
}

export default function FileOperations({ projectId, currentFile, onFileCreated }: FileOperationsProps) {
    const [showNewFileModal, setShowNewFileModal] = useState(false);
    const [showNewFolderModal, setShowNewFolderModal] = useState(false);
    const [newFileName, setNewFileName] = useState('');
    const [newFolderName, setNewFolderName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const handleCreateFile = async () => {
        if (!newFileName.trim()) return;

        setIsCreating(true);
        try {
            const token = localStorage.getItem('authToken');
            const filePath = newFileName.startsWith('/') ? newFileName : `/${newFileName}`;
            
            await axios.post(
                `/api/projects/${projectId}/files`,
                {
                    path: filePath,
                    content: '',
                    language: detectLanguage(filePath),
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            setNewFileName('');
            setShowNewFileModal(false);
            onFileCreated?.();
        } catch (error: any) {
            console.error('Failed to create file:', error);
            alert(error.response?.data?.error || 'Failed to create file');
        } finally {
            setIsCreating(false);
        }
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;

        setIsCreating(true);
        try {
            const token = localStorage.getItem('authToken');
            const folderPath = newFolderName.startsWith('/') ? newFolderName : `/${newFolderName}`;
            
            await axios.post(
                `/api/projects/${projectId}/folders`,
                {
                    path: folderPath,
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            setNewFolderName('');
            setShowNewFolderModal(false);
            onFileCreated?.();
        } catch (error: any) {
            console.error('Failed to create folder:', error);
            alert(error.response?.data?.error || 'Failed to create folder');
        } finally {
            setIsCreating(false);
        }
    };

    const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const token = localStorage.getItem('authToken');
            const content = await file.text();
            const filePath = `/${file.name}`;

            await axios.post(
                `/api/projects/${projectId}/files`,
                {
                    path: filePath,
                    content,
                    language: detectLanguage(filePath),
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            onFileCreated?.();
        } catch (error: any) {
            console.error('Failed to upload file:', error);
            alert(error.response?.data?.error || 'Failed to upload file');
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
        <>
            <div className="border-b border-[#1E1E1E] p-2 flex items-center gap-1 bg-[#252526]">
                <button
                    onClick={() => setShowNewFileModal(true)}
                    className="p-1.5 hover:bg-[#2A2A2A] rounded transition-colors"
                    title="New File"
                >
                    <FilePlus size={16} />
                </button>

                <button
                    onClick={() => setShowNewFolderModal(true)}
                    className="p-1.5 hover:bg-[#2A2A2A] rounded transition-colors"
                    title="New Folder"
                >
                    <FolderPlus size={16} />
                </button>

                <label className="p-1.5 hover:bg-[#2A2A2A] rounded transition-colors cursor-pointer" title="Upload File">
                    <Upload size={16} />
                    <input
                        type="file"
                        className="hidden"
                        onChange={handleUploadFile}
                    />
                </label>

                <button
                    className="p-1.5 hover:bg-[#2A2A2A] rounded transition-colors opacity-50 cursor-not-allowed"
                    title="Save (Ctrl+S)"
                    disabled
                >
                    <Save size={16} />
                </button>

                <button
                    className="p-1.5 hover:bg-[#2A2A2A] rounded transition-colors opacity-50 cursor-not-allowed"
                    title="Delete File"
                    disabled
                >
                    <Trash2 size={16} />
                </button>
            </div>

            {/* New File Modal */}
            {showNewFileModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-[#252526] rounded-lg p-6 w-96 border border-[#1E1E1E]">
                        <h3 className="text-lg font-semibold mb-4">Create New File</h3>
                        <input
                            type="text"
                            value={newFileName}
                            onChange={(e) => setNewFileName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateFile()}
                            placeholder="e.g., /src/index.js"
                            className="w-full px-3 py-2 bg-[#1E1E1E] border border-[#3E3E42] rounded focus:outline-none focus:border-blue-500"
                            autoFocus
                        />
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                onClick={() => {
                                    setShowNewFileModal(false);
                                    setNewFileName('');
                                }}
                                className="px-4 py-2 rounded hover:bg-[#2A2A2A] transition-colors"
                                disabled={isCreating}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateFile}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors disabled:opacity-50"
                                disabled={!newFileName.trim() || isCreating}
                            >
                                {isCreating ? 'Creating...' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* New Folder Modal */}
            {showNewFolderModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-[#252526] rounded-lg p-6 w-96 border border-[#1E1E1E]">
                        <h3 className="text-lg font-semibold mb-4">Create New Folder</h3>
                        <input
                            type="text"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                            placeholder="e.g., /src/components"
                            className="w-full px-3 py-2 bg-[#1E1E1E] border border-[#3E3E42] rounded focus:outline-none focus:border-blue-500"
                            autoFocus
                        />
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                onClick={() => {
                                    setShowNewFolderModal(false);
                                    setNewFolderName('');
                                }}
                                className="px-4 py-2 rounded hover:bg-[#2A2A2A] transition-colors"
                                disabled={isCreating}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateFolder}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors disabled:opacity-50"
                                disabled={!newFolderName.trim() || isCreating}
                            >
                                {isCreating ? 'Creating...' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
