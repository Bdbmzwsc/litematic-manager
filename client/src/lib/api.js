const API_BASE = '/api';

export const api = {
    async fetch(endpoint, options = {}) {
        const token = localStorage.getItem('jwt_token');

        const headers = {
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

        return response.json();
    },

    auth: {
        async login(username, password) {
            return api.fetch('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password }),
            });
        },
        async register(username, email, password, invitationCode) {
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
        async search(query) {
            if (!query) return this.getAll();
            return api.fetch(`/schematics/search?q=${encodeURIComponent(query)}`);
        },
        async getById(id) {
            return api.fetch(`/schematics/${id}`);
        },
        async update(id, data) {
            return api.fetch(`/schematics/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data),
            });
        },
        async delete(id) {
            return api.fetch(`/schematics/${id}`, {
                method: 'DELETE',
            });
        },
        async upload(file, options = {}) {
            const token = localStorage.getItem('jwt_token');
            const formData = new FormData();
            formData.append('file', file);

            if (options.description !== undefined) {
                formData.append('description', options.description);
            }
            if (options.type !== undefined) {
                formData.append('type', options.type);
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
        async getConfig(id) {
            return api.fetch(`/schematics/${id}/config`);
        },
        async updateConfig(id, data) {
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
        async create(data) {
            return api.fetch('/invitations', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        },
        async delete(code) {
            return api.fetch(`/invitations/${code}`, {
                method: 'DELETE',
            });
        }
    }
};
