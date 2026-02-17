const express = require('express');
const router = express.Router();
const invitationController = require('../controllers/invitationController');
const { validateToken, isAdmin } = require('../middleware/auth');

// 所有邀请码管理路由均需管理员权限
router.post('/', validateToken, isAdmin, invitationController.createInvitation);
router.get('/', validateToken, isAdmin, invitationController.listInvitations);
router.delete('/:code', validateToken, isAdmin, invitationController.deleteInvitation);

module.exports = router;
