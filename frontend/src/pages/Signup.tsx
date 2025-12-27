import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Code2, User, Mail, Lock, ArrowRight } from 'lucide-react';

export default function Signup() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await axios.post('/api/auth/signup', {
                name,
                email,
                password,
            });

            localStorage.setItem('authToken', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));

            navigate('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to create account');
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
                    <h1 className="text-3xl font-bold mb-2">Create Account</h1>
                    <p className="text-gray-400">Join CodeCollab today</p>
                </div>

                <div className="bg-dark-elevated p-8 rounded-lg border border-dark-border shadow-xl">
                    <form onSubmit={handleSignup} className="space-y-5">
                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                                <p className="text-red-400 text-sm flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                    {error}
                                </p>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-gray-300">
                                    Full Name
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-dark-surface border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-white placeholder-gray-500"
                                        placeholder="John Doe"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-gray-300">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-dark-surface border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-white placeholder-gray-500"
                                        placeholder="you@example.com"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-gray-300">
                                    Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-dark-surface border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-white placeholder-gray-500"
                                        placeholder="••••••••"
                                        minLength={6}
                                        required
                                    />
                                </div>
                                <p className="mt-1 text-xs text-gray-500">Must be at least 6 characters</p>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 group mt-2"
                        >
                            {loading ? (
                                'Creating Account...'
                            ) : (
                                <>
                                    Sign Up
                                    <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-500">
                            Already have an account?{' '}
                            <Link to="/" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
