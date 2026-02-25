import pool from '../config/database.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SchematicData {
    name: string;
    filePath?: string | null;
    topViewPath?: string | null;
    sideViewPath?: string | null;
    frontViewPath?: string | null;
    materials?: string | null;
    user_id?: number;
    is_public?: boolean;
}

interface SchematicRow extends RowDataPacket {
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
}

class Schematic {
    static async create(data: SchematicData): Promise<number> {
        const { name, filePath, topViewPath, sideViewPath, frontViewPath, materials, user_id, is_public } = data;

        const relativePaths = {
            filePath: filePath ? this.getRelativePath(filePath) : null,
            topViewPath: topViewPath ? this.getRelativePath(topViewPath) : null,
            sideViewPath: sideViewPath ? this.getRelativePath(sideViewPath) : null,
            frontViewPath: frontViewPath ? this.getRelativePath(frontViewPath) : null,
            materials: materials ? this.getRelativePath(materials) : null
        };

        let materialsJson = '{}';
        try {
            if (materials) {
                if (typeof materials === 'string' && materials.startsWith('{')) {
                    materialsJson = materials;
                } else {
                    const materialsPath = this.getAbsolutePath(relativePaths.materials);

                    if (materialsPath && fs.existsSync(materialsPath)) {
                        materialsJson = fs.readFileSync(materialsPath, 'utf8');
                        console.log('读取材料文件成功');
                    } else {
                        console.warn('材料文件不存在');
                    }
                }
            }
        } catch (error) {
            console.error('读取材料文件失败:', error);
        }

        const [result] = await pool.execute<ResultSetHeader>(
            'INSERT INTO schematics (name, file_path, top_view_path, side_view_path, front_view_path, materials, user_id, is_public) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [
                name,
                relativePaths.filePath,
                relativePaths.topViewPath,
                relativePaths.sideViewPath,
                relativePaths.frontViewPath,
                materialsJson,
                user_id || 1,
                is_public === undefined ? true : is_public
            ]
        );
        return result.insertId;
    }

    static async search(keyword?: string): Promise<SchematicRow[]> {
        let query = 'SELECT * FROM schematics';
        const params: string[] = [];

        if (keyword) {
            query += ' WHERE name LIKE ?';
            params.push(`%${keyword}%`);
        }

        query += ' ORDER BY created_at DESC';

        const [rows] = await pool.execute<SchematicRow[]>(query, params);
        return rows;
    }

    static async getById(id: number): Promise<SchematicRow | undefined> {
        const [rows] = await pool.execute<SchematicRow[]>(
            'SELECT * FROM schematics WHERE id = ?',
            [id]
        );
        return rows[0];
    }

    static async update(id: number, data: { name: string }): Promise<void> {
        const { name } = data;
        await pool.execute(
            'UPDATE schematics SET name = ? WHERE id = ?',
            [name, id]
        );
    }

    static async delete(id: number): Promise<{ success: boolean } | undefined> {
        try {
            const schematic = await this.getById(id);
            if (!schematic) {
                console.warn(`找不到ID为${id}的原理图`);
                return;
            }

            console.log('准备删除原理图:', schematic);

            await pool.execute(
                'DELETE FROM schematics WHERE id = ?',
                [id]
            );

            await this.deleteSchematicFiles(schematic);

            return { success: true };
        } catch (error) {
            console.error('删除原理图失败:', error);
            throw error;
        }
    }

    static async deleteSchematicFiles(schematic: SchematicRow): Promise<void> {
        if (!schematic) return;

        let processedDir: string | null = null;
        const viewPaths = [
            schematic.top_view_path,
            schematic.side_view_path,
            schematic.front_view_path
        ];

        for (const filePath of viewPaths) {
            if (!filePath) continue;

            if (filePath.includes('processed/')) {
                const match = filePath.match(/^(processed\/\d+)/);
                if (match && match[1]) {
                    processedDir = match[1];
                    break;
                }
            }
        }

        if (processedDir) {
            try {
                const absoluteDir = this.getAbsolutePath(processedDir);
                if (absoluteDir && fs.existsSync(absoluteDir)) {
                    fs.rmSync(absoluteDir, { recursive: true, force: true });
                    console.log(`删除原理图文件目录: ${processedDir}`);
                }
            } catch (error) {
                console.error(`删除目录失败:`, error);
            }
        } else {
            console.log('未找到原理图的processed目录');
        }
    }

    static getRelativePath(absolutePath: string): string | null {
        if (!absolutePath) return null;

        try {
            if (!path.isAbsolute(absolutePath)) {
                return absolutePath;
            }

            const normalizedPath = path.normalize(absolutePath);
            const uploadsDir = path.join(__dirname, '../uploads');
            const normalizedUploadsDir = path.normalize(uploadsDir);

            if (normalizedPath.startsWith(normalizedUploadsDir)) {
                const relativePath = path.relative(normalizedUploadsDir, normalizedPath).replace(/\\/g, '/');
                return relativePath;
            }

            return path.basename(normalizedPath);
        } catch (error) {
            console.error('处理相对路径错误:', error);
            return path.basename(absolutePath);
        }
    }

    static getAbsolutePath(relativePath: string | null): string | null {
        if (!relativePath || typeof relativePath !== 'string') return null;

        try {
            const uploadsDir = path.join(__dirname, '../uploads');

            if (path.isAbsolute(relativePath) && fs.existsSync(relativePath)) {
                return relativePath;
            }

            const absolutePath = path.join(uploadsDir, relativePath);

            if (!fs.existsSync(absolutePath)) {
                console.error('文件不存在:', absolutePath);
            }

            return absolutePath;
        } catch (error) {
            console.error('处理绝对路径错误:', error);
            return null;
        }
    }

    static async getMaterialsData(materialsPath: unknown): Promise<Record<string, unknown>> {
        try {
            if (typeof materialsPath === 'object' && materialsPath !== null) {
                return materialsPath as Record<string, unknown>;
            }

            if (typeof materialsPath === 'string' && materialsPath.startsWith('{')) {
                return JSON.parse(materialsPath);
            }

            const fullPath = this.getAbsolutePath(materialsPath as string);
            if (fullPath && fs.existsSync(fullPath)) {
                const data = fs.readFileSync(fullPath, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('读取材料文件失败:', error);
        }
        return {};
    }
}

export default Schematic;
