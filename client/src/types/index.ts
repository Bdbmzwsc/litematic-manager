import type { ReactNode } from 'react';

export interface User {
    id: number;
    username: string;
    email: string;
    role: 'admin' | 'user';
    avatar_url?: string;
    bio?: string;
}

export interface Schematic {
    id: number;
    name: string;
    description: string;
    readme?: string;
    user_id: number;
    creator_name: string;
    is_public: boolean;
    schematic_type: number;
    is_pinned: boolean;
    download_count: number;
    created_at: string;
    tags?: string[] | string;
}

export interface SchematicVersion {
    id: number;
    schematic_id: number;
    version_name: string;
    folder_name: string;
    changelog: string;
    created_at: string;
}

export interface Invitation {
    code: string;
    status: 'active' | 'expired' | 'used_up';
    maxUses: number;
    usedCount: number;
    createdByName: string;
    expiresAt: string;
}

export interface UploadResult {
    success: boolean;
    message: string;
    id?: number;
}

export interface ConfirmOptions {
    title?: string;
    description?: ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'default';
    icon?: ReactNode;
}

export interface UploadOptions {
    description?: string;
    type?: number;
    config?: unknown[] | string;
    tags?: string[];
    version_name?: string;
    changelog?: string;
}
