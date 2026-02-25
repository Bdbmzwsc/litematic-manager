import express from 'express';
import invitationController from '../controllers/invitationController.js';
import { validateToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// 所有邀请码管理路由均需管理员权限
router.post('/', validateToken, isAdmin, invitationController.createInvitation);
router.get('/', validateToken, isAdmin, invitationController.listInvitations);
router.delete('/:code', validateToken, isAdmin, invitationController.deleteInvitation);

export default router;
