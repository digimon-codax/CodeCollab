import { Lock, Users, Wifi, WifiOff } from 'lucide-react';

interface StatusBarProps {
    cursorPosition?: { line: number; column: number };
    language?: string;
    isConnected: boolean;
    activeUsers: number;
    lockStatus?: {
        locked: boolean;
        lockedBy?: string;
    };
}

export default function StatusBar({
    cursorPosition,
    language = 'plaintext',
    isConnected,
    activeUsers,
    lockStatus,
}: StatusBarProps) {
    return (
        <div className="bg-[#007ACC] text-white px-4 py-1 flex items-center justify-between text-xs">
            {/* Left side */}
            <div className="flex items-center gap-4">
                {/* Connection status */}
                <div className="flex items-center gap-1.5">
                    {isConnected ? (
                        <>
                            <Wifi size={14} />
                            <span>Connected</span>
                        </>
                    ) : (
                        <>
                            <WifiOff size={14} />
                            <span>Disconnected</span>
                        </>
                    )}
                </div>

                {/* Active users */}
                <div className="flex items-center gap-1.5">
                    <Users size={14} />
                    <span>{activeUsers} active</span>
                </div>

                {/* Lock status */}
                {lockStatus?.locked && (
                    <div className="flex items-center gap-1.5">
                        <Lock size={14} />
                        <span>
                            {lockStatus.lockedBy 
                                ? `Locked by ${lockStatus.lockedBy}` 
                                : 'Locked'
                            }
                        </span>
                    </div>
                )}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-4">
                {/* Cursor position */}
                {cursorPosition && (
                    <span>
                        Ln {cursorPosition.line}, Col {cursorPosition.column}
                    </span>
                )}

                {/* Language */}
                <span className="uppercase">{language}</span>

                {/* Encoding */}
                <span>UTF-8</span>

                {/* Line ending */}
                <span>LF</span>
            </div>
        </div>
    );
}
