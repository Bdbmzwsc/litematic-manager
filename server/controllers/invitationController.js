const crypto = require('crypto');

// 内存存储邀请码
// Map<code, { code, createdBy, expiresAt, maxUses, usedCount, createdAt }>
const invitationCodes = new Map();

// 生成 8 位随机邀请码（大写字母 + 数字）
function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去掉容易混淆的 I/O/0/1
    let code = '';
    const bytes = crypto.randomBytes(8);
    for (let i = 0; i < 8; i++) {
        code += chars[bytes[i] % chars.length];
    }
    return code;
}

const invitationController = {
    // 管理员创建邀请码
    createInvitation(req, res) {
        try {
            const { expiresInHours = 24, maxUses = 1 } = req.body;

            // 校验参数
            if (expiresInHours <= 0 || expiresInHours > 720) {
                return res.status(400).json({ error: '到期时间须在 1~720 小时之间' });
            }
            if (maxUses <= 0 || maxUses > 100) {
                return res.status(400).json({ error: '最大使用次数须在 1~100 之间' });
            }

            // 生成唯一码
            let code = generateCode();
            while (invitationCodes.has(code)) {
                code = generateCode();
            }

            const now = new Date();
            const expiresAt = new Date(now.getTime() + expiresInHours * 60 * 60 * 1000);

            const invitation = {
                code,
                createdBy: req.user.id,
                createdByName: req.user.username,
                expiresAt: expiresAt.toISOString(),
                maxUses,
                usedCount: 0,
                createdAt: now.toISOString()
            };

            invitationCodes.set(code, invitation);

            console.log(`邀请码已创建: ${code}，到期时间: ${expiresAt.toLocaleString()}，最大使用次数: ${maxUses}`);

            res.status(201).json({
                message: '邀请码创建成功',
                invitation
            });
        } catch (error) {
            console.error('创建邀请码失败:', error);
            res.status(500).json({ error: '创建邀请码失败' });
        }
    },

    // 管理员查看所有邀请码
    listInvitations(req, res) {
        try {
            const list = [];
            const now = new Date();

            for (const [code, invitation] of invitationCodes) {
                const isExpired = new Date(invitation.expiresAt) <= now;
                const isUsedUp = invitation.usedCount >= invitation.maxUses;

                list.push({
                    ...invitation,
                    status: isExpired ? 'expired' : isUsedUp ? 'used_up' : 'active'
                });
            }

            // 按创建时间倒序
            list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            res.json(list);
        } catch (error) {
            console.error('获取邀请码列表失败:', error);
            res.status(500).json({ error: '获取邀请码列表失败' });
        }
    },

    // 管理员删除邀请码
    deleteInvitation(req, res) {
        try {
            const { code } = req.params;

            if (!invitationCodes.has(code)) {
                return res.status(404).json({ error: '邀请码不存在' });
            }

            invitationCodes.delete(code);
            console.log(`邀请码已删除: ${code}`);

            res.json({ message: '邀请码已删除' });
        } catch (error) {
            console.error('删除邀请码失败:', error);
            res.status(500).json({ error: '删除邀请码失败' });
        }
    },

    // 仅校验邀请码（不增加使用次数）
    checkCode(code) {
        if (!code) {
            return { valid: false, error: '请提供邀请码' };
        }

        const invitation = invitationCodes.get(code.toUpperCase());

        if (!invitation) {
            return { valid: false, error: '邀请码无效' };
        }

        const now = new Date();
        if (new Date(invitation.expiresAt) <= now) {
            return { valid: false, error: '邀请码已过期' };
        }

        if (invitation.usedCount >= invitation.maxUses) {
            return { valid: false, error: '邀请码已达使用上限' };
        }

        return { valid: true };
    },

    // 确认使用邀请码
    useCode(code) {
        const invitation = invitationCodes.get(code.toUpperCase());
        if (invitation) {
            invitation.usedCount += 1;
            invitationCodes.set(code.toUpperCase(), invitation);
            console.log(`邀请码已使用: ${code.toUpperCase()}，当前使用次数: ${invitation.usedCount}/${invitation.maxUses}`);
        }
    }
};

module.exports = invitationController;
