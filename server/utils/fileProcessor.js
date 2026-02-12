const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const FormData = require('form-data');

// 配置信息
const config = {
    // litematic-viewer-server 配置
    viewerServer: {
        //host: 'http://localhost:3000',
        host: process.env.RENDER_SERVER_URL || 'http://localhost:3004',
        uploadEndpoint: '/api/upload',
        downloadEndpoint: '/api/download'
    },
    // 存储路径配置
    storage: {
        baseDir: path.join(__dirname, '../uploads'),  // 修正为server目录下的uploads文件夹
        processedDir: path.join(__dirname, '../uploads/processed')  // 相应修正processed子目录
    }
};

const RENDER_SERVER_BASE_URL = process.env.RENDER_SERVER_URL || 'http://localhost:3004'; // 使用环境变量，并提供默认值

async function processLitematicFile(filePath, targetDir) {
    try {
        console.log('开始处理文件:', filePath);

        // 检查文件是否存在
        if (!fs.existsSync(filePath)) {
            throw new Error(`文件不存在: ${filePath}`);
        }

        // 获取文件名用于临时标识
        const tempName = Date.now().toString();

        // 创建 FormData 实例
        const formData = new FormData();

        // 直接使用文件流
        formData.append('file', fs.createReadStream(filePath), `upload.litematic`);

        // 调用 litematic-viewer-server API
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

        const processId = response.data.processId;
        const views = response.data.views || [];
        const materials = response.data.materials;
        // const original = response.data.original; // We use our local source file

        console.log('文件处理成功，开始下载结果文件');

        // 确保输出目录存在
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        // 视图文件 - 标准化文件名
        const viewPaths = {};
        await Promise.all(
            views.map(async (view, index) => {
                try {
                    const viewType = getViewType(view, index); // front, side, top
                    const targetFilename = `${viewType}.png`;
                    const tempFilePath = await downloadFile(processId, view, targetDir, targetFilename, tempName);

                    if (viewType === 'front') viewPaths.frontViewPath = targetFilename;
                    if (viewType === 'side') viewPaths.sideViewPath = targetFilename;
                    if (viewType === 'top') viewPaths.topViewPath = targetFilename;

                    return tempFilePath;
                } catch (error) {
                    console.error(`下载视图文件失败: ${error.message}`);
                    throw error;
                }
            })
        );

        // 材料文件 - 标准化文件名
        let materialsPath = null;
        try {
            const materialsFileName = materials;
            const targetFilename = `materials.json`;
            await downloadFile(processId, materialsFileName, targetDir, targetFilename, tempName);
            materialsPath = targetFilename;
        } catch (error) {
            console.error(`下载材料列表失败: ${error.message}`);
            // Don't throw, just log
        }

        console.log('所有文件下载完成');

        // 返回结果 - 返回的是文件名，因为都在同一个目录下
        return {
            topViewPath: viewPaths.topViewPath,
            sideViewPath: viewPaths.sideViewPath,
            frontViewPath: viewPaths.frontViewPath,
            materials: materialsPath,
            original: path.basename(filePath)
        };
    } catch (error) {
        console.error('文件处理失败:', error.message);
        if (error.response) {
            console.error('服务器响应:', {
                status: error.response.status,
                statusText: error.response.statusText,
                data: error.response.data
            });
        }

        throw new Error(`文件处理失败: ${error.message}`);
    }
}

// 根据视图文件名或索引确定视图类型
function getViewType(filename, index) {
    if (filename.includes('frontView')) return 'front';
    if (filename.includes('sideView')) return 'side';
    if (filename.includes('topView')) return 'top';

    // 如果文件名不包含视图类型，根据索引确定
    if (index === 0) return 'front';
    if (index === 1) return 'side';
    if (index === 2) return 'top';

    return `view${index + 1}`;
}

async function downloadFile(processId, filename, targetDir, newName, tempName) {
    try {
        // 根据示例的正确URL格式构建
        const encodedFilename = encodeURIComponent(filename);

        // 构建完整的处理ID路径部分，格式应为：timestamp_uuid
        const fullProcessId = `${tempName}_${processId}`;

        // 构建完整的URL
        const url = `${RENDER_SERVER_BASE_URL}${config.viewerServer.downloadEndpoint}/${fullProcessId}/${encodedFilename}`;

        const response = await axios.get(url, {
            responseType: 'stream',
            timeout: 30000, // 30秒超时
            validateStatus: status => status >= 200 && status < 300
        });

        const filePath = path.join(targetDir, newName);

        // 确保目录存在
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            let error = null;
            writer.on('error', err => {
                error = err;
                writer.close();
                reject(err);
            });
            writer.on('close', () => {
                if (!error) {
                    // 计算相对于uploads目录的路径
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
        console.error(`下载文件失败 (${filename}):`, error.message);
        if (error.response) {
            console.error('下载服务器响应:', {
                status: error.response.status,
                statusText: error.response.statusText
            });
        }
        throw error;
    }
}

module.exports = {
    processLitematicFile
}; 