import type { ReactNode } from 'react';

export interface User {
    id: number;
    username: string;
    email: string;
    role: 'admin' | 'user';
}

export interface Schematic {
    id: number;
    name: string;
    description: string;
    user_id: number;
    creator_name: string;
    is_public: boolean;
    schematic_type: number;
    download_count: number;
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
}
