import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Code2, Users, Clock, LogOut } from 'lucide-react';

interface Project {
    id: string;
    name: string;
    description: string;
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
    const [newProject, setNewProject] = useState({ name: '', description: '' });
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

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        navigate('/login');
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

                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                        <Plus size={20} />
                        New Project
                    </button>
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
                        <p className="text-gray-400 mb-6">Create your first project to get started</p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-medium transition-colors"
                        >
                            <Plus size={20} />
                            Create Project
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map((project) => (
                            <div
                                key={project.id}
                                onClick={() => navigate(`/editor/${project.id}`)}
                                className="bg-dark-surface border border-dark-border rounded-lg p-6 hover:border-blue-500 cursor-pointer transition-colors group"
                            >
                                <h3 className="text-xl font-semibold mb-2 group-hover:text-blue-500 transition-colors">
                                    {project.name}
                                </h3>
                                <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                                    {project.description || 'No description'}
                                </p>

                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                    <div className="flex items-center gap-1">
                                        <Users size={16} />
                                        <span>{project.collaborators.length}</span>
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
        </div>
    );
}
