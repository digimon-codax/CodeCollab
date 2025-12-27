import { ChevronRight } from 'lucide-react';

interface BreadcrumbProps {
    projectName: string;
    filePath: string;
}

export default function Breadcrumb({ projectName, filePath }: BreadcrumbProps) {
    const parts = filePath.split('/').filter(Boolean);
    
    return (
        <div className="bg-[#252526] border-b border-[#1E1E1E] px-4 py-1.5 flex items-center gap-1 text-sm text-gray-400">
            {/* Project name */}
            <span className="hover:text-white cursor-pointer transition-colors">
                {projectName}
            </span>

            {/* Path segments */}
            {parts.map((part, index) => {
                const isLast = index === parts.length - 1;
                
                return (
                    <div key={index} className="flex items-center gap-1">
                        <ChevronRight size={14} className="text-gray-600" />
                        <span 
                            className={`
                                transition-colors
                                ${isLast 
                                    ? 'text-white font-medium' 
                                    : 'hover:text-white cursor-pointer'
                                }
                            `}
                        >
                            {part}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
