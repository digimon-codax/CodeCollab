import { Files, Search, GitBranch, Settings, Code2 } from 'lucide-react';

interface ActivityBarProps {
    activeView: 'files' | 'search' | 'git' | 'settings';
    onViewChange: (view: 'files' | 'search' | 'git' | 'settings') => void;
}

export default function ActivityBar({ activeView, onViewChange }: ActivityBarProps) {
    const items = [
        { id: 'files' as const, icon: Files, label: 'Explorer' },
        { id: 'search' as const, icon: Search, label: 'Search' },
        { id: 'git' as const, icon: GitBranch, label: 'Source Control' },
        { id: 'settings' as const, icon: Settings, label: 'Settings' },
    ];

    return (
        <div className="w-12 bg-[#333333] flex flex-col items-center py-2 border-r border-[#1E1E1E]">
            {/* Logo */}
            <div className="mb-4 p-2">
                <Code2 size={28} className="text-blue-500" />
            </div>

            {/* Activity Items */}
            <div className="flex-1 flex flex-col gap-1">
                {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeView === item.id;
                    
                    return (
                        <button
                            key={item.id}
                            onClick={() => onViewChange(item.id)}
                            className={`
                                p-3 relative group transition-colors
                                ${isActive 
                                    ? 'text-white' 
                                    : 'text-gray-400 hover:text-white'
                                }
                            `}
                            title={item.label}
                        >
                            <Icon size={24} />
                            
                            {/* Active indicator */}
                            {isActive && (
                                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-white" />
                            )}

                            {/* Tooltip */}
                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                                {item.label}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
