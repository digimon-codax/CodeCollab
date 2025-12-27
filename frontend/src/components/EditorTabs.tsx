import { X } from 'lucide-react';
import { useEditorStore } from '../stores/editorStore';

interface EditorTabsProps {
    projectId: string;
}

export default function EditorTabs({ projectId }: EditorTabsProps) {
    const openTabs = useEditorStore((state) => state.openTabs);
    const activeFile = useEditorStore((state) => state.activeFile);
    const setActiveFile = useEditorStore((state) => state.setActiveFile);
    const removeTab = useEditorStore((state) => state.removeTab);

    const handleCloseTab = (filePath: string, e: React.MouseEvent) => {
        e.stopPropagation();
        removeTab(filePath);
    };

    const getFileName = (path: string) => {
        return path.split('/').pop() || path;
    };

    const getFileIcon = (path: string) => {
        const ext = path.split('.').pop()?.toLowerCase();
        const colors: Record<string, string> = {
            js: 'text-yellow-400',
            jsx: 'text-blue-400',
            ts: 'text-blue-500',
            tsx: 'text-blue-500',
            py: 'text-blue-300',
            java: 'text-red-400',
            go: 'text-cyan-400',
            rs: 'text-orange-400',
            css: 'text-blue-400',
            html: 'text-orange-500',
            json: 'text-yellow-500',
            md: 'text-gray-400',
        };
        return colors[ext || ''] || 'text-gray-400';
    };

    if (openTabs.length === 0) {
        return null;
    }

    return (
        <div className="bg-[#252526] border-b border-[#1E1E1E] flex items-center overflow-x-auto">
            {openTabs.map((tab) => {
                const isActive = activeFile === tab.path;
                
                return (
                    <div
                        key={tab.path}
                        onClick={() => setActiveFile(tab.path)}
                        className={`
                            flex items-center gap-2 px-3 py-2 cursor-pointer
                            border-r border-[#1E1E1E] min-w-[120px] max-w-[200px]
                            transition-colors group relative
                            ${isActive 
                                ? 'bg-[#1E1E1E] text-white' 
                                : 'bg-[#2D2D2D] text-gray-400 hover:bg-[#2A2A2A]'
                            }
                        `}
                    >
                        {/* File icon */}
                        <span className={`text-sm ${getFileIcon(tab.path)}`}>●</span>
                        
                        {/* File name */}
                        <span className="text-sm truncate flex-1">
                            {getFileName(tab.path)}
                        </span>

                        {/* Close button */}
                        <button
                            onClick={(e) => handleCloseTab(tab.path, e)}
                            className="opacity-0 group-hover:opacity-100 hover:bg-gray-600 rounded p-0.5 transition-opacity"
                        >
                            <X size={14} />
                        </button>

                        {/* Active indicator */}
                        {isActive && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
