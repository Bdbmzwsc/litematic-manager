const Schematic = require('../models/schematic');
const { processLitematicFile } = require('../utils/fileProcessor');
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

const schematicController = {
    async uploadSchematic(req, res) {
        if (!req.user) {
            return res.status(401).json({ error: '需要登录' });
        }

        try {
            const file = req.file;
            if (!file) {
                return res.status(400).json({ error: '未提供文件' });
            }

            if (!file.originalname.endsWith('.litematic')) {
                return res.status(400).json({ error: '只支持 .litematic 文件' });
            }

            // Generate Folder Name (Timestamp)
            const timestamp = Date.now().toString();
            // Create dedicated folder
            const uploadBaseDir = path.join(__dirname, '../uploads');
            const targetDir = path.join(uploadBaseDir, timestamp);

            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }

            // Move and Rename File
            const sourcePath = path.join(targetDir, 'source.litematic');
            fs.renameSync(file.path, sourcePath);
            console.log(`File moved to: ${sourcePath}`);

            // Create Empty README.md
            const readmePath = path.join(targetDir, 'README.md');
            fs.writeFileSync(readmePath, '');
            console.log(`Created empty README at: ${readmePath}`);

            // Prepare Initial Data
            // Extract original name for display, cleaning up any path residue
            const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
            const cleanName = originalName.split(/[/\\]/).pop().replace('.litematic', '');

            let schematicData = {
                name: cleanName,
                user_id: req.user.id,
                is_public: true, // Default to public
                folder_name: timestamp
            };

            // Process File (generate views/materials)
            try {
                console.log('Processing file for views and materials...');
                // Pass sourcePath and targetDir
                await processLitematicFile(sourcePath, targetDir);
                // We rely on standard filenames in the folder, so we don't need to update specific path columns
                console.log('File processing complete.');
            } catch (error) {
                console.error('View generation failed:', error);
                // Continue saving the schematic even if views fail
            }

            // Save to Database
            // We need to update Schematic.create to handle folder_name, 
            // OR update the query here if Schematic.create is too rigid.
            // Let's assume we need to update Schematic.create or call pool directly here to be safe.
            // Using pool directly to ensure folder_name is supported without modifying model class yet if it doesn't support it.

            const [result] = await pool.execute(
                'INSERT INTO schematics (name, folder_name, user_id, is_public, materials) VALUES (?, ?, ?, ?, ?)',
                [
                    schematicData.name,
                    schematicData.folder_name,
                    schematicData.user_id,
                    schematicData.is_public,
                    '{}' // Default materials JSON
                ]
            );

            const schematicId = result.insertId;

            // Fetch created record
            const [schematics] = await pool.query(
                `SELECT s.*, u.username as creator_name 
                FROM schematics s 
                JOIN users u ON s.user_id = u.id 
                WHERE s.id = ?`,
                [schematicId]
            );

            res.status(201).json(schematics[0] || { id: schematicId });
        } catch (error) {
            console.error('上传失败:', error);
            // Cleanup on critical failure if possible
            res.status(500).json({ error: '上传失败' });
        }
    },

    async searchSchematics(req, res) {
        try {
            const searchTerm = req.query.q || '';
            const userId = req.user?.id;
            const isAdmin = req.user?.role === 'admin';

            let query;
            let params;

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

            const [schematics] = await pool.query(query, params);
            // console.log(`搜索原理图 "${searchTerm}", 返回 ${schematics.length} 个结果`); // Reduce log spam

            // Map results to include folder-based paths if applicable
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

    async getSchematic(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;
            const isAdmin = req.user?.role === 'admin';

            let query;
            let params;

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

            const [schematics] = await pool.query(query, params);

            if (schematics.length === 0) {
                return res.status(404).json({ error: '原理图不存在或无权访问' });
            }

            const schematic = schematics[0];
            const urlPrefix = `/uploads/`;

            let result = { ...schematic };

            // === Logic for Folder-Based Schematics ===
            if (schematic.folder_name) {
                const folder = schematic.folder_name;

                // Construct standard paths
                result.file_path = `${urlPrefix}${folder}/source.litematic`;
                result.top_view_path = `${urlPrefix}${folder}/top.png`;
                result.side_view_path = `${urlPrefix}${folder}/side.png`;
                result.front_view_path = `${urlPrefix}${folder}/front.png`;
                result.readme_path = `${urlPrefix}${folder}/README.md`;

                // Try to read README content
                try {
                    const readmeAbsolutePath = path.join(__dirname, '../uploads', folder, 'README.md');
                    if (fs.existsSync(readmeAbsolutePath)) {
                        const description = fs.readFileSync(readmeAbsolutePath, 'utf8');
                        result.description = description;
                    } else {
                        result.description = ''; // Default to empty
                    }
                } catch (err) {
                    console.error('Error reading README:', err);
                    result.description = '';
                }

            } else {
                // === Legacy Logic ===

                // Helper to handle legacy paths
                const getFullPath = (filePath) => {
                    if (!filePath) return null;
                    if (filePath.includes('processed')) {
                        const pathParts = filePath.split(/[\/\\]/);
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

    async deleteSchematic(req, res) {
        if (!req.user) {
            return res.status(401).json({ error: '需要登录' });
        }

        try {
            const { id } = req.params;
            const userId = req.user.id;
            const isAdmin = req.user.role === 'admin';

            const [schematics] = await pool.query(
                'SELECT * FROM schematics WHERE id = ?',
                [id]
            );

            if (schematics.length === 0) {
                return res.status(404).json({ error: '原理图不存在' });
            }

            const schematic = schematics[0];
            if (schematic.user_id !== userId && !isAdmin) {
                return res.status(403).json({ error: '没有权限删除此原理图' });
            }

            console.log(`删除原理图 ID: ${id}, 名称: ${schematic.name}`);

            // Delete from DB
            await pool.execute('DELETE FROM schematics WHERE id = ?', [id]);

            // Delete Files
            if (schematic.folder_name) {
                // New logic: delete the folder
                const folderPath = path.join(__dirname, '../uploads', schematic.folder_name);
                if (fs.existsSync(folderPath)) {
                    fs.rmSync(folderPath, { recursive: true, force: true });
                    console.log(`Deleted folder: ${folderPath}`);
                }
            } else {
                // Legacy logic
                await Schematic.deleteSchematicFiles(schematic);
            }

            res.json({ message: '删除成功' });
        } catch (error) {
            console.error('删除失败:', error);
            res.status(500).json({ error: '删除失败: ' + (error.message || '未知错误') });
        }
    },

    async updateSchematic(req, res) {
        if (!req.user) {
            return res.status(401).json({ error: '需要登录' });
        }

        try {
            const { id } = req.params;
            const { name, is_public, description } = req.body;
            const userId = req.user.id;
            const isAdmin = req.user.role === 'admin';

            const [schematics] = await pool.query(
                'SELECT * FROM schematics WHERE id = ?',
                [id]
            );

            if (schematics.length === 0) {
                return res.status(404).json({ error: '原理图不存在' });
            }

            const schematic = schematics[0];
            if (schematic.user_id !== userId && !isAdmin) {
                return res.status(403).json({ error: '没有权限修改此原理图' });
            }

            const updateData = {};
            if (name !== undefined) updateData.name = name;
            if (is_public !== undefined) updateData.is_public = is_public;

            // Update Database for metadata
            if (Object.keys(updateData).length > 0) {
                await pool.query(
                    'UPDATE schematics SET ? WHERE id = ?',
                    [updateData, id]
                );
            }

            // Update README.md if description is provided and we have a folder
            if (description !== undefined && schematic.folder_name) {
                const readmePath = path.join(__dirname, '../uploads', schematic.folder_name, 'README.md');
                // Ensure directory exists (it should, but safety first)
                const dir = path.dirname(readmePath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                fs.writeFileSync(readmePath, description, 'utf8');
                console.log(`Updated README for schematic ${id} at ${readmePath}`);
            }

            const [updatedSchematic] = await pool.query(
                `SELECT s.*, u.username as creator_name 
                FROM schematics s 
                JOIN users u ON s.user_id = u.id 
                WHERE s.id = ?`,
                [id]
            );

            // Return the full object including the (potentially new) description
            // The client might re-fetch or we can simulate it here, 
            // but for list updates usually just the DB fields enough.
            // If we want to return the description, we'd need to read it back or just pass it through.
            // For now, standard return.
            res.json(updatedSchematic[0]);
        } catch (error) {
            console.error('更新失败:', error);
            res.status(500).json({ error: '更新失败' });
        }
    },

    async getFrontView(req, res) {
        await checkAccessAndServeFile(req, res, 'front_view_path');
    },

    async getSideView(req, res) {
        await checkAccessAndServeFile(req, res, 'side_view_path');
    },

    async getTopView(req, res) {
        await checkAccessAndServeFile(req, res, 'top_view_path');
    },

    async getMaterials(req, res) {
        await checkAccessAndServeFile(req, res, 'materials');
    },

    async downloadSchematic(req, res) {
        await checkAccessAndServeFile(req, res, 'file_path');
    }
};

// 辅助方法：检查访问权限并提供文件
async function checkAccessAndServeFile(req, res, fieldName) {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const isAdmin = req.user?.role === 'admin';

        let query;
        let params;

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

        const [schematics] = await pool.query(query, params);

        if (schematics.length === 0) {
            return res.status(404).json({ error: '原理图不存在或无权访问' });
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

            // Special handling for materials (return JSON)
            if (fieldName === 'materials') {
                if (fs.existsSync(fullPath)) {
                    try {
                        const data = fs.readFileSync(fullPath, 'utf8');
                        return res.json(JSON.parse(data));
                    } catch (e) {
                        return res.json({});
                    }
                } else {
                    return res.json({});
                }
            }

        } else {
            // === LEGACY LOGIC ===

            if (fieldName === 'materials') {
                // Existing materials logic
                if (typeof schematic.materials === 'object' ||
                    (typeof schematic.materials === 'string' && schematic.materials.startsWith('{'))) {
                    try {
                        const materialsData = typeof schematic.materials === 'string'
                            ? JSON.parse(schematic.materials)
                            : schematic.materials;
                        return res.json(materialsData);
                    } catch (error) {
                        return res.status(500).json({ error: '解析材料数据失败' });
                    }
                }
                const filePath = schematic.materials;
                if (!filePath) return res.status(404).json({ error: '材料数据不存在' });

                // Path resolution logic for legacy (pasted from previous)
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
                        return res.json(JSON.parse(fs.readFileSync(fullPath, 'utf8')));
                    } catch (e) { return res.status(500).json({ error: 'Read failed' }); }
                }
                return res.status(404).json({ error: 'Files missing' });
            }

            // Standard file handling
            const filePath = schematic[fieldName];
            if (!filePath) return res.status(404).json({ error: '文件不存在' });

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
            // Just satisfy empty materials if missing
            if (fieldName === 'materials') return res.json({});
            console.error('File missing:', fullPath);
            return res.status(404).json({ error: '文件不存在' });
        }

        // Download headers for file_path
        if (fieldName === 'file_path' && req.path.includes('/download')) {
            // 增加下载计数
            try {
                await pool.execute(
                    'UPDATE schematics SET download_count = COALESCE(download_count, 0) + 1 WHERE id = ?',
                    [id]
                );
            } catch (countErr) {
                console.error('更新下载计数失败:', countErr);
                // 不阻断下载流程
            }

            const filename = schematic.name + '.litematic';
            const containsNonAscii = /[^\x00-\x7F]/.test(filename);
            const encodedFilename = containsNonAscii
                ? `filename*=UTF-8''${encodeURIComponent(filename)}`
                : `filename="${filename}"`;

            res.setHeader('Content-Disposition', `attachment; ${encodedFilename}`);
            res.setHeader('Content-Type', 'application/octet-stream');
        } else {
            // Content type inference
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

module.exports = schematicController; 