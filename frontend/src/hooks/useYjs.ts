import { useEffect, useState, useRef } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

interface UseYjsReturn {
    ydoc: Y.Doc | null;
    ytext: Y.Text | null;
    isConnected: boolean;
    provider: WebsocketProvider | null;
}

export function useYjs(projectId: string, filePath: string): UseYjsReturn {
    const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
    const [ytext, setYtext] = useState<Y.Text | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const providerRef = useRef<WebsocketProvider | null>(null);

    useEffect(() => {
        if (!projectId || !filePath) return;

        const doc = new Y.Doc();
        const text = doc.getText('content');

        const roomName = `${projectId}:${filePath}`;

        // Connect to WebSocket provider
        const provider = new WebsocketProvider(
            'ws://localhost:3000',
            roomName,
            doc,
            {
                connect: true,
            }
        );

        provider.on('status', (event: { status: string }) => {
            console.log(`Yjs connection status: ${event.status}`);
            setIsConnected(event.status === 'connected');
        });

        provider.on('sync', (isSynced: boolean) => {
            console.log(`Yjs ${isSynced ? 'synced' : 'syncing'}...`);
        });

        providerRef.current = provider;
        setYdoc(doc);
        setYtext(text);

        return () => {
            provider.disconnect();
            provider.destroy();
            doc.destroy();
            providerRef.current = null;
        };
    }, [projectId, filePath]);

    return {
        ydoc,
        ytext,
        isConnected,
        provider: providerRef.current,
    };
}
