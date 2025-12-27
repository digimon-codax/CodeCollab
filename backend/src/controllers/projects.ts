import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function createProject(req: Request, res: Response) {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { name, description, template = 'nodejs-express', runtime = 'node:20' } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Project name is required' });
        }

        const project = await prisma.project.create({
            data: {
                name,
                description,
                template,
                runtime,
                ownerId: req.user.userId,
                collaborators: {
                    create: {
                        userId: req.user.userId,
                        role: 'owner',
                    }
                },
                files: {
                    create: [
                        {
                            path: 'README.md',
                            content: `# ${name}\n\n${description || 'A new CodeCollab project'}`,
                            language: 'markdown',
                        },
                        {
                            path: 'index.js',
                            content: '// Start coding here!\nconsole.log("Hello, CodeCollab!");',
                            language: 'javascript',
                        }
                    ]
                }
            },
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true,
                    }
                },
                collaborators: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                avatar: true,
                            }
                        }
                    }
                },
                files: true,
            }
        });

        res.status(201).json(project);
    } catch (error) {
        console.error('Create project error:', error);
        res.status(500).json({ error: 'Failed to create project' });
    }
}

export async function getProject(req: Request, res: Response) {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { id } = req.params;

        const project = await prisma.project.findUnique({
            where: { id },
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true,
                    }
                },
                collaborators: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                avatar: true,
                            }
                        }
                    }
                },
                files: {
                    select: {
                        id: true,
                        path: true,
                        language: true,
                        lockedBy: true,
                        lockedAt: true,
                        updatedAt: true,
                    }
                }
            }
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Check if user has access
        const hasAccess = project.ownerId === req.user.userId ||
            project.collaborators.some(c => c.userId === req.user.userId);

        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json(project);
    } catch (error) {
        console.error('Get project error:', error);
        res.status(500).json({ error: 'Failed to get project' });
    }
}

export async function listProjects(req: Request, res: Response) {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const projects = await prisma.project.findMany({
            where: {
                OR: [
                    { ownerId: req.user.userId },
                    { collaborators: { some: { userId: req.user.userId } } }
                ]
            },
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true,
                    }
                },
                collaborators: {
                    select: {
                        role: true,
                        user: {
                            select: {
                                id: true,
                                name: true,
                                avatar: true,
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        files: true,
                    }
                }
            },
            orderBy: {
                updatedAt: 'desc',
            }
        });

        res.json(projects);
    } catch (error) {
        console.error('List projects error:', error);
        res.status(500).json({ error: 'Failed to list projects' });
    }
}

export async function updateProject(req: Request, res: Response) {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { id } = req.params;
        const { name, description } = req.body;

        const project = await prisma.project.findUnique({
            where: { id }
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (project.ownerId !== req.user.userId) {
            return res.status(403).json({ error: 'Only owner can update project' });
        }

        const updated = await prisma.project.update({
            where: { id },
            data: {
                name: name || project.name,
                description: description !== undefined ? description : project.description,
            },
            include: {
                owner: true,
                collaborators: {
                    include: {
                        user: true,
                    }
                }
            }
        });

        res.json(updated);
    } catch (error) {
        console.error('Update project error:', error);
        res.status(500).json({ error: 'Failed to update project' });
    }
}

export async function deleteProject(req: Request, res: Response) {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { id } = req.params;

        const project = await prisma.project.findUnique({
            where: { id }
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (project.ownerId !== req.user.userId) {
            return res.status(403).json({ error: 'Only owner can delete project' });
        }

        await prisma.project.delete({
            where: { id }
        });

        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        console.error('Delete project error:', error);
        res.status(500).json({ error: 'Failed to delete project' });
    }
}

export async function addCollaborator(req: Request, res: Response) {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { id } = req.params;
        const { email, role = 'editor' } = req.body;

        const project = await prisma.project.findUnique({
            where: { id }
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (project.ownerId !== req.user.userId) {
            return res.status(403).json({ error: 'Only owner can add collaborators' });
        }

        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const collaborator = await prisma.projectCollaborator.create({
            data: {
                projectId: id,
                userId: user.id,
                role,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true,
                    }
                }
            }
        });

        res.status(201).json(collaborator);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'User is already a collaborator' });
        }
        console.error('Add collaborator error:', error);
        res.status(500).json({ error: 'Failed to add collaborator' });
    }
}

export async function removeCollaborator(req: Request, res: Response) {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { id, userId } = req.params;

        const project = await prisma.project.findUnique({
            where: { id }
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (project.ownerId !== req.user.userId) {
            return res.status(403).json({ error: 'Only owner can remove collaborators' });
        }

        await prisma.projectCollaborator.delete({
            where: {
                projectId_userId: {
                    projectId: id,
                    userId,
                }
            }
        });

        res.json({ message: 'Collaborator removed successfully' });
    } catch (error) {
        console.error('Remove collaborator error:', error);
        res.status(500).json({ error: 'Failed to remove collaborator' });
    }
}
