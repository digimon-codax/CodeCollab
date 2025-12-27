import mongoose, { Schema, Document } from 'mongoose';

// User Model
export interface IUser extends Document {
    email: string;
    name: string;
    githubId?: string;
    password?: string;
    avatar: string | null;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    githubId: { type: String, unique: true, sparse: true },
    password: { type: String, select: false },
    avatar: { type: String, default: null },
}, {
    timestamps: true,
});

export const User = mongoose.model<IUser>('User', UserSchema);

// Project Model
export interface IProject extends Document {
    name: string;
    description: string;
    template: string;
    runtime: string;
    ownerId: mongoose.Types.ObjectId;
    inviteCode?: string;
    createdAt: Date;
    updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>({
    name: { type: String, required: true },
    description: { type: String, required: true },
    template: { type: String, default: 'blank' },
    runtime: { type: String, default: 'node:20' },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    inviteCode: { type: String, unique: true, sparse: true, index: true },
}, {
    timestamps: true,
});

export const Project = mongoose.model<IProject>('Project', ProjectSchema);

// Project Collaborator Model
export interface IProjectCollaborator extends Document {
    projectId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    role: 'owner' | 'editor' | 'viewer';
    addedAt: Date;
}

const ProjectCollaboratorSchema = new Schema<IProjectCollaborator>({
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['owner', 'editor', 'viewer'], required: true },
    addedAt: { type: Date, default: Date.now },
});

// Compound index for unique project-user combination
ProjectCollaboratorSchema.index({ projectId: 1, userId: 1 }, { unique: true });

export const ProjectCollaborator = mongoose.model<IProjectCollaborator>(
    'ProjectCollaborator',
    ProjectCollaboratorSchema
);

// Project File Model
export interface IProjectFile extends Document {
    projectId: mongoose.Types.ObjectId;
    path: string;
    content: string;
    language: string;
    yjsState: Buffer | null;
    createdAt: Date;
    updatedAt: Date;
}

const ProjectFileSchema = new Schema<IProjectFile>({
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    path: { type: String, required: true },
    content: { type: String, default: '' },
    language: { type: String, default: 'plaintext' },
    yjsState: { type: Buffer, default: null },
}, {
    timestamps: true,
});

// Compound index for unique project-path combination
ProjectFileSchema.index({ projectId: 1, path: 1 }, { unique: true });

export const ProjectFile = mongoose.model<IProjectFile>('ProjectFile', ProjectFileSchema);

// Audit Log Model
export interface IAuditLog extends Document {
    userId: mongoose.Types.ObjectId;
    projectId: mongoose.Types.ObjectId;
    action: string;
    details: Record<string, any>;
    ipAddress: string | null;
    userAgent: string | null;
    timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    action: { type: String, required: true },
    details: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
    timestamp: { type: Date, default: Date.now, index: true },
});

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

// Database connection function
export async function connectDatabase() {
    try {
        const mongoUri = process.env.MONGODB_URL || 'mongodb://localhost:27017/codecollab';
        await mongoose.connect(mongoUri);
        console.log('✓ MongoDB connected successfully');
    } catch (error) {
        console.error('✗ MongoDB connection error:', error);
        throw error;
    }
}

// Graceful shutdown
export async function disconnectDatabase() {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
}
