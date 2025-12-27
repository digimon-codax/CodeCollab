import { useState, useEffect } from 'react';
import { useSocket } from './useSocket';
import { useEditorStore } from '../stores/editorStore';

export interface RemoteCursor {
    userId: string;
    userName: string;
    color: string;
    line: number;
    column: number;
}

export function useCursor(projectId: string, filePath: string) {
    const { socket, isConnected } = useSocket();
    const { users, updateUser } = useEditorStore();
    const [remoteCursors, setRemoteCursors] = useState<RemoteCursor[]>([]);

    useEffect(() => {
        if (!socket || !isConnected) return;

        // Listen for cursor updates
        socket.on('presence:update', (data: any) => {
            if (data.fileName === filePath) {
                // Update store
                updateUser(data.userId, {
                    cursorLine: data.cursorLine,
                    cursorColumn: data.cursorColumn,
                    fileName: data.fileName,
                });

                // Update local cursor list
                setRemoteCursors((prev) => {
                    const existing = prev.findIndex(c => c.userId === data.userId);
                    const cursor: RemoteCursor = {
                        userId: data.userId,
                        userName: data.userName,
                        color: data.color,
                        line: data.cursorLine,
                        column: data.cursorColumn,
                    };

                    if (existing >= 0) {
                        const updated = [...prev];
                        updated[existing] = cursor;
                        return updated;
                    }
                    return [...prev, cursor];
                });
            }
        });

        socket.on('user:left', (data: { userId: string }) => {
            setRemoteCursors((prev) => prev.filter(c => c.userId !== data.userId));
        });

        return () => {
            socket.off('presence:update');
            socket.off('user:left');
        };
    }, [socket, isConnected, filePath, updateUser]);

    // Send local cursor position
    const updateCursor = (line: number, column: number) => {
        if (socket && isConnected) {
            socket.emit('presence:update', {
                fileName: filePath,
                cursorLine: line,
                cursorColumn: column,
            });
        }
    };

    return {
        remoteCursors,
        updateCursor,
    };
}
