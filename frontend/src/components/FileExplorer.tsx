import { useState } from 'react';
import { File, Folder, ChevronRight, ChevronDown } from 'lucide-react';
import { useEditorStore } from '../stores/editorStore';

interface FileItem {
    id: string;
    path: string;
    language: string;
}

interface FileExplorerProps {
    projectId: string;
    files: FileItem[];
}

export default function FileExplorer({ projectId, files }: FileExplorerProps) {
    const { activeFile, setActiveFile } = useEditorStore();
    const [expanded, setExpanded] = useState<Set<string>>(new Set(['/']));

    const toggleDirectory = (dir: string) => {
        const newExpanded = new Set(expanded);
        if (newExpanded.has(dir)) {
            newExpanded.delete(dir);
        } else {
            newExpanded.add(dir);
        }
        setExpanded(newExpanded);
    };

    // Build file tree structure
    const fileTree = buildFileTree(files);

    function renderTree(items: any[], depth = 0) {
        return items.map((item) => {
            if (item.type === 'directory') {
                const isExpanded = expanded.has(item.path);
                return (
                    <div key={item.path}>
                        <div
                            onClick={() => toggleDirectory(item.path)}
                            className="file-tree-item flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm"
                            style={{ paddingLeft: `${depth * 12 + 12}px` }}
                        >
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            <Folder size={16} className="text-blue-400" />
                            <span>{item.name}</span>
                        </div>
                        {isExpanded && item.children && (
                            <div>{renderTree(item.children, depth + 1)}</div>
                        )}
                    </div>
                );
            } else {
                const isActive = activeFile === item.path;
                return (
                    <div
                        key={item.path}
                        onClick={() => setActiveFile(item.path)}
                        className={`file-tree-item flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm ${isActive ? 'bg-blue-600/20 text-blue-400' : ''
                            }`}
                        style={{ paddingLeft: `${depth * 12 + 28}px` }}
                    >
                        <File size={16} />
                        <span>{item.name}</span>
                    </div>
                );
            }
        });
    }

    return (
        <div className="h-full flex flex-col">
            <div className="px-4 py-3 border-b border-dark-border">
                <h3 className="font-semibold text-sm">FILES</h3>
            </div>

            <div className="flex-1 overflow-y-auto">
                {files.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                        No files yet
                    </div>
                ) : (
                    renderTree(fileTree)
                )}
            </div>
        </div>
    );
}

function buildFileTree(files: FileItem[]) {
    const root: any[] = [];
    const directories = new Map<string, any>();

    files.forEach((file) => {
        const parts = file.path.split('/').filter(Boolean);
        const fileName = parts[parts.length - 1];

        if (parts.length === 1) {
            // Root level file
            root.push({
                type: 'file',
                name: fileName,
                path: file.path,
                language: file.language,
            });
        } else {
            // Nested file - build directory structure
            let currentPath = '';
            let currentLevel = root;

            for (let i = 0; i < parts.length - 1; i++) {
                currentPath += '/' + parts[i];

                let dir = directories.get(currentPath);

                if (!dir) {
                    dir = {
                        type: 'directory',
                        name: parts[i],
                        path: currentPath,
                        children: [],
                    };
                    directories.set(currentPath, dir);
                    currentLevel.push(dir);
                }

                currentLevel = dir.children;
            }

            // Add file to final directory
            currentLevel.push({
                type: 'file',
                name: fileName,
                path: file.path,
                language: file.language,
            });
        }
    });

    return root;
}
