import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import type { Mock } from 'vitest';

// ===== Mock Setup (must be before app import) =====

// Mock database
const mockExecute = vi.fn();
const mockQuery = vi.fn();
vi.mock('../config/database.js', () => ({
    default: {
        execute: (...args: unknown[]) => mockExecute(...args),
        query: (...args: unknown[]) => mockQuery(...args),
        on: vi.fn(),
        getConnection: vi.fn().mockResolvedValue({ release: vi.fn() }),
    },
}));

// Mock JWE utils
const mockVerifyJWE = vi.fn();
const mockCreateJWE = vi.fn();
vi.mock('../utils/JWEUtils.js', () => ({
    verifyJWE: (...args: unknown[]) => mockVerifyJWE(...args),
    createJWE: (...args: unknown[]) => mockCreateJWE(...args),
}));

// Mock bcrypt
vi.mock('bcrypt', () => ({
    default: {
        hash: vi.fn().mockResolvedValue('$2b$10$hashedpassword'),
        compare: vi.fn().mockResolvedValue(true),
    },
}));

// Mock file system operations
vi.mock('fs', async (importOriginal) => {
    const actual = await importOriginal<typeof import('fs')>();
    return {
        ...actual,
        default: {
            ...actual,
            existsSync: vi.fn().mockReturnValue(true),
            mkdirSync: vi.fn(),
            writeFileSync: vi.fn(),
            readFileSync: vi.fn().mockReturnValue('{}'),
            renameSync: vi.fn(),
            unlinkSync: vi.fn(),
            rmSync: vi.fn(),
            createReadStream: vi.fn().mockReturnValue({
                pipe: vi.fn(),
            }),
        },
    };
});

// Mock fileProcessor
vi.mock('../utils/fileProcessor.js', () => ({
    processLitematicFile: vi.fn().mockResolvedValue({
        topViewPath: 'top.png',
        sideViewPath: 'side.png',
        frontViewPath: 'front.png',
        materials: 'materials.json',
        original: 'source.litematic',
    }),
}));

// Mock litematicGeneration
vi.mock('../utils/litematicGeneration.js', () => ({
    readNbtFile: vi.fn(),
    generateLitematic: vi.fn(),
}));

// Mock invitationController
vi.mock('../controllers/invitationController.js', () => ({
    default: {
        checkCode: vi.fn().mockReturnValue({ valid: true }),
        useCode: vi.fn(),
        createInvitation: vi.fn((_req: unknown, res: { status: (code: number) => { json: (data: unknown) => void } }) => {
            res.status(201).json({ message: 'ok' });
        }),
        listInvitations: vi.fn((_req: unknown, res: { json: (data: unknown) => void }) => {
            res.json([]);
        }),
        deleteInvitation: vi.fn((_req: unknown, res: { json: (data: unknown) => void }) => {
            res.json({ message: 'deleted' });
        }),
    },
}));

// Set env vars before app import
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'MDoFzwr6vpTjYFksuJb_ySJVOeJkNYP0CibhLeiGg50=';
process.env.JWT_ISSUER = 'test:issuer';
process.env.JWT_EXPIRES_IN = '24h';

// Now import app and supertest
import supertest from 'supertest';
import { app } from '../app.js';

const request = supertest(app);

// ===== Test Helpers =====

/** Simulate a valid user token */
function mockAuthAsUser(userId: number = 1, role: string = 'user') {
    mockVerifyJWE.mockResolvedValue({
        payload: { id: userId, username: `user${userId}`, role },
    });
}

/** Simulate an admin token */
function mockAuthAsAdmin(userId: number = 99) {
    mockAuthAsUser(userId, 'admin');
}

/** Simulate invalid / no token */
function mockAuthInvalid() {
    mockVerifyJWE.mockResolvedValue({ error: 'invalid token' });
}

/** Standard schematic DB row */
function fakeSchematic(overrides: Record<string, unknown> = {}) {
    return {
        id: 1,
        name: 'test-schematic',
        file_path: null,
        top_view_path: null,
        side_view_path: null,
        front_view_path: null,
        materials: '{}',
        folder_name: '1700000000000',
        user_id: 1,
        is_public: true,
        download_count: 0,
        created_at: '2026-01-01T00:00:00Z',
        creator_name: 'user1',
        ...overrides,
    };
}

// ===== Tests =====

beforeEach(() => {
    vi.clearAllMocks();
});

// ────────────────────────────────────────────
// Auth Middleware Tests
// ────────────────────────────────────────────
describe('Auth Middleware', () => {
    describe('validateToken', () => {
        it('should return 401 when no token is provided', async () => {
            const res = await request.get('/api/auth/me');
            expect(res.status).toBe(401);
            expect(res.body.error).toContain('认证令牌');
        });

        it('should return 401 when token is invalid', async () => {
            mockAuthInvalid();
            const res = await request
                .get('/api/auth/me')
                .set('Authorization', 'Bearer invalid-token');
            expect(res.status).toBe(401);
            expect(res.body.error).toContain('无效');
        });

        it('should pass when token is valid', async () => {
            mockAuthAsUser(1);
            mockQuery.mockResolvedValueOnce([[{ id: 1, username: 'user1', email: 'a@b.com', role: 'user' }]]);

            const res = await request
                .get('/api/auth/me')
                .set('Authorization', 'Bearer valid-token');
            expect(res.status).toBe(200);
            expect(res.body.username).toBe('user1');
        });
    });
});

// ────────────────────────────────────────────
// Schematic Authorization Tests
// ────────────────────────────────────────────
describe('Schematic Authorization', () => {

    // ── DELETE /:id ──
    describe('DELETE /api/schematics/:id', () => {
        it('should return 401 without token', async () => {
            const res = await request.delete('/api/schematics/1');
            expect(res.status).toBe(401);
        });

        it('should allow owner to delete', async () => {
            mockAuthAsUser(1);
            mockQuery.mockResolvedValueOnce([[fakeSchematic({ user_id: 1 })]]);
            mockExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);

            const res = await request
                .delete('/api/schematics/1')
                .set('Authorization', 'Bearer valid-token');
            expect(res.status).toBe(200);
            expect(res.body.message).toContain('删除成功');
        });

        it('should allow admin to delete any schematic', async () => {
            mockAuthAsAdmin(99);
            mockQuery.mockResolvedValueOnce([[fakeSchematic({ user_id: 1 })]]);
            mockExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);

            const res = await request
                .delete('/api/schematics/1')
                .set('Authorization', 'Bearer admin-token');
            expect(res.status).toBe(200);
        });

        it('should return 403 when non-owner non-admin tries to delete', async () => {
            mockAuthAsUser(2); // user 2 tries to delete user 1's schematic
            mockQuery.mockResolvedValueOnce([[fakeSchematic({ user_id: 1 })]]);

            const res = await request
                .delete('/api/schematics/1')
                .set('Authorization', 'Bearer valid-token');
            expect(res.status).toBe(403);
        });

        it('should return 404 when schematic does not exist', async () => {
            mockAuthAsUser(1);
            mockQuery.mockResolvedValueOnce([[]]);

            const res = await request
                .delete('/api/schematics/999')
                .set('Authorization', 'Bearer valid-token');
            expect(res.status).toBe(404);
        });
    });

    // ── PUT /:id (update metadata) ──
    describe('PUT /api/schematics/:id', () => {
        it('should allow owner to update', async () => {
            mockAuthAsUser(1);
            mockQuery
                .mockResolvedValueOnce([[fakeSchematic({ user_id: 1 })]])  // SELECT
                .mockResolvedValueOnce([{ affectedRows: 1 }])             // UPDATE
                .mockResolvedValueOnce([[fakeSchematic({ user_id: 1, name: 'new-name' })]]);  // SELECT after update

            const res = await request
                .put('/api/schematics/1')
                .set('Authorization', 'Bearer valid-token')
                .send({ name: 'new-name' });
            expect(res.status).toBe(200);
        });

        it('should return 403 when non-owner tries to update', async () => {
            mockAuthAsUser(2);
            mockQuery.mockResolvedValueOnce([[fakeSchematic({ user_id: 1 })]]);

            const res = await request
                .put('/api/schematics/1')
                .set('Authorization', 'Bearer valid-token')
                .send({ name: 'hacked' });
            expect(res.status).toBe(403);
        });

        it('should allow admin to update any schematic', async () => {
            mockAuthAsAdmin(99);
            mockQuery
                .mockResolvedValueOnce([[fakeSchematic({ user_id: 1 })]])
                .mockResolvedValueOnce([{ affectedRows: 1 }])
                .mockResolvedValueOnce([[fakeSchematic({ user_id: 1, name: 'admin-update' })]]);

            const res = await request
                .put('/api/schematics/1')
                .set('Authorization', 'Bearer valid-token')
                .send({ name: 'admin-update' });
            expect(res.status).toBe(200);
        });
    });

    // ── PUT /:id/upload (reupload file) ──
    describe('PUT /api/schematics/:id/upload', () => {
        it('should return 401 without token', async () => {
            const res = await request.put('/api/schematics/1/upload');
            expect(res.status).toBe(401);
        });

        it('should return 403 when non-owner non-admin tries to reupload', async () => {
            mockAuthAsUser(2);
            mockQuery.mockResolvedValueOnce([[fakeSchematic({ user_id: 1 })]]);

            const res = await request
                .put('/api/schematics/1/upload')
                .set('Authorization', 'Bearer valid-token')
                .attach('file', Buffer.from('fake-litematic-data'), 'test.litematic');
            expect(res.status).toBe(403);
        });

        it('should allow owner to reupload', async () => {
            mockAuthAsUser(1);
            mockQuery
                .mockResolvedValueOnce([[fakeSchematic({ user_id: 1, folder_name: '1700000000000' })]])
                .mockResolvedValueOnce([[fakeSchematic({ user_id: 1 })]]);

            const res = await request
                .put('/api/schematics/1/upload')
                .set('Authorization', 'Bearer valid-token')
                .attach('file', Buffer.from('fake-litematic-data'), 'test.litematic');
            expect(res.status).toBe(200);
        });

        it('should allow admin to reupload any schematic', async () => {
            mockAuthAsAdmin(99);
            mockQuery
                .mockResolvedValueOnce([[fakeSchematic({ user_id: 1, folder_name: '1700000000000' })]])
                .mockResolvedValueOnce([[fakeSchematic({ user_id: 1 })]]);

            const res = await request
                .put('/api/schematics/1/upload')
                .set('Authorization', 'Bearer admin-token')
                .attach('file', Buffer.from('fake-litematic-data'), 'test.litematic');
            expect(res.status).toBe(200);
        });

        it('should return 400 when schematic has no folder_name (legacy format)', async () => {
            mockAuthAsUser(1);
            mockQuery.mockResolvedValueOnce([[fakeSchematic({ user_id: 1, folder_name: null })]]);

            const res = await request
                .put('/api/schematics/1/upload')
                .set('Authorization', 'Bearer valid-token')
                .attach('file', Buffer.from('fake-litematic-data'), 'test.litematic');
            expect(res.status).toBe(400);
            expect(res.body.error).toContain('旧格式');
        });

        it('should return 400 when no file is provided', async () => {
            mockAuthAsUser(1);
            mockQuery.mockResolvedValueOnce([[fakeSchematic({ user_id: 1, folder_name: '1700000000000' })]]);

            const res = await request
                .put('/api/schematics/1/upload')
                .set('Authorization', 'Bearer valid-token');
            expect(res.status).toBe(400);
            expect(res.body.error).toContain('未提供文件');
        });

        it('should return 404 when schematic does not exist', async () => {
            mockAuthAsUser(1);
            mockQuery.mockResolvedValueOnce([[]]);

            const res = await request
                .put('/api/schematics/999/upload')
                .set('Authorization', 'Bearer valid-token')
                .attach('file', Buffer.from('fake-litematic-data'), 'test.litematic');
            expect(res.status).toBe(404);
        });
    });
});

// ────────────────────────────────────────────
// Schematic Visibility Tests
// ────────────────────────────────────────────
describe('Schematic Visibility', () => {
    describe('GET /api/schematics/:id', () => {
        it('should return public schematic to unauthenticated user', async () => {
            mockVerifyJWE.mockResolvedValue({ error: 'no token' });
            mockQuery.mockResolvedValueOnce([[fakeSchematic({ is_public: true })]]);

            const res = await request.get('/api/schematics/1');
            expect(res.status).toBe(200);
            expect(res.body.name).toBe('test-schematic');
        });

        it('should return 404 for private schematic when not owner', async () => {
            mockAuthAsUser(2);
            mockQuery.mockResolvedValueOnce([[]]); // query includes is_public=true OR user_id=2, returns nothing

            const res = await request
                .get('/api/schematics/1')
                .set('Authorization', 'Bearer valid-token');
            expect(res.status).toBe(404);
        });

        it('should allow owner to view their private schematic', async () => {
            mockAuthAsUser(1);
            mockQuery.mockResolvedValueOnce([[fakeSchematic({ is_public: false, user_id: 1 })]]);

            const res = await request
                .get('/api/schematics/1')
                .set('Authorization', 'Bearer valid-token');
            expect(res.status).toBe(200);
        });

        it('should allow admin to view any private schematic', async () => {
            mockAuthAsAdmin(99);
            mockQuery.mockResolvedValueOnce([[fakeSchematic({ is_public: false, user_id: 1 })]]);

            const res = await request
                .get('/api/schematics/1')
                .set('Authorization', 'Bearer admin-token');
            expect(res.status).toBe(200);
        });
    });

    describe('GET /api/schematics (search)', () => {
        it('should return only public schematics for unauthenticated user', async () => {
            mockVerifyJWE.mockResolvedValue({ error: 'no token' });
            mockQuery.mockResolvedValueOnce([[
                fakeSchematic({ id: 1, is_public: true }),
            ]]);

            const res = await request.get('/api/schematics');
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
        });

        it('should return all schematics for admin', async () => {
            mockAuthAsAdmin(99);
            mockQuery.mockResolvedValueOnce([[
                fakeSchematic({ id: 1, is_public: true }),
                fakeSchematic({ id: 2, is_public: false, user_id: 5 }),
            ]]);

            const res = await request
                .get('/api/schematics')
                .set('Authorization', 'Bearer admin-token');
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(2);
        });
    });
});

// ────────────────────────────────────────────
// Config Authorization Tests
// ────────────────────────────────────────────
describe('Config Authorization', () => {
    describe('GET /api/schematics/:id/config', () => {
        it('should return 401 without token', async () => {
            const res = await request.get('/api/schematics/1/config');
            expect(res.status).toBe(401);
        });

        it('should allow owner to get config', async () => {
            mockAuthAsUser(1);
            mockQuery.mockResolvedValueOnce([[fakeSchematic({ user_id: 1, folder_name: '1700000000000' })]]);

            const res = await request
                .get('/api/schematics/1/config')
                .set('Authorization', 'Bearer valid-token');
            expect(res.status).toBe(200);
        });

        it('should return 403 when non-owner tries to get config', async () => {
            mockAuthAsUser(2);
            mockQuery.mockResolvedValueOnce([[fakeSchematic({ user_id: 1 })]]);

            const res = await request
                .get('/api/schematics/1/config')
                .set('Authorization', 'Bearer valid-token');
            expect(res.status).toBe(403);
        });
    });

    describe('PUT /api/schematics/:id/config', () => {
        it('should allow owner to update config', async () => {
            mockAuthAsUser(1);
            mockQuery.mockResolvedValueOnce([[fakeSchematic({ user_id: 1, folder_name: '1700000000000' })]]);

            const res = await request
                .put('/api/schematics/1/config')
                .set('Authorization', 'Bearer valid-token')
                .send({ type: 1, config: [] });
            expect(res.status).toBe(200);
        });

        it('should return 403 when non-owner tries to update config', async () => {
            mockAuthAsUser(2);
            mockQuery.mockResolvedValueOnce([[fakeSchematic({ user_id: 1 })]]);

            const res = await request
                .put('/api/schematics/1/config')
                .set('Authorization', 'Bearer valid-token')
                .send({ type: 0 });
            expect(res.status).toBe(403);
        });
    });
});
