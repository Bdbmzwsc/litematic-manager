import type { UploadOptions } from '../types';

const API_BASE = '/api';

interface FetchOptions extends RequestInit {
    headers?: Record<string, string>;
}

export const api = {
    async fetch<T = unknown>(endpoint: string, options: FetchOptions = {}): Promise<T> {
        const token = localStorage.getItem('jwt_token');

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...options.headers,
        };

        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || response.statusText || 'Unknown Error');
        }

        return response.json() as Promise<T>;
    },

    auth: {
        async login(username: string, password: string) {
            return api.fetch<{ token: string; user: { id: number; username: string; email: string; role: string; avatar_url?: string; bio?: string } }>('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password }),
            });
        },
        async register(username: string, email: string, password: string, invitationCode: string) {
            return api.fetch('/auth/register', {
                method: 'POST',
                body: JSON.stringify({ username, email, password, invitationCode }),
            });
        },
        async getCurrentUser() {
            return api.fetch<{ id: number; username: string; email: string; role: string; avatar_url?: string; bio?: string }>('/auth/me');
        },
        async updateProfile(data: { bio: string }) {
            return api.fetch<{ message: string; bio: string }>('/auth/profile', {
                method: 'PUT',
                body: JSON.stringify(data),
            });
        },
        async uploadAvatar(file: File) {
            const token = localStorage.getItem('jwt_token');
            const formData = new FormData();
            formData.append('avatar', file);
            
            const response = await fetch(`${API_BASE}/auth/avatar`, {
                method: 'POST',
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || response.statusText || 'Upload failed');
            }

            return response.json() as Promise<{ message: string; avatar_url: string }>;
        },
        async getPublicProfile(username: string) {
            return api.fetch<{ id: number; username: string; role: string; avatar_url?: string; bio?: string; created_at: string }>(`/auth/users/${encodeURIComponent(username)}`);
        }
    },

    schematics: {
        async getAll() {
            return api.fetch('/schematics');
        },
        async search(query: string, tag?: string) {
            let url = `/schematics/search?q=${encodeURIComponent(query)}`;
            if (tag) url += `&tag=${encodeURIComponent(tag)}`;
            return api.fetch(url);
        },
        async getById(id: string | number) {
            return api.fetch(`/schematics/${id}`);
        },
        async update(id: string | number, data: Record<string, unknown>) {
            return api.fetch(`/schematics/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data),
            });
        },
        async togglePin(id: string | number, is_pinned: boolean) {
            return api.fetch(`/schematics/${id}/pin`, {
                method: 'PUT',
                body: JSON.stringify({ is_pinned }),
            });
        },
        async delete(id: string | number) {
            return api.fetch(`/schematics/${id}`, {
                method: 'DELETE',
            });
        },
        async upload(file: File, options: UploadOptions = {}) {
            const token = localStorage.getItem('jwt_token');
            const formData = new FormData();
            formData.append('file', file);

            if (options.description !== undefined) {
                formData.append('description', options.description);
            }
            if (options.type !== undefined) {
                formData.append('type', String(options.type));
            }
            if (options.config !== undefined) {
                formData.append('config', typeof options.config === 'string' ? options.config : JSON.stringify(options.config));
            }
            if (options.tags !== undefined) {
                formData.append('tags', JSON.stringify(options.tags));
            }

            const response = await fetch(`${API_BASE}/schematics/upload`, {
                method: 'POST',
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || response.statusText || 'Upload failed');
            }

            return response.json();
        },
        async getVersions(id: string | number) {
            return api.fetch<import('../types').SchematicVersion[]>(`/schematics/${id}/versions`);
        },
        async reupload(id: string | number, file: File, options?: { version_name?: string; changelog?: string }) {
            const token = localStorage.getItem('jwt_token');
            const formData = new FormData();
            formData.append('file', file);
            if (options?.version_name) formData.append('version_name', options.version_name);
            if (options?.changelog) formData.append('changelog', options.changelog);

            const response = await fetch(`${API_BASE}/schematics/${id}/upload`, {
                method: 'PUT',
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || response.statusText || 'Re-upload failed');
            }

            return response.json();
        },
        async getConfig(id: string | number) {
            return api.fetch<{ type: number; config: unknown[] }>(`/schematics/${id}/config`);
        },
        async updateConfig(id: string | number, data: { type: number; config: unknown[] }) {
            return api.fetch(`/schematics/${id}/config`, {
                method: 'PUT',
                body: JSON.stringify(data),
            });
        }
    },

    invitations: {
        async getAll() {
            return api.fetch('/invitations');
        },
        async create(data: { expiresInHours: number; maxUses: number }) {
            return api.fetch<{ invitation: { code: string } }>('/invitations', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        },
        async delete(code: string) {
            return api.fetch(`/invitations/${code}`, {
                method: 'DELETE',
            });
        }
    }
};
