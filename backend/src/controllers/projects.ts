import { Request, Response } from 'express';
import { Project, ProjectCollaborator, ProjectFile, User } from '../models';
import mongoose from 'mongoose';

export async function createProject(req: Request, res: Response) {
    try {
        const { name, description, template, runtime } = req.body;
        const userId = (req as any).user?.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const project = await Project.create({
            name,
            description: description || '',
            template: template || 'blank',
            runtime: runtime || 'node:20',
            ownerId: userId,
        });

        // Add owner as collaborator
        await ProjectCollaborator.create({
            projectId: project._id,
            userId,
            role: 'owner',
        });

        // Create initial file
        await ProjectFile.create({
            projectId: project._id,
            path: 'README.md',
            content: `# ${name}\n\n${description || 'A new CodeCollab project'}`,
            language: 'markdown',
        });

        res.status(201).json(project);
    } catch (error) {
        console.error('Create project error:', error);
        res.status(500).json({ error: 'Failed to create project' });
    }
}

export async function listProjects(req: Request, res: Response) {
    try {
        const userId = (req as any).user?.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Find all collaborations for this user
        const collaborations = await ProjectCollaborator.find({ userId });
        const projectIds = collaborations.map(c => c.projectId);

        const projects = await Project.find({
            _id: { $in: projectIds }
        }).populate('ownerId', 'name email avatar');

        // Get file counts and collaborator counts
        const projectsWithDetails = await Promise.all(
            projects.map(async (project) => {
                const fileCount = await ProjectFile.countDocuments({ projectId: project._id });
                const collaborators = await ProjectCollaborator.find({ projectId: project._id })
                    .populate('userId', 'name email avatar');

                return {
                    id: project._id,
                    name: project.name,
                    description: project.description,
                    template: project.template,
                    runtime: project.runtime,
                    owner: project.ownerId,
                    collaborators: collaborators.map(c => ({
                        user: c.userId,
                        role: c.role,
                    })),
                    _count: {
                        files: fileCount,
                    },
                    createdAt: project.createdAt,
                    updatedAt: project.updatedAt,
                };
            })
        );

        res.json(projectsWithDetails);
    } catch (error) {
        console.error('List projects error:', error);
        res.status(500).json({ error: 'Failed to list projects' });
    }
}

export async function getProject(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const userId = (req as any).user?.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const project = await Project.findById(id).populate('ownerId', 'name email avatar');

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Check if user has access
        const hasAccess = await ProjectCollaborator.findOne({
            projectId: project._id,
            userId,
        });

        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const files = await ProjectFile.find({ projectId: project._id }).select('-content -yjsState');
        const collaborators = await ProjectCollaborator.find({ projectId: project._id })
            .populate('userId', 'name email avatar');

        res.json({
            id: project._id,
            name: project.name,
            description: project.description,
            template: project.template,
            runtime: project.runtime,
            owner: project.ownerId,
            files: files.map(f => ({
                id: f._id,
                path: f.path,
                language: f.language,
                createdAt: f.createdAt,
                updatedAt: f.updatedAt,
            })),
            collaborators: collaborators.map(c => ({
                user: c.userId,
                role: c.role,
                addedAt: c.addedAt,
            })),
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
        });
    } catch (error) {
        console.error('Get project error:', error);
        res.status(500).json({ error: 'Failed to get project' });
    }
}

export async function updateProject(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const userId = (req as any).user?.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const project = await Project.findById(id);

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Check if user is owner
        if (project.ownerId.toString() !== userId) {
            return res.status(403).json({ error: 'Only owner can update project' });
        }

        if (name) project.name = name;
        if (description !== undefined) project.description = description;

        await project.save();

        res.json(project);
    } catch (error) {
        console.error('Update project error:', error);
        res.status(500).json({ error: 'Failed to update project' });
    }
}

export async function deleteProject(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const userId = (req as any).user?.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const project = await Project.findById(id);

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Check if user is owner
        if (project.ownerId.toString() !== userId) {
            return res.status(403).json({ error: 'Only owner can delete project' });
        }

        // Delete all related data
        await ProjectFile.deleteMany({ projectId: project._id });
        await ProjectCollaborator.deleteMany({ projectId: project._id });
        await Project.findByIdAndDelete(id);

        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        console.error('Delete project error:', error);
        res.status(500).json({ error: 'Failed to delete project' });
    }
}

export async function addCollaborator(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { email, role } = req.body;
        const userId = (req as any).user?.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const project = await Project.findById(id);

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Check if user is owner
        if (project.ownerId.toString() !== userId) {
            return res.status(403).json({ error: 'Only owner can add collaborators' });
        }

        const collaboratorUser = await User.findOne({ email });

        if (!collaboratorUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if already a collaborator
        const existing = await ProjectCollaborator.findOne({
            projectId: project._id,
            userId: collaboratorUser._id,
        });

        if (existing) {
            return res.status(400).json({ error: 'User is already a collaborator' });
        }

        const collaborator = await ProjectCollaborator.create({
            projectId: project._id,
            userId: collaboratorUser._id,
            role: role || 'editor',
        });

        const populated = await ProjectCollaborator.findById(collaborator._id)
            .populate('userId', 'name email avatar');

        res.status(201).json({
            user: populated?.userId,
            role: populated?.role,
            addedAt: populated?.addedAt,
        });
    } catch (error) {
        console.error('Add collaborator error:', error);
        res.status(500).json({ error: 'Failed to add collaborator' });
    }
}

export async function removeCollaborator(req: Request, res: Response) {
    try {
        const { id, userId: targetUserId } = req.params;
        const userId = (req as any).user?.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const project = await Project.findById(id);

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Check if user is owner
        if (project.ownerId.toString() !== userId) {
            return res.status(403).json({ error: 'Only owner can remove collaborators' });
        }

        await ProjectCollaborator.deleteOne({
            projectId: project._id,
            userId: targetUserId,
        });

        res.json({ message: 'Collaborator removed successfully' });
    } catch (error) {
        console.error('Remove collaborator error:', error);
        res.status(500).json({ error: 'Failed to remove collaborator' });
    }
}
