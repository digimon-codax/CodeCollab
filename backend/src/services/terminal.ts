import * as pty from 'node-pty';
import os from 'os';

interface TerminalSession {
    ptyProcess: pty.IPty;
    projectId: string;
    userId: string;
}

export class TerminalManager {
    private sessions: Map<string, TerminalSession> = new Map();

    createSession(projectId: string, userId: string): string {
        const sessionId = `${projectId}:${userId}`;

        // Check if session already exists
        if (this.sessions.has(sessionId)) {
            return sessionId;
        }

        // Determine shell based on OS
        const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

        // Create PTY process
        const ptyProcess = pty.spawn(shell, [], {
            name: 'xterm-color',
            cols: 100,
            rows: 30,
            cwd: process.env.WORKSPACE_DIR || process.cwd(),
            env: process.env as { [key: string]: string },
        });

        // Store session
        this.sessions.set(sessionId, {
            ptyProcess,
            projectId,
            userId,
        });

        console.log(`Terminal session created: ${sessionId}`);
        return sessionId;
    }

    getSession(sessionId: string): TerminalSession | undefined {
        return this.sessions.get(sessionId);
    }

    writeToSession(sessionId: string, data: string): boolean {
        const session = this.sessions.get(sessionId);
        if (!session) return false;

        session.ptyProcess.write(data);
        return true;
    }

    resizeSession(sessionId: string, cols: number, rows: number): boolean {
        const session = this.sessions.get(sessionId);
        if (!session) return false;

        session.ptyProcess.resize(cols, rows);
        return true;
    }

    destroySession(sessionId: string): boolean {
        const session = this.sessions.get(sessionId);
        if (!session) return false;

        session.ptyProcess.kill();
        this.sessions.delete(sessionId);

        console.log(`Terminal session destroyed: ${sessionId}`);
        return true;
    }

    // Cleanup all sessions for a project
    destroyProjectSessions(projectId: string): void {
        const sessionsToDestroy: string[] = [];

        this.sessions.forEach((session, sessionId) => {
            if (session.projectId === projectId) {
                sessionsToDestroy.push(sessionId);
            }
        });

        sessionsToDestroy.forEach(sessionId => this.destroySession(sessionId));
    }

    // Get all active sessions
    getActiveSessions(): number {
        return this.sessions.size;
    }
}

export const terminalManager = new TerminalManager();
