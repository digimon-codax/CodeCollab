import { useEffect, useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import { Users } from 'lucide-react';

interface User {
    userId: string;
    userName: string;
    userAvatar: string | null;
    fileName: string;
    cursorLine: number;
    color: string;
    isTyping: boolean;
}

export default function UserPresence() {
    const { socket, isConnected } = useSocket();
    const [users, setUsers] = useState<User[]>([]);

    useEffect(() => {
        if (!socket || !isConnected) return;

        socket.on('presence:list', (presenceList: User[]) => {
            setUsers(presenceList);
        });

        socket.on('presence:update', (user: User) => {
            setUsers((prev) => {
                const existing = prev.findIndex((u) => u.userId === user.userId);
                if (existing >= 0) {
                    const updated = [...prev];
                    updated[existing] = user;
                    return updated;
                }
                return [...prev, user];
            });
        });

        socket.on('user:joined', (data: { userId: string; userName: string }) => {
            console.log(`${data.userName} joined`);
        });

        socket.on('user:left', (data: { userId: string; userName: string }) => {
            console.log(`${data.userName} left`);
            setUsers((prev) => prev.filter((u) => u.userId !== data.userId));
        });

        socket.on('user:typing', (data: { userId: string; userName: string; fileName: string; isTyping: boolean }) => {
            setUsers((prev) =>
                prev.map((u) =>
                    u.userId === data.userId
                        ? { ...u, fileName: data.fileName, isTyping: data.isTyping }
                        : u
                )
            );
        });

        return () => {
            socket.off('presence:list');
            socket.off('presence:update');
            socket.off('user:joined');
            socket.off('user:left');
            socket.off('user:typing');
        };
    }, [socket, isConnected]);

    return (
        <div className="h-full flex flex-col">
            <div className="px-4 py-3 border-b border-dark-border">
                <div className="flex items-center gap-2">
                    <Users size={16} />
                    <h3 className="font-semibold text-sm">ACTIVE USERS ({users.length})</h3>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {users.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center">No active users</p>
                ) : (
                    <div className="space-y-3">
                        {users.map((user) => (
                            <div key={user.userId} className="flex items-start gap-3">
                                {user.userAvatar ? (
                                    <img
                                        src={user.userAvatar}
                                        alt={user.userName}
                                        className="w-8 h-8 rounded-full"
                                    />
                                ) : (
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                                        style={{ backgroundColor: user.color }}
                                    >
                                        {user.userName.charAt(0).toUpperCase()}
                                    </div>
                                )}

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium truncate">{user.userName}</p>
                                        <div
                                            className="w-2 h-2 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: user.color }}
                                        />
                                    </div>

                                    {user.fileName && (
                                        <p className="text-xs text-gray-400 truncate">
                                            {user.fileName}
                                            {user.cursorLine > 0 && ` • Line ${user.cursorLine}`}
                                        </p>
                                    )}

                                    {user.isTyping && (
                                        <div className="flex items-center gap-1 mt-1">
                                            <span className="text-xs text-gray-500">typing</span>
                                            <div className="flex gap-1">
                                                <div className="w-1 h-1 bg-gray-500 rounded-full typing-dot" />
                                                <div className="w-1 h-1 bg-gray-500 rounded-full typing-dot" />
                                                <div className="w-1 h-1 bg-gray-500 rounded-full typing-dot" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
