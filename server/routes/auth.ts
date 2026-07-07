import express from 'express';
import authController from '../controllers/authController.js';
import { validateToken } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const avatarDir = path.join(__dirname, '../uploads/avatars');
if (!fs.existsSync(avatarDir)) {
    fs.mkdirSync(avatarDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (_req, _file, cb) {
        cb(null, avatarDir);
    },
    filename: function (req, file, cb) {
        const userId = req.user?.id || 'unknown';
        const ext = path.extname(file.originalname);
        cb(null, `user_${userId}_${Date.now()}${ext}`);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('只允许上传图片'));
        }
        cb(null, true);
    }
});

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', validateToken, authController.getCurrentUser);
router.put('/password', validateToken, authController.changePassword);
router.put('/profile', validateToken, authController.updateProfile);
router.post('/avatar', validateToken, upload.single('avatar'), authController.uploadAvatar);
router.get('/users/:username', authController.getPublicProfile);

export default router;
