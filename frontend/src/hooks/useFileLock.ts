import { useState, useEffect } from 'react';
import { useSocket } from './useSocket';

export interface FileLockInfo {
    locked: boolean;
    holder: {
        id: string;
        name: string;
    } | null;
    expiresAt: number | null;
    isOwnedByCurrentUser: boolean;
}

export function useFileLock(projectId: string, filePath: string) {
    const { socket, isConnected } = useSocket();
    const [lockInfo, setLockInfo] = useState<FileLockInfo>({
        locked: false,
        holder: null,
        expiresAt: null,
        isOwnedByCurrentUser: false,
    });

    useEffect(() => {
        if (!socket || !isConnected) return;

        // Listen for lock events
        socket.on('lock:acquired', (data: any) => {
            if (data.filePath === filePath) {
                setLockInfo({
                    locked: true,
                    holder: {
                        id: data.userId,
                        name: data.userName,
                    },
                    expiresAt: data.expiresAt,
                    isOwnedByCurrentUser: data.userId === getCurrentUserId(),
                });
            }
        });

        socket.on('lock:released', (data: any) => {
            if (data.filePath === filePath) {
                setLockInfo({
                    locked: false,
                    holder: null,
                    expiresAt: null,
                    isOwnedByCurrentUser: false,
                });
            }
        });

        socket.on('lock:failed', (data: any) => {
            if (data.filePath === filePath && data.holder) {
                setLockInfo({
                    locked: true,
                    holder: {
                        id: data.holder.id,
                        name: data.holder.name,
                    },
                    expiresAt: data.holder.expiresAt,
                    isOwnedByCurrentUser: false,
                });
            }
        });

        return () => {
            socket.off('lock:acquired');
            socket.off('lock:released');
            socket.off('lock:failed');
        };
    }, [socket, isConnected, filePath]);

    const acquireLock = () => {
        if (socket && projectId && filePath) {
            socket.emit('file:lock', { projectId, filePath });
        }
    };

    const releaseLock = () => {
        if (socket && projectId && filePath) {
            socket.emit('file:unlock', { projectId, filePath });
        }
    };

    const refreshLock = () => {
        if (socket && projectId && filePath) {
            socket.emit('lock:refresh', { projectId, filePath });
        }
    };

    return {
        lockInfo,
        acquireLock,
        releaseLock,
        refreshLock,
    };
}

function getCurrentUserId(): string {
    // Get from localStorage or state
    const user = localStorage.getItem('user');
    if (user) {
        return JSON.parse(user).id;
    }
    return '';
}
