import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { useSocket } from '../hooks/useSocket';
import 'xterm/css/xterm.css';

interface TerminalProps {
    projectId: string;
}

export default function Terminal({ projectId }: TerminalProps) {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<XTerm | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const { socket, isConnected } = useSocket();

    useEffect(() => {
        if (!terminalRef.current) return;

        // Create terminal instance
        const term = new XTerm({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: 'Fira Code, Monaco, Courier New, monospace',
            theme: {
                background: '#1E1E1E',
                foreground: '#D4D4D4',
                cursor: '#FFFFFF',
                black: '#000000',
                red: '#CD3131',
                green: '#0DBC79',
                yellow: '#E5E510',
                blue: '#2472C8',
                magenta: '#BC3FBC',
                cyan: '#11A8CD',
                white: '#E5E5E5',
                brightBlack: '#666666',
                brightRed: '#F14C4C',
                brightGreen: '#23D18B',
                brightYellow: '#F5F543',
                brightBlue: '#3B8EEA',
                brightMagenta: '#D670D6',
                brightCyan: '#29B8DB',
                brightWhite: '#E5E5E5',
            },
            rows: 30,
            cols: 100,
        });

        // Add fit addon for responsive sizing
        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        // Add web links addon
        term.loadAddon(new WebLinksAddon());

        // Open terminal in DOM
        term.open(terminalRef.current);
        fitAddon.fit();

        xtermRef.current = term;
        fitAddonRef.current = fitAddon;

        // Welcome message
        term.writeln('\x1b[1;32mCodeCollab Terminal\x1b[0m');
        term.writeln('Connected to project workspace');
        term.writeln('');

        // Handle window resize
        const handleResize = () => {
            fitAddon.fit();
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            term.dispose();
        };
    }, []);

    useEffect(() => {
        if (!socket || !isConnected || !xtermRef.current) return;

        const term = xtermRef.current;

        // Request terminal session
        socket.emit('terminal:start', { projectId });

        // Handle terminal output from server
        socket.on('terminal:data', (data: string) => {
            term.write(data);
        });

        // Send terminal input to server
        term.onData((data) => {
            socket.emit('terminal:input', { projectId, data });
        });

        // Handle terminal resize
        term.onResize(({ cols, rows }) => {
            socket.emit('terminal:resize', { projectId, cols, rows });
        });

        return () => {
            socket.off('terminal:data');
            socket.emit('terminal:stop', { projectId });
        };
    }, [socket, isConnected, projectId]);

    return (
        <div className="h-full flex flex-col bg-dark-bg">
            <div className="px-4 py-2 border-b border-dark-border bg-dark-surface flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">TERMINAL</span>
                    {isConnected ? (
                        <span className="text-xs text-green-500">● Connected</span>
                    ) : (
                        <span className="text-xs text-red-500">● Disconnected</span>
                    )}
                </div>
            </div>
            <div ref={terminalRef} className="flex-1 p-2" />
        </div>
    );
}
