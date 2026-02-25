import crypto from 'crypto';
import type { Response } from 'express';
import type { AuthenticatedRequest, Invitation, InvitationWithStatus, CodeCheckResult } from '../types/index.js';

// 内存存储邀请码
const invitationCodes = new Map<string, Invitation>();

// 生成 8 位随机邀请码（大写字母 + 数字）
function generateCode(): string {
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
    createInvitation(req: AuthenticatedRequest, res: Response): void {
        try {
            const { expiresInHours = 24, maxUses = 1 } = req.body;

            // 校验参数
            if (expiresInHours <= 0 || expiresInHours > 720) {
                res.status(400).json({ error: '到期时间须在 1~720 小时之间' });
                return;
            }
            if (maxUses <= 0 || maxUses > 100) {
                res.status(400).json({ error: '最大使用次数须在 1~100 之间' });
                return;
            }

            // 生成唯一码
            let code = generateCode();
            while (invitationCodes.has(code)) {
                code = generateCode();
            }

            const now = new Date();
            const expiresAt = new Date(now.getTime() + expiresInHours * 60 * 60 * 1000);

            const invitation: Invitation = {
                code,
                createdBy: req.user!.id,
                createdByName: req.user!.username,
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
    listInvitations(_req: AuthenticatedRequest, res: Response): void {
        try {
            const list: InvitationWithStatus[] = [];
            const now = new Date();

            for (const [_code, invitation] of invitationCodes) {
                const isExpired = new Date(invitation.expiresAt) <= now;
                const isUsedUp = invitation.usedCount >= invitation.maxUses;

                list.push({
                    ...invitation,
                    status: isExpired ? 'expired' : isUsedUp ? 'used_up' : 'active'
                });
            }

            // 按创建时间倒序
            list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            res.json(list);
        } catch (error) {
            console.error('获取邀请码列表失败:', error);
            res.status(500).json({ error: '获取邀请码列表失败' });
        }
    },

    // 管理员删除邀请码
    deleteInvitation(req: AuthenticatedRequest, res: Response): void {
        try {
            const code = req.params.code as string;

            if (!invitationCodes.has(code)) {
                res.status(404).json({ error: '邀请码不存在' });
                return;
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
    checkCode(code: string): CodeCheckResult {
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
    useCode(code: string): void {
        const invitation = invitationCodes.get(code.toUpperCase());
        if (invitation) {
            invitation.usedCount += 1;
            invitationCodes.set(code.toUpperCase(), invitation);
            console.log(`邀请码已使用: ${code.toUpperCase()}，当前使用次数: ${invitation.usedCount}/${invitation.maxUses}`);
        }
    }
};

export default invitationController;
