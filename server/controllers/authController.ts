import bcrypt from 'bcrypt';
import { createJWE } from '../utils/JWEUtils.js';
import pool from '../config/database.js';
import invitationController from './invitationController.js';
import type { Response } from 'express';
import type { AuthenticatedRequest, SchematicRecord } from '../types/index.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

const authController = {
    async register(req: AuthenticatedRequest, res: Response): Promise<void> {
        const { username, password, email, invitationCode } = req.body;

        try {
            // 1. 校验邀请码（仅校验，不增加次数）
            const codeResult = invitationController.checkCode(invitationCode);
            if (!codeResult.valid) {
                res.status(400).json({ error: codeResult.error });
                return;
            }

            // 2. 检查用户名和邮箱是否已存在
            const [existing] = await pool.query<RowDataPacket[]>(
                'SELECT * FROM users WHERE username = ? OR email = ?',
                [username, email]
            );

            if (existing.length > 0) {
                res.status(400).json({ error: '用户名或邮箱已存在' });
                return;
            }

            // 3. 加密密码
            const hashedPassword = await bcrypt.hash(password, 10);

            // 4. 创建用户（角色固定为 user）
            const [result] = await pool.query<ResultSetHeader>(
                'INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)',
                [username, hashedPassword, email, 'user']
            );

            // 5. 注册成功后，正式使用邀请码（增加使用次数）
            invitationController.useCode(invitationCode);

            res.status(201).json({
                message: '注册成功',
                userId: result.insertId
            });
        } catch (error) {
            console.error('注册失败:', error);
            res.status(500).json({ error: '注册失败' });
        }
    },

    async login(req: AuthenticatedRequest, res: Response): Promise<void> {
        const { username, password } = req.body;

        try {
            const [users] = await pool.query<RowDataPacket[]>(
                'SELECT * FROM users WHERE username = ?',
                [username]
            );

            if (users.length === 0) {
                res.status(401).json({ error: '用户名或密码错误' });
                return;
            }

            const user = users[0];
            const validPassword = await bcrypt.compare(password, user.password);

            if (!validPassword) {
                res.status(401).json({ error: '用户名或密码错误' });
                return;
            }

            const token = await createJWE(
                {
                    id: user.id,
                    username: user.username,
                    role: user.role
                },
                process.env.JWT_SECRET!,
                process.env.JWT_ISSUER!,
                process.env.JWT_EXPIRES_IN!
            );

            res.json({
                token: token.jwt,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role
                }
            });
        } catch (error) {
            console.error('登录失败:', error);
            res.status(500).json({ error: '登录失败' });
        }
    },

    async getCurrentUser(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const [users] = await pool.query<RowDataPacket[]>(
                'SELECT id, username, email, role FROM users WHERE id = ?',
                [req.user!.id]
            );

            if (users.length === 0) {
                res.status(404).json({ error: '用户不存在' });
                return;
            }

            res.json(users[0]);
        } catch (error) {
            console.error('获取用户信息失败:', error);
            res.status(500).json({ error: '获取用户信息失败' });
        }
    },

    async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
        const { currentPassword, newPassword } = req.body;

        try {
            const [users] = await pool.query<RowDataPacket[]>(
                'SELECT * FROM users WHERE id = ?',
                [req.user!.id]
            );

            if (users.length === 0) {
                res.status(404).json({ error: '用户不存在' });
                return;
            }

            const user = users[0];
            const validPassword = await bcrypt.compare(currentPassword, user.password);

            if (!validPassword) {
                res.status(401).json({ error: '当前密码错误' });
                return;
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await pool.query(
                'UPDATE users SET password = ? WHERE id = ?',
                [hashedPassword, req.user!.id]
            );

            res.json({ message: '密码修改成功' });
        } catch (error) {
            console.error('修改密码失败:', error);
            res.status(500).json({ error: '修改密码失败' });
        }
    }
};

export default authController;
