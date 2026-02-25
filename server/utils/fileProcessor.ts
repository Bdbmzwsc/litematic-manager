import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';
import type { ProcessedResult, ViewerServerConfig, StorageConfig } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置信息
const config: { viewerServer: ViewerServerConfig; storage: StorageConfig } = {
    viewerServer: {
        host: process.env.RENDER_SERVER_URL || 'http://localhost:3004',
        uploadEndpoint: '/api/upload',
        downloadEndpoint: '/api/download'
    },
    storage: {
        baseDir: path.join(__dirname, '../uploads'),
        processedDir: path.join(__dirname, '../uploads/processed')
    }
};

const RENDER_SERVER_BASE_URL = process.env.RENDER_SERVER_URL || 'http://localhost:3004';

export async function processLitematicFile(filePath: string, targetDir: string): Promise<ProcessedResult> {
    try {
        console.log('开始处理文件:', filePath);

        if (!fs.existsSync(filePath)) {
            throw new Error(`文件不存在: ${filePath}`);
        }

        const tempName = Date.now().toString();

        const formData = new FormData();
        formData.append('file', fs.createReadStream(filePath), `upload.litematic`);

        const uploadUrl = `${RENDER_SERVER_BASE_URL}${config.viewerServer.uploadEndpoint}`;

        const response = await axios.post(uploadUrl, formData, {
            headers: {
                ...formData.getHeaders()
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        if (!response.data.success) {
            throw new Error(`服务器处理失败: ${response.data.error || '未知错误'}`);
        }

        const processId: string = response.data.processId;
        const views: string[] = response.data.views || [];
        const materials: string = response.data.materials;

        console.log('文件处理成功，开始下载结果文件');

        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const viewPaths: Partial<Record<'frontViewPath' | 'sideViewPath' | 'topViewPath', string>> = {};
        await Promise.all(
            views.map(async (view, index) => {
                try {
                    const viewType = getViewType(view, index);
                    const targetFilename = `${viewType}.png`;
                    const tempFilePath = await downloadFile(processId, view, targetDir, targetFilename, tempName);

                    if (viewType === 'front') viewPaths.frontViewPath = targetFilename;
                    if (viewType === 'side') viewPaths.sideViewPath = targetFilename;
                    if (viewType === 'top') viewPaths.topViewPath = targetFilename;

                    return tempFilePath;
                } catch (error) {
                    console.error(`下载视图文件失败: ${(error as Error).message}`);
                    throw error;
                }
            })
        );

        let materialsPath: string | null = null;
        try {
            const targetFilename = `materials.json`;
            await downloadFile(processId, materials, targetDir, targetFilename, tempName);
            materialsPath = targetFilename;
        } catch (error) {
            console.error(`下载材料列表失败: ${(error as Error).message}`);
        }

        console.log('所有文件下载完成');

        return {
            topViewPath: viewPaths.topViewPath,
            sideViewPath: viewPaths.sideViewPath,
            frontViewPath: viewPaths.frontViewPath,
            materials: materialsPath,
            original: path.basename(filePath)
        };
    } catch (error) {
        const err = error as Error & { response?: { status: number; statusText: string; data: unknown } };
        console.error('文件处理失败:', err.message);
        if (err.response) {
            console.error('服务器响应:', {
                status: err.response.status,
                statusText: err.response.statusText,
                data: err.response.data
            });
        }

        throw new Error(`文件处理失败: ${err.message}`);
    }
}

function getViewType(filename: string, index: number): string {
    if (filename.includes('frontView')) return 'front';
    if (filename.includes('sideView')) return 'side';
    if (filename.includes('topView')) return 'top';

    if (index === 0) return 'front';
    if (index === 1) return 'side';
    if (index === 2) return 'top';

    return `view${index + 1}`;
}

async function downloadFile(
    processId: string,
    filename: string,
    targetDir: string,
    newName: string,
    tempName: string
): Promise<string> {
    try {
        const encodedFilename = encodeURIComponent(filename);
        const fullProcessId = `${tempName}_${processId}`;
        const url = `${RENDER_SERVER_BASE_URL}${config.viewerServer.downloadEndpoint}/${fullProcessId}/${encodedFilename}`;

        const response = await axios.get(url, {
            responseType: 'stream',
            timeout: 30000,
            validateStatus: (status: number) => status >= 200 && status < 300
        });

        const filePath = path.join(targetDir, newName);

        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            let error: Error | null = null;
            writer.on('error', (err: Error) => {
                error = err;
                writer.close();
                reject(err);
            });
            writer.on('close', () => {
                if (!error) {
                    const uploadsDir = path.join(__dirname, '../uploads');
                    const relativePath = path.relative(uploadsDir, filePath).replace(/\\/g, '/');
                    resolve(relativePath);
                }
            });
            writer.on('finish', () => {
                writer.close();
            });
        });
    } catch (error) {
        const err = error as Error & { response?: { status: number; statusText: string } };
        console.error(`下载文件失败 (${filename}):`, err.message);
        if (err.response) {
            console.error('下载服务器响应:', {
                status: err.response.status,
                statusText: err.response.statusText
            });
        }
        throw error;
    }
}
