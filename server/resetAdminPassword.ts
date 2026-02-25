import pool from './config/database.js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import type { RowDataPacket } from 'mysql2';

dotenv.config();

const NEW_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

interface AdminRow extends RowDataPacket {
    id: number;
    username: string;
}

async function resetAdminPassword(): Promise<void> {
    try {
        console.log('开始重置管理员密码...');

        const [admins] = await pool.query<AdminRow[]>(
            'SELECT * FROM users WHERE role = "admin" AND username = "admin"'
        );

        if (admins.length === 0) {
            console.log('未找到管理员账户，请先创建管理员账户。');
            return;
        }

        const admin = admins[0];
        console.log(`找到管理员账户: ${admin.username} (ID: ${admin.id})`);

        const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 10);

        await pool.query(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, admin.id]
        );

        console.log('管理员密码重置成功!');
        console.log('新登录信息:');
        console.log(`- 用户名: ${admin.username}`);
        console.log(`- 密码: ${NEW_PASSWORD}`);
    } catch (error) {
        console.error('重置管理员密码失败:', error);
    } finally {
        pool.end();
    }
}

resetAdminPassword();
