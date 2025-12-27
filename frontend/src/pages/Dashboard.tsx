import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Code2, Users, Clock, LogOut, UserPlus, Share2 } from 'lucide-react';
import InviteCodeModal from '../components/InviteCodeModal';

interface Project {
    _id: string;
    id: string;
    name: string;
    description: string;
    inviteCode?: string;
    ownerId: string;
    owner: {
        name: string;
        avatar: string;
    };
    collaborators: any[];
    updatedAt: string;
    _count: {
        files: number;
    };
}

export default function Dashboard() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState<{ projectId: string; projectName: string; inviteCode: string } | null>(null);
    const [newProject, setNewProject] = useState({ name: '', description: '' });
    const [joinCode, setJoinCode] = useState('');
    const [joinError, setJoinError] = useState('');
    const [joining, setJoining] = useState(false);
    const navigate = useNavigate();

    const user = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await axios.get('/api/projects', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProjects(response.data);
        } catch (error) {
            console.error('Failed to load projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const createProject = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('authToken');
            const response = await axios.post('/api/projects', newProject, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProjects([response.data, ...projects]);
            setShowCreateModal(false);
            setNewProject({ name: '', description: '' });
        } catch (error) {
            console.error('Failed to create project:', error);
        }
    };

    const joinProject = async (e: React.FormEvent) => {
        e.preventDefault();
        setJoining(true);
        setJoinError('');

        try {
            const token = localStorage.getItem('authToken');
            await axios.post('/api/projects/join', { inviteCode: joinCode }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowJoinModal(false);
            setJoinCode('');
            loadProjects(); // Reload to show new project
        } catch (error: any) {
            setJoinError(error.response?.data?.error || 'Failed to join project');
        } finally {
            setJoining(false);
        }
    };

    const handleShare = async (e: React.MouseEvent, project: Project) => {
        e.stopPropagation();
        
        // If we don't have the invite code, fetch the full project details
        if (!project.inviteCode) {
            try {
                const token = localStorage.getItem('authToken');
                const response = await axios.get(`/api/projects/${project._id || project.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                project.inviteCode = response.data.inviteCode;
            } catch (error) {
                console.error('Failed to fetch invite code:', error);
                return;
            }
        }

        setShowInviteModal({
            projectId: project._id || project.id,
            projectName: project.name,
            inviteCode: project.inviteCode || ''
        });
    };

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const isOwner = (project: Project) => {
        return project.ownerId === user.id || project.owner?.name === user.name;
    };

    return (
        <div className="min-h-screen bg-dark-bg">
            {/* Header */}
            <header className="bg-dark-elevated border-b border-dark-border">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Code2 size={32} className="text-blue-500" />
                        <div>
                            <h1 className="text-xl font-bold">CodeCollab</h1>
                            <p className="text-sm text-gray-400">Collaborative IDE</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            {user.avatar && (
                                <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
                            )}
                            <span className="text-sm">{user.name}</span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-2 hover:bg-dark-surface rounded-lg transition-colors"
                            title="Logout"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-3xl font-bold mb-2">Your Projects</h2>
                        <p className="text-gray-400">Create or join collaborative coding projects</p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowJoinModal(true)}
                            className="flex items-center gap-2 bg-dark-surface hover:bg-dark-border border border-dark-border px-6 py-3 rounded-lg font-medium transition-colors"
                        >
                            <UserPlus size={20} />
                            Join Project
                        </button>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-medium transition-colors"
                        >
                            <Plus size={20} />
                            New Project
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-16">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
                        <p className="mt-4 text-gray-400">Loading projects...</p>
                    </div>
                ) : projects.length === 0 ? (
                    <div className="text-center py-16 bg-dark-surface rounded-lg border border-dark-border">
                        <Code2 size={64} className="mx-auto mb-4 text-gray-600" />
                        <p className="text-xl font-semibold mb-2">No projects yet</p>
                        <p className="text-gray-400 mb-6">Create your first project or join an existing one</p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => setShowJoinModal(true)}
                                className="inline-flex items-center gap-2 bg-dark-surface hover:bg-dark-border border border-dark-border px-6 py-3 rounded-lg font-medium transition-colors"
                            >
                                <UserPlus size={20} />
                                Join Project
                            </button>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-medium transition-colors"
                            >
                                <Plus size={20} />
                                Create Project
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map((project) => (
                            <div
                                key={project._id || project.id}
                                className="bg-dark-surface border border-dark-border rounded-lg p-6 hover:border-blue-500 transition-colors group relative"
                            >
                                <div onClick={() => navigate(`/editor/${project._id || project.id}`)} className="cursor-pointer">
                                    <h3 className="text-xl font-semibold mb-2 group-hover:text-blue-500 transition-colors">
                                        {project.name}
                                    </h3>
                                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                                        {project.description || 'No description'}
                                    </p>

                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                        <div className="flex items-center gap-1">
                                            <Users size={16} />
                                            <span>{project.collaborators?.length || 0}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Code2 size={16} />
                                            <span>{project._count?.files || 0} files</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock size={16} />
                                            <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>

                                {isOwner(project) && (
                                    <button
                                        onClick={(e) => handleShare(e, project)}
                                        className="absolute top-4 right-4 p-2 bg-dark-bg hover:bg-blue-600 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        title="Share project"
                                    >
                                        <Share2 size={18} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Create Project Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-dark-elevated rounded-lg p-6 max-w-md w-full border border-dark-border">
                        <h3 className="text-2xl font-bold mb-4">Create New Project</h3>

                        <form onSubmit={createProject}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Project Name</label>
                                <input
                                    type="text"
                                    value={newProject.name}
                                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                                    className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="My Awesome Project"
                                    required
                                />
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2">Description (optional)</label>
                                <textarea
                                    value={newProject.description}
                                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                                    className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                                    placeholder="A brief description of your project..."
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-4 py-2 bg-dark-surface hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                                >
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Join Project Modal */}
            {showJoinModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-dark-elevated rounded-lg p-6 max-w-md w-full border border-dark-border">
                        <h3 className="text-2xl font-bold mb-4">Join Project</h3>
                        <p className="text-gray-400 text-sm mb-4">
                            Enter the invite code shared by the project owner
                        </p>

                        <form onSubmit={joinProject}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Invite Code</label>
                                <input
                                    type="text"
                                    value={joinCode}
                                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                    className="w-full px-4 py-3 bg-dark-surface border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-lg tracking-wider text-center"
                                    placeholder="XXXX-XXXX"
                                    maxLength={9}
                                    required
                                />
                            </div>

                            {joinError && (
                                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                                    <p className="text-red-400 text-sm">{joinError}</p>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowJoinModal(false);
                                        setJoinCode('');
                                        setJoinError('');
                                    }}
                                    className="flex-1 px-4 py-2 bg-dark-surface hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={joining}
                                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
                                >
                                    {joining ? 'Joining...' : 'Join'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Invite Code Modal */}
            {showInviteModal && (
                <InviteCodeModal
                    projectId={showInviteModal.projectId}
                    projectName={showInviteModal.projectName}
                    initialCode={showInviteModal.inviteCode}
                    isOwner={true}
                    onClose={() => setShowInviteModal(null)}
                />
            )}
        </div>
    );
}
