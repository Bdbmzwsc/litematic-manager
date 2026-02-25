import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import schematicController from '../controllers/schematicController.js';
import { validateToken, optionalAuth } from '../middleware/auth.js';
import { downloadLimiter } from '../middleware/rateLimit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('创建上传目录:', uploadDir);
}

// 配置 multer 存储
const storage = multer.diskStorage({
    destination: function (_req, _file, cb) {
        cb(null, uploadDir);
    },
    filename: function (_req, file, cb) {
        try {
            const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
            console.log('原始文件名:', file.originalname);
            console.log('转换后文件名:', originalName);

            const cleanName = originalName.split(/[/\\]/).pop()!;
            const timestamp = Date.now();
            const fileName = `${timestamp}_${cleanName}`;

            console.log('最终保存文件名:', fileName);
            cb(null, fileName);
        } catch (error) {
            console.error('文件名处理错误:', error);
            cb(null, `${Date.now()}.litematic`);
        }
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function (_req, file, cb) {
        if (!file.originalname.endsWith('.litematic')) {
            return cb(new Error('只支持 .litematic 文件'));
        }
        cb(null, true);
    }
});

const router = express.Router();

// 需要登录的路由
router.post('/upload', validateToken, upload.single('file'), schematicController.uploadSchematic);
router.delete('/:id', validateToken, schematicController.deleteSchematic);
router.put('/:id', validateToken, schematicController.updateSchematic);

// 可选登录的路由
router.get('/search', optionalAuth, schematicController.searchSchematics);
router.get('/', optionalAuth, schematicController.searchSchematics);
router.get('/:id', optionalAuth, schematicController.getSchematic);
router.get('/:id/front-view', optionalAuth, schematicController.getFrontView);
router.get('/:id/side-view', optionalAuth, schematicController.getSideView);
router.get('/:id/top-view', optionalAuth, schematicController.getTopView);
router.get('/:id/materials', optionalAuth, schematicController.getMaterials);
router.get('/:id/config', validateToken, schematicController.getConfig);
router.put('/:id/config', validateToken, schematicController.updateConfig);
router.get('/:id/download', downloadLimiter, optionalAuth, schematicController.downloadSchematic);

export default router;
