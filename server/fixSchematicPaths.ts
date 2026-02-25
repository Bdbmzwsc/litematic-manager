import pool from './config/database.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import type { RowDataPacket } from 'mysql2';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SchematicRow extends RowDataPacket {
    id: number;
    name: string;
    file_path: string | null;
    top_view_path: string | null;
    side_view_path: string | null;
    front_view_path: string | null;
}

interface ProcessedDirInfo {
    path: string;
    timestamp: string;
    files: string[];
}

function findFileInDirectory(directoryPath: string, matchFunction: (file: string) => boolean): string | null {
    if (!fs.existsSync(directoryPath)) {
        return null;
    }

    const files = fs.readdirSync(directoryPath);

    for (const file of files) {
        const fullPath = path.join(directoryPath, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            const result = findFileInDirectory(fullPath, matchFunction);
            if (result) {
                return result;
            }
        } else if (matchFunction(file)) {
            return fullPath;
        }
    }

    return null;
}

function findProcessedDirs(): ProcessedDirInfo[] {
    const uploadsDir = path.join(__dirname, 'uploads');
    const processedDir = path.join(uploadsDir, 'processed');

    if (!fs.existsSync(processedDir)) {
        console.log('processed目录不存在:', processedDir);
        return [];
    }

    try {
        const dirs = fs.readdirSync(processedDir);
        return dirs.map(dir => {
            const fullPath = path.join(processedDir, dir);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                return {
                    path: fullPath,
                    timestamp: dir,
                    files: fs.readdirSync(fullPath)
                };
            }
            return null;
        }).filter((item): item is ProcessedDirInfo => item !== null);
    } catch (error) {
        console.error('读取processed目录失败:', error);
        return [];
    }
}

function getRelativePath(absolutePath: string): string | null {
    if (!absolutePath) return null;

    try {
        const uploadsDir = path.join(__dirname, 'uploads');
        const relativePath = path.relative(uploadsDir, absolutePath).replace(/\\/g, '/');
        return relativePath;
    } catch (error) {
        console.error('获取相对路径失败:', error);
        return null;
    }
}

async function fixSchematicPaths(): Promise<void> {
    try {
        console.log('开始修复原理图文件路径...');

        const [schematics] = await pool.query<SchematicRow[]>('SELECT * FROM schematics');
        console.log(`数据库中共有 ${schematics.length} 个原理图记录`);

        const processedDirs = findProcessedDirs();
        console.log(`找到 ${processedDirs.length} 个processed目录`);

        for (const schematic of schematics) {
            console.log(`\n处理原理图 ID: ${schematic.id}, 名称: ${schematic.name}`);

            let matchedDir: ProcessedDirInfo | null = null;

            if (schematic.file_path && schematic.file_path.match(/^\d+_/)) {
                const timestampMatch = schematic.file_path.match(/^(\d+)_/);
                if (timestampMatch && timestampMatch[1]) {
                    const timestamp = timestampMatch[1];

                    for (let i = 0; i < 10; i++) {
                        const adjustedTimestamp = parseInt(timestamp) + i;
                        const possibleMatch = processedDirs.find(dir =>
                            dir.timestamp === adjustedTimestamp.toString());

                        if (possibleMatch) {
                            matchedDir = possibleMatch;
                            console.log(`找到匹配的目录 (时间戳+${i}): ${matchedDir.path}`);
                            break;
                        }
                    }
                }
            }

            if (!matchedDir) {
                const pureNameMatch = schematic.name.match(/^(?:\d+_)?(.+)$/);
                const pureName = pureNameMatch ? pureNameMatch[1] : schematic.name;

                for (const dir of processedDirs) {
                    if (dir.files.some(file => file.includes(pureName) || file === 'original.litematic')) {
                        matchedDir = dir;
                        console.log(`找到名称匹配的目录: ${matchedDir.path}`);
                        break;
                    }
                }
            }

            if (matchedDir) {
                const originalFile = path.join(matchedDir.path, 'original.litematic');
                const topViewFile = path.join(matchedDir.path, 'top.png');
                const sideViewFile = path.join(matchedDir.path, 'side.png');
                const frontViewFile = path.join(matchedDir.path, 'front.png');

                const originalExists = fs.existsSync(originalFile);
                const topViewExists = fs.existsSync(topViewFile);
                const sideViewExists = fs.existsSync(sideViewFile);
                const frontViewExists = fs.existsSync(frontViewFile);

                const relOriginalFile = originalExists ? getRelativePath(originalFile) : null;
                const relTopViewFile = topViewExists ? getRelativePath(topViewFile) : null;
                const relSideViewFile = sideViewExists ? getRelativePath(sideViewFile) : null;
                const relFrontViewFile = frontViewExists ? getRelativePath(frontViewFile) : null;

                console.log('新的文件路径:');
                console.log('- 原始文件:', relOriginalFile || '不存在');
                console.log('- 顶视图:', relTopViewFile || '不存在');
                console.log('- 侧视图:', relSideViewFile || '不存在');
                console.log('- 正视图:', relFrontViewFile || '不存在');

                const updateData: Record<string, string> = {};
                if (relOriginalFile) updateData.file_path = relOriginalFile;
                if (relTopViewFile) updateData.top_view_path = relTopViewFile;
                if (relSideViewFile) updateData.side_view_path = relSideViewFile;
                if (relFrontViewFile) updateData.front_view_path = relFrontViewFile;

                if (Object.keys(updateData).length > 0) {
                    await pool.query(
                        'UPDATE schematics SET ? WHERE id = ?',
                        [updateData, schematic.id]
                    );
                    console.log(`成功更新原理图 ID: ${schematic.id} 的路径`);
                } else {
                    console.log(`没有找到有效的文件路径，跳过更新 ID: ${schematic.id}`);
                }
            } else {
                console.log(`未找到匹配的processed目录，无法修复 ID: ${schematic.id}`);
            }
        }

        console.log('\n路径修复完成!');

    } catch (error) {
        console.error('修复原理图路径时出错:', error);
    } finally {
        pool.end();
    }
}

fixSchematicPaths();
