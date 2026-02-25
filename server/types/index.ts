import type { Request } from 'express';
import type { RowDataPacket } from 'mysql2';

// ===== User & Auth =====

export interface User {
    id: number;
    username: string;
    password: string;
    email: string;
    role: 'admin' | 'user';
}

export interface AuthPayload {
    id: number;
    username: string;
    role: string;
}

export interface AuthenticatedRequest extends Request {
    user?: AuthPayload;
}

// ===== Invitation =====

export interface Invitation {
    code: string;
    createdBy: number;
    createdByName: string;
    expiresAt: string;
    maxUses: number;
    usedCount: number;
    createdAt: string;
}

export interface InvitationWithStatus extends Invitation {
    status: 'active' | 'expired' | 'used_up';
}

export interface CodeCheckResult {
    valid: boolean;
    error?: string;
}

// ===== Schematic =====

export interface SchematicRecord extends RowDataPacket {
    id: number;
    name: string;
    file_path: string | null;
    top_view_path: string | null;
    side_view_path: string | null;
    front_view_path: string | null;
    materials: string | null;
    folder_name: string | null;
    user_id: number;
    is_public: boolean;
    download_count: number;
    created_at: string;
    creator_name?: string;
}

export interface SchematicConfigItem {
    name: string;
    position: (string | number)[];
    generation?: boolean;
    generate_direct?: '+x' | '-x' | '+z' | '-z';
}

export interface SchematicConfig {
    type: 0 | 1;
    config: SchematicConfigItem[];
}

// ===== File Processing =====

export interface ProcessedResult {
    topViewPath?: string;
    sideViewPath?: string;
    frontViewPath?: string;
    materials: string | null;
    original: string;
}

export interface ViewerServerConfig {
    host: string;
    uploadEndpoint: string;
    downloadEndpoint: string;
}

export interface StorageConfig {
    baseDir: string;
    processedDir: string;
}

// ===== JWE =====

export interface JWECreateResult {
    jwt: string;
}

export interface JWEVerifyResult {
    payload?: AuthPayload;
    error?: string;
}
