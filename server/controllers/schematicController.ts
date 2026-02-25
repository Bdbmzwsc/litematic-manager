import Schematic from '../models/schematic.js';
import { processLitematicFile } from '../utils/fileProcessor.js';
import { readNbtFile, generateLitematic } from '../utils/litematicGeneration.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';
import type { Response } from 'express';
import type { AuthenticatedRequest, SchematicRecord, SchematicConfig } from '../types/index.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper: read or create config.json for a schematic folder
function readOrCreateConfig(folderPath: string): SchematicConfig {
    const configPath = path.join(folderPath, 'config.json');
    if (fs.existsSync(configPath)) {
        try {
            return JSON.parse(fs.readFileSync(configPath, 'utf8')) as SchematicConfig;
        } catch (e) {
            console.error('Error parsing config.json:', e);
            return { type: 0, config: [] };
        }
    }
    // Auto-create default config.json
    const defaultConfig: SchematicConfig = { type: 0, config: [] };
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
    return defaultConfig;
}

const schematicController = {
    async uploadSchematic(req: AuthenticatedRequest, res: Response): Promise<void> {
        if (!req.user) {
            res.status(401).json({ error: '需要登录' });
            return;
        }

        try {
            const file = req.file;
            if (!file) {
                res.status(400).json({ error: '未提供文件' });
                return;
            }

            if (!file.originalname.endsWith('.litematic')) {
                res.status(400).json({ error: '只支持 .litematic 文件' });
                return;
            }

            // Generate Folder Name (Timestamp)
            const timestamp = Date.now().toString();
            const uploadBaseDir = path.join(__dirname, '../uploads');
            const targetDir = path.join(uploadBaseDir, timestamp);

            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }

            // Move and Rename File
            const sourcePath = path.join(targetDir, 'source.litematic');
            fs.renameSync(file.path, sourcePath);
            console.log(`File moved to: ${sourcePath}`);

            // Create README.md
            const readmePath = path.join(targetDir, 'README.md');
            const description: string = req.body.description || '';
            fs.writeFileSync(readmePath, description, 'utf8');
            console.log(`Created README at: ${readmePath}`);

            // Create config.json
            const schematicType = parseInt(req.body.type) || 0;
            let schematicConfig: unknown[] = [];
            if (req.body.config) {
                try {
                    schematicConfig = typeof req.body.config === 'string'
                        ? JSON.parse(req.body.config)
                        : req.body.config;
                } catch (e) {
                    console.error('Invalid config format:', e);
                }
            }
            const configData = { type: schematicType, config: schematicConfig };
            const configPath = path.join(targetDir, 'config.json');
            fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf8');
            console.log(`Created config.json at: ${configPath}`);

            // Prepare Initial Data
            const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
            const cleanName = originalName.split(/[/\\]/).pop()!.replace('.litematic', '');

            const schematicData = {
                name: cleanName,
                user_id: req.user.id,
                is_public: true,
                folder_name: timestamp
            };

            // Process File
            try {
                console.log('Processing file for views and materials...');
                await processLitematicFile(sourcePath, targetDir);
                console.log('File processing complete.');
            } catch (error) {
                console.error('View generation failed:', error);
            }

            // Save to Database
            const [result] = await pool.execute<ResultSetHeader>(
                'INSERT INTO schematics (name, folder_name, user_id, is_public, materials) VALUES (?, ?, ?, ?, ?)',
                [
                    schematicData.name,
                    schematicData.folder_name,
                    schematicData.user_id,
                    schematicData.is_public,
                    '{}'
                ]
            );

            const schematicId = result.insertId;

            const [schematics] = await pool.query<SchematicRecord[]>(
                `SELECT s.*, u.username as creator_name 
                FROM schematics s 
                JOIN users u ON s.user_id = u.id 
                WHERE s.id = ?`,
                [schematicId]
            );

            res.status(201).json(schematics[0] || { id: schematicId });
        } catch (error) {
            console.error('上传失败:', error);
            res.status(500).json({ error: '上传失败' });
        }
    },

    async searchSchematics(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const searchTerm = (req.query.q as string) || '';
            const userId = req.user?.id;
            const isAdmin = req.user?.role === 'admin';

            let query: string;
            let params: (string | number)[];

            if (isAdmin) {
                query = `
                    SELECT s.*, u.username as creator_name 
                    FROM schematics s 
                    JOIN users u ON s.user_id = u.id 
                    WHERE s.name LIKE ? 
                    ORDER BY s.created_at DESC
                `;
                params = [`%${searchTerm}%`];
            } else {
                query = `
                    SELECT s.*, u.username as creator_name 
                    FROM schematics s 
                    JOIN users u ON s.user_id = u.id 
                    WHERE s.name LIKE ? 
                    AND (s.is_public = true OR s.user_id = ?)
                    ORDER BY s.created_at DESC
                `;
                params = [`%${searchTerm}%`, userId || 0];
            }

            const [schematics] = await pool.query<SchematicRecord[]>(query, params);

            const mappedSchematics = schematics.map(s => {
                if (s.folder_name) {
                    return {
                        ...s,
                        file_path: `/uploads/${s.folder_name}/source.litematic`,
                        top_view_path: `/uploads/${s.folder_name}/top.png`,
                        side_view_path: `/uploads/${s.folder_name}/side.png`,
                        front_view_path: `/uploads/${s.folder_name}/front.png`
                    };
                }
                return s;
            });

            res.json(mappedSchematics);
        } catch (error) {
            console.error('搜索失败:', error);
            res.status(500).json({ error: '搜索失败' });
        }
    },

    async getSchematic(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const id = req.params.id as string;
            const userId = req.user?.id;
            const isAdmin = req.user?.role === 'admin';

            let query: string;
            let params: (string | number)[];

            if (isAdmin) {
                query = `
                    SELECT s.*, u.username as creator_name 
                    FROM schematics s 
                    JOIN users u ON s.user_id = u.id 
                    WHERE s.id = ?
                `;
                params = [id];
            } else {
                query = `
                    SELECT s.*, u.username as creator_name 
                    FROM schematics s 
                    JOIN users u ON s.user_id = u.id 
                    WHERE s.id = ? AND (s.is_public = true OR s.user_id = ?)
                `;
                params = [id, userId || 0];
            }

            const [schematics] = await pool.query<SchematicRecord[]>(query, params);

            if (schematics.length === 0) {
                res.status(404).json({ error: '原理图不存在或无权访问' });
                return;
            }

            const schematic = schematics[0];
            const urlPrefix = `/uploads/`;

            const result: Record<string, unknown> = { ...schematic };

            // === Logic for Folder-Based Schematics ===
            if (schematic.folder_name) {
                const folder = schematic.folder_name;

                result.file_path = `${urlPrefix}${folder}/source.litematic`;
                result.top_view_path = `${urlPrefix}${folder}/top.png`;
                result.side_view_path = `${urlPrefix}${folder}/side.png`;
                result.front_view_path = `${urlPrefix}${folder}/front.png`;
                result.readme_path = `${urlPrefix}${folder}/README.md`;

                const folderPath = path.join(__dirname, '../uploads', folder);
                const schematicConfig = readOrCreateConfig(folderPath);
                result.schematic_type = schematicConfig.type || 0;

                try {
                    const readmeAbsolutePath = path.join(folderPath, 'README.md');
                    if (fs.existsSync(readmeAbsolutePath)) {
                        const description = fs.readFileSync(readmeAbsolutePath, 'utf8');
                        result.description = description;
                    } else {
                        result.description = '';
                    }
                } catch (err) {
                    console.error('Error reading README:', err);
                    result.description = '';
                }

            } else {
                // === Legacy Logic ===
                const getFullPath = (filePath: string | null): string | null => {
                    if (!filePath) return null;
                    if (filePath.includes('processed')) {
                        const pathParts = filePath.split(/[/\\]/);
                        const processedIndex = pathParts.findIndex(part => part === 'processed');
                        if (processedIndex >= 0 && processedIndex + 2 < pathParts.length) {
                            const timestamp = pathParts[processedIndex + 1];
                            const fileName = pathParts[processedIndex + 2];
                            return `${urlPrefix}processed/${timestamp}/${fileName}`;
                        }
                    }
                    const fileName = path.basename(filePath);
                    return `${urlPrefix}${fileName}`;
                };

                result.file_path = getFullPath(schematic.file_path);
                result.top_view_path = getFullPath(schematic.top_view_path);
                result.side_view_path = getFullPath(schematic.side_view_path);
                result.front_view_path = getFullPath(schematic.front_view_path);
            }

            res.json(result);
        } catch (error) {
            console.error('获取原理图失败:', error);
            res.status(500).json({ error: '获取原理图失败' });
        }
    },

    async deleteSchematic(req: AuthenticatedRequest, res: Response): Promise<void> {
        if (!req.user) {
            res.status(401).json({ error: '需要登录' });
            return;
        }

        try {
            const id = req.params.id as string;
            const userId = req.user.id;
            const isAdmin = req.user.role === 'admin';

            const [schematics] = await pool.query<SchematicRecord[]>(
                'SELECT * FROM schematics WHERE id = ?',
                [id]
            );

            if (schematics.length === 0) {
                res.status(404).json({ error: '原理图不存在' });
                return;
            }

            const schematic = schematics[0];
            if (schematic.user_id !== userId && !isAdmin) {
                res.status(403).json({ error: '没有权限删除此原理图' });
                return;
            }

            console.log(`删除原理图 ID: ${id}, 名称: ${schematic.name}`);

            await pool.execute('DELETE FROM schematics WHERE id = ?', [id]);

            if (schematic.folder_name) {
                const folderPath = path.join(__dirname, '../uploads', schematic.folder_name);
                if (fs.existsSync(folderPath)) {
                    fs.rmSync(folderPath, { recursive: true, force: true });
                    console.log(`Deleted folder: ${folderPath}`);
                }
            } else {
                await Schematic.deleteSchematicFiles(schematic);
            }

            res.json({ message: '删除成功' });
        } catch (error) {
            console.error('删除失败:', error);
            res.status(500).json({ error: '删除失败: ' + ((error as Error).message || '未知错误') });
        }
    },

    async updateSchematic(req: AuthenticatedRequest, res: Response): Promise<void> {
        if (!req.user) {
            res.status(401).json({ error: '需要登录' });
            return;
        }

        try {
            const id = req.params.id as string;
            const { name, is_public, description } = req.body;
            const userId = req.user.id;
            const isAdmin = req.user.role === 'admin';

            const [schematics] = await pool.query<SchematicRecord[]>(
                'SELECT * FROM schematics WHERE id = ?',
                [id]
            );

            if (schematics.length === 0) {
                res.status(404).json({ error: '原理图不存在' });
                return;
            }

            const schematic = schematics[0];
            if (schematic.user_id !== userId && !isAdmin) {
                res.status(403).json({ error: '没有权限修改此原理图' });
                return;
            }

            const updateData: Record<string, unknown> = {};
            if (name !== undefined) updateData.name = name;
            if (is_public !== undefined) updateData.is_public = is_public;

            if (Object.keys(updateData).length > 0) {
                await pool.query(
                    'UPDATE schematics SET ? WHERE id = ?',
                    [updateData, id]
                );
            }

            if (description !== undefined && schematic.folder_name) {
                const readmePath = path.join(__dirname, '../uploads', schematic.folder_name, 'README.md');
                const dir = path.dirname(readmePath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                fs.writeFileSync(readmePath, description, 'utf8');
                console.log(`Updated README for schematic ${id} at ${readmePath}`);
            }

            const [updatedSchematic] = await pool.query<SchematicRecord[]>(
                `SELECT s.*, u.username as creator_name 
                FROM schematics s 
                JOIN users u ON s.user_id = u.id 
                WHERE s.id = ?`,
                [id]
            );

            res.json(updatedSchematic[0]);
        } catch (error) {
            console.error('更新失败:', error);
            res.status(500).json({ error: '更新失败' });
        }
    },

    async getFrontView(req: AuthenticatedRequest, res: Response): Promise<void> {
        await checkAccessAndServeFile(req, res, 'front_view_path');
    },

    async getSideView(req: AuthenticatedRequest, res: Response): Promise<void> {
        await checkAccessAndServeFile(req, res, 'side_view_path');
    },

    async getTopView(req: AuthenticatedRequest, res: Response): Promise<void> {
        await checkAccessAndServeFile(req, res, 'top_view_path');
    },

    async getMaterials(req: AuthenticatedRequest, res: Response): Promise<void> {
        await checkAccessAndServeFile(req, res, 'materials');
    },

    async downloadSchematic(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const id = req.params.id as string;
            const userId = req.user?.id;
            const isAdmin = req.user?.role === 'admin';

            let query: string;
            let params: (string | number)[];
            if (isAdmin) {
                query = 'SELECT s.*, u.username as creator_name FROM schematics s JOIN users u ON s.user_id = u.id WHERE s.id = ?';
                params = [id];
            } else {
                query = 'SELECT s.*, u.username as creator_name FROM schematics s JOIN users u ON s.user_id = u.id WHERE s.id = ? AND (s.is_public = true OR s.user_id = ?)';
                params = [id, userId || 0];
            }

            const [schematics] = await pool.query<SchematicRecord[]>(query, params);
            if (schematics.length === 0) {
                res.status(404).json({ error: '原理图不存在或无权访问' });
                return;
            }

            const schematic = schematics[0];

            if (schematic.folder_name) {
                const folderPath = path.join(__dirname, '../uploads', schematic.folder_name);
                const schematicConfig = readOrCreateConfig(folderPath);

                if (schematicConfig.type === 1) {
                    const x = parseInt(req.query.x as string);
                    const z = parseInt(req.query.z as string);

                    if (!Number.isInteger(x) || !Number.isInteger(z) || x <= 0 || z <= 0) {
                        res.status(400).json({ error: '参数错误：x 和 z 必须为正整数' });
                        return;
                    }

                    const sourcePath = path.join(folderPath, 'source.litematic');
                    if (!fs.existsSync(sourcePath)) {
                        res.status(404).json({ error: '源文件不存在' });
                        return;
                    }

                    let resultBuffer: Buffer;
                    try {
                        const nbt = readNbtFile(sourcePath);
                        const configClone = JSON.parse(JSON.stringify(schematicConfig.config));
                        const assembledNbt = generateLitematic(nbt, configClone, x, z);
                        resultBuffer = Buffer.from(assembledNbt.write());
                    } catch (error) {
                        console.error('生成失败:', error);
                        res.status(500).json({ error: '生成失败' });
                        return;
                    }

                    const filename = schematic.name + '.litematic';
                    const containsNonAscii = /[^\x00-\x7F]/.test(filename);
                    const encodedFilename = containsNonAscii
                        ? `filename*=UTF-8''${encodeURIComponent(filename)}`
                        : `filename="${filename}"`;
                    try {
                        await pool.execute(
                            'UPDATE schematics SET download_count = COALESCE(download_count, 0) + 1 WHERE id = ?',
                            [id]
                        );
                    } catch (countErr) {
                        console.error('更新下载计数失败:', countErr);
                    }

                    res.setHeader('Content-Disposition', `attachment; ${encodedFilename}`);
                    res.setHeader('Content-Type', 'application/octet-stream');
                    res.setHeader('Content-Length', resultBuffer.length);
                    res.send(resultBuffer);
                    return;
                }
            }

            // type === 0 or legacy: fall back to normal file download
            await checkAccessAndServeFile(req, res, 'file_path');
        } catch (error) {
            console.error('下载失败:', error);
            res.status(500).json({ error: '下载失败: ' + ((error as Error).message || '未知错误') });
        }
    },

    async getConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const id = req.params.id as string;
            const userId = req.user?.id;
            const isAdmin = req.user?.role === 'admin';

            const [schematics] = await pool.query<SchematicRecord[]>('SELECT * FROM schematics WHERE id = ?', [id]);
            if (schematics.length === 0) {
                res.status(404).json({ error: '原理图不存在' });
                return;
            }

            const schematic = schematics[0];
            if (schematic.user_id !== userId && !isAdmin) {
                res.status(403).json({ error: '没有权限访问此配置' });
                return;
            }

            if (!schematic.folder_name) {
                res.json({ type: 0, config: [] });
                return;
            }

            const folderPath = path.join(__dirname, '../uploads', schematic.folder_name);
            const config = readOrCreateConfig(folderPath);
            res.json(config);
        } catch (error) {
            console.error('获取配置失败:', error);
            res.status(500).json({ error: '获取配置失败' });
        }
    },

    async updateConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
        if (!req.user) {
            res.status(401).json({ error: '需要登录' });
            return;
        }

        try {
            const id = req.params.id as string;
            const { type, config } = req.body;
            const userId = req.user.id;
            const isAdmin = req.user.role === 'admin';

            const [schematics] = await pool.query<SchematicRecord[]>('SELECT * FROM schematics WHERE id = ?', [id]);
            if (schematics.length === 0) {
                res.status(404).json({ error: '原理图不存在' });
                return;
            }

            const schematic = schematics[0];
            if (schematic.user_id !== userId && !isAdmin) {
                res.status(403).json({ error: '没有权限修改此配置' });
                return;
            }

            if (!schematic.folder_name) {
                res.status(400).json({ error: '旧格式投影不支持配置' });
                return;
            }

            if (type !== undefined && type !== 0 && type !== 1) {
                res.status(400).json({ error: 'type 必须为 0 或 1' });
                return;
            }

            if ((type === 1 || type === undefined) && config !== undefined) {
                if (!Array.isArray(config)) {
                    res.status(400).json({ error: 'config 必须为数组' });
                    return;
                }
            }

            const folderPath = path.join(__dirname, '../uploads', schematic.folder_name);
            const existingConfig = readOrCreateConfig(folderPath);

            if (type !== undefined) existingConfig.type = type;
            if (config !== undefined) existingConfig.config = config;

            const configPath = path.join(folderPath, 'config.json');
            fs.writeFileSync(configPath, JSON.stringify(existingConfig, null, 2), 'utf8');

            res.json(existingConfig);
        } catch (error) {
            console.error('更新配置失败:', error);
            res.status(500).json({ error: '更新配置失败' });
        }
    }
};

// 辅助方法：检查访问权限并提供文件
async function checkAccessAndServeFile(req: AuthenticatedRequest, res: Response, fieldName: string): Promise<void> {
    try {
        const id = req.params.id as string;
        const userId = req.user?.id;
        const isAdmin = req.user?.role === 'admin';

        let query: string;
        let params: (string | number)[];

        if (isAdmin) {
            query = `
                SELECT s.*, u.username as creator_name 
                FROM schematics s 
                JOIN users u ON s.user_id = u.id 
                WHERE s.id = ?
            `;
            params = [id];
        } else {
            query = `
                SELECT s.*, u.username as creator_name 
                FROM schematics s 
                JOIN users u ON s.user_id = u.id 
                WHERE s.id = ? AND (s.is_public = true OR s.user_id = ?)
            `;
            params = [id, userId || 0];
        }

        const [schematics] = await pool.query<SchematicRecord[]>(query, params);

        if (schematics.length === 0) {
            res.status(404).json({ error: '原理图不存在或无权访问' });
            return;
        }

        const schematic = schematics[0];
        let fullPath = '';
        let contentType = 'application/octet-stream';

        // === FOLDER BASED LOGIC ===
        if (schematic.folder_name) {
            const folder = schematic.folder_name;
            let filename = '';

            if (fieldName === 'front_view_path') filename = 'front.png';
            else if (fieldName === 'side_view_path') filename = 'side.png';
            else if (fieldName === 'top_view_path') filename = 'top.png';
            else if (fieldName === 'materials') filename = 'materials.json';
            else if (fieldName === 'file_path') filename = 'source.litematic';

            fullPath = path.join(__dirname, '../uploads', folder, filename);

            if (fieldName === 'materials') {
                if (fs.existsSync(fullPath)) {
                    try {
                        const data = fs.readFileSync(fullPath, 'utf8');
                        res.json(JSON.parse(data));
                        return;
                    } catch (_e) {
                        res.json({});
                        return;
                    }
                } else {
                    res.json({});
                    return;
                }
            }

        } else {
            // === LEGACY LOGIC ===
            if (fieldName === 'materials') {
                if (typeof schematic.materials === 'object' ||
                    (typeof schematic.materials === 'string' && schematic.materials.startsWith('{'))) {
                    try {
                        const materialsData = typeof schematic.materials === 'string'
                            ? JSON.parse(schematic.materials)
                            : schematic.materials;
                        res.json(materialsData);
                        return;
                    } catch (_error) {
                        res.status(500).json({ error: '解析材料数据失败' });
                        return;
                    }
                }
                const filePath = schematic.materials;
                if (!filePath) {
                    res.status(404).json({ error: '材料数据不存在' });
                    return;
                }

                if (path.isAbsolute(filePath)) fullPath = filePath;
                else if (filePath.includes('processed')) {
                    if (filePath.startsWith('uploads/')) fullPath = path.join(__dirname, '../', filePath);
                    else if (filePath.startsWith('processed/')) fullPath = path.join(__dirname, '../uploads', filePath);
                    else fullPath = path.join(__dirname, '../uploads', filePath);
                } else {
                    fullPath = path.join(__dirname, '../uploads', path.basename(filePath));
                }

                if (fs.existsSync(fullPath)) {
                    try {
                        res.json(JSON.parse(fs.readFileSync(fullPath, 'utf8')));
                        return;
                    } catch (_e) {
                        res.status(500).json({ error: 'Read failed' });
                        return;
                    }
                }
                res.status(404).json({ error: 'Files missing' });
                return;
            }

            const filePath = (schematic as Record<string, unknown>)[fieldName] as string | null;
            if (!filePath) {
                res.status(404).json({ error: '文件不存在' });
                return;
            }

            if (path.isAbsolute(filePath)) fullPath = filePath;
            else if (filePath.includes('processed')) {
                if (filePath.startsWith('uploads/')) fullPath = path.join(__dirname, '../', filePath);
                else if (filePath.startsWith('processed/')) fullPath = path.join(__dirname, '../uploads', filePath);
                else fullPath = path.join(__dirname, '../uploads', filePath);
            } else {
                fullPath = path.join(__dirname, '../uploads', path.basename(filePath));
            }
        }

        // Check existence
        if (!fs.existsSync(fullPath)) {
            if (fieldName === 'materials') {
                res.json({});
                return;
            }
            console.error('File missing:', fullPath);
            res.status(404).json({ error: '文件不存在' });
            return;
        }

        // Download headers for file_path
        if (fieldName === 'file_path' && req.path.includes('/download')) {
            try {
                await pool.execute(
                    'UPDATE schematics SET download_count = COALESCE(download_count, 0) + 1 WHERE id = ?',
                    [id]
                );
            } catch (countErr) {
                console.error('更新下载计数失败:', countErr);
            }

            const filename = schematic.name + '.litematic';
            const containsNonAscii = /[^\x00-\x7F]/.test(filename);
            const encodedFilename = containsNonAscii
                ? `filename*=UTF-8''${encodeURIComponent(filename)}`
                : `filename="${filename}"`;

            res.setHeader('Content-Disposition', `attachment; ${encodedFilename}`);
            res.setHeader('Content-Type', 'application/octet-stream');
        } else {
            const ext = path.extname(fullPath).toLowerCase();
            if (ext === '.png') contentType = 'image/png';
            else if (ext === '.json') contentType = 'application/json';
            res.setHeader('Content-Type', contentType);
        }

        const fileStream = fs.createReadStream(fullPath);
        fileStream.pipe(res);

    } catch (error) {
        console.error(`获取${fieldName}失败:`, error);
        res.status(500).json({ error: `获取${fieldName}失败` });
    }
}

export default schematicController;
