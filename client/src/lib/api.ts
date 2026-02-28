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
            return api.fetch<{ token: string; user: { id: number; username: string; email: string; role: string } }>('/auth/login', {
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
            return api.fetch('/auth/me');
        }
    },

    schematics: {
        async getAll() {
            return api.fetch('/schematics');
        },
        async search(query: string) {
            if (!query) return this.getAll();
            return api.fetch(`/schematics/search?q=${encodeURIComponent(query)}`);
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
        async reupload(id: string | number, file: File) {
            const token = localStorage.getItem('jwt_token');
            const formData = new FormData();
            formData.append('file', file);

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
