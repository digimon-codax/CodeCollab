import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Code2 } from 'lucide-react';

export default function Login() {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await axios.post('/api/auth/github/callback', { code });

            localStorage.setItem('authToken', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));

            navigate('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-dark-bg via-dark-surface to-dark-bg flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <Code2 size={64} className="text-blue-500" />
                    </div>
                    <h1 className="text-4xl font-bold mb-2">CodeCollab</h1>
                    <p className="text-gray-400">Real-time collaborative code editor</p>
                </div>

                <div className="bg-dark-elevated  p-8 rounded-lg border border-dark-border">
                    <form onSubmit={handleLogin}>
                        <div className="mb-6">
                            <label className="block text-sm font-medium mb-2">
                                Github Auth Code (Dev Mode)
                            </label>
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                className="w-full px-4 py-3 bg-dark-surface border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter any code for development"
                                required
                            />
                            <p className="mt-2 text-xs text-gray-500">
                                For development: Enter any text like "testuser"
                            </p>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                                <p className="text-red-400 text-sm">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !code}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors"
                        >
                            {loading ? 'Authenticating...' : 'Sign in'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-500">
                            Features: Real-time editing • File locking • Live presence
                        </p>
                    </div>
                </div>

                <div className="mt-8 text-center text-sm text-gray-500">
                    <p>Production: GitHub OAuth integration required</p>
                    <p className="mt-1">Built with React, Node.js, Socket.IO, Yjs</p>
                </div>
            </div>
        </div>
    );
}
