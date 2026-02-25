import express from 'express';
import authController from '../controllers/authController.js';
import { validateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', validateToken, authController.getCurrentUser);
router.put('/password', validateToken, authController.changePassword);

export default router;
