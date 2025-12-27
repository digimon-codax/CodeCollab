import { useState } from 'react';
import { X, Copy, Check, RefreshCw } from 'lucide-react';
import axios from 'axios';

interface InviteCodeModalProps {
    projectId: string;
    projectName: string;
    initialCode?: string;
    isOwner: boolean;
    onClose: () => void;
}

export default function InviteCodeModal({ projectId, projectName, initialCode, isOwner, onClose }: InviteCodeModalProps) {
    const [inviteCode, setInviteCode] = useState(initialCode || '');
    const [copied, setCopied] = useState(false);
    const [regenerating, setRegenerating] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(inviteCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleRegenerate = async () => {
        if (!isOwner) return;
        
        setRegenerating(true);
        try {
            const response = await axios.post(`/api/projects/${projectId}/invite-code/regenerate`);
            setInviteCode(response.data.inviteCode);
        } catch (error: any) {
            console.error('Failed to regenerate code:', error);
            alert(error.response?.data?.error || 'Failed to regenerate invite code');
        } finally {
            setRegenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-dark-elevated rounded-lg border border-dark-border max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">Invite to {projectName}</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <p className="text-gray-400 text-sm mb-4">
                    Share this code with collaborators to let them join your project.
                </p>

                <div className="bg-dark-surface border border-dark-border rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                        <code className="text-2xl font-mono font-bold text-blue-400 tracking-wider">
                            {inviteCode || 'Loading...'}
                        </code>
                        <button
                            onClick={handleCopy}
                            className="ml-4 p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                            title="Copy to clipboard"
                        >
                            {copied ? <Check size={20} /> : <Copy size={20} />}
                        </button>
                    </div>
                </div>

                {isOwner && (
                    <button
                        onClick={handleRegenerate}
                        disabled={regenerating}
                        className="w-full flex items-center justify-center gap-2 bg-dark-surface hover:bg-dark-border border border-dark-border text-gray-300 py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={regenerating ? 'animate-spin' : ''} />
                        {regenerating ? 'Regenerating...' : 'Regenerate Code'}
                    </button>
                )}

                <p className="text-xs text-gray-500 mt-4 text-center">
                    Anyone with this code can join as an editor
                </p>
            </div>
        </div>
    );
}
