import { create } from 'zustand';

export interface User {
    userId: string;
    userName: string;
    userAvatar: string | null;
    color: string;
    cursorLine: number;
    cursorColumn: number;
    fileName: string;
    isTyping: boolean;
}

export interface FileTab {
    path: string;
    language: string;
    isLocked: boolean;
    lockedBy?: string;
}

interface EditorState {
    activeFile: string | null;
    setActiveFile: (path: string | null) => void;

    openTabs: FileTab[];
    addTab: (tab: FileTab) => void;
    removeTab: (path: string) => void;
    updateTab: (path: string, updates: Partial<FileTab>) => void;

    users: User[];
    addUser: (user: User) => void;
    removeUser: (userId: string) => void;
    updateUser: (userId: string, updates: Partial<User>) => void;

    projectId: string | null;
    setProjectId: (id: string) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
    activeFile: null,
    setActiveFile: (path) => set({ activeFile: path }),

    openTabs: [],
    addTab: (tab) => set((state) => {
        const exists = state.openTabs.some(t => t.path === tab.path);
        if (exists) return state;
        return { openTabs: [...state.openTabs, tab] };
    }),
    removeTab: (path) => set((state) => ({
        openTabs: state.openTabs.filter(t => t.path !== path),
        activeFile: state.activeFile === path ? null : state.activeFile,
    })),
    updateTab: (path, updates) => set((state) => ({
        openTabs: state.openTabs.map(t =>
            t.path === path ? { ...t, ...updates } : t
        ),
    })),

    users: [],
    addUser: (user) => set((state) => {
        const exists = state.users.some(u => u.userId === user.userId);
        if (exists) return state;
        return { users: [...state.users, user] };
    }),
    removeUser: (userId) => set((state) => ({
        users: state.users.filter(u => u.userId !== userId),
    })),
    updateUser: (userId, updates) => set((state) => ({
        users: state.users.map(u =>
            u.userId === userId ? { ...u, ...updates } : u
        ),
    })),

    projectId: null,
    setProjectId: (id) => set({ projectId: id }),
}));
