import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

interface UseSocketReturn {
    socket: Socket | null;
    isConnected: boolean;
}

export function useSocket(): UseSocketReturn {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('authToken');

        if (!token) {
            console.warn('No auth token found');
            return;
        }

        const newSocket = io('http://localhost:3000', {
            auth: { token },
            transports: ['websocket', 'polling'],
        });

        newSocket.on('connect', () => {
            console.log('✓ Socket connected');
            setIsConnected(true);
        });

        newSocket.on('disconnect', () => {
            console.log('✗ Socket disconnected');
            setIsConnected(false);
        });

        newSocket.on('error', (error: any) => {
            console.error('Socket error:', error);
        });

        newSocket.on('connect_error', (error) => {
            console.error('Connection error:', error.message);
        });

        setSocket(newSocket);

        return () => {
            newSocket.close();
        };
    }, []);

    return { socket, isConnected };
}
