import pool from './config/database.js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import type { RowDataPacket } from 'mysql2';

dotenv.config();

const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

interface AdminRow extends RowDataPacket {
    id: number;
    username: string;
    role: string;
}

async function createAdminUser(): Promise<void> {
    try {
        console.log('开始创建管理员账户...');

        const [existingAdmins] = await pool.query<AdminRow[]>(
            'SELECT * FROM users WHERE role = "admin"'
        );

        if (existingAdmins.length > 0) {
            console.log('已存在管理员账户:', existingAdmins.map(admin => admin.username).join(', '));
            console.log('如需使用现有管理员账户，请使用以下账户名登录:');
            existingAdmins.forEach(admin => {
                console.log(`- 用户名: ${admin.username}`);
            });
            console.log('密码: 请使用创建时设置的密码');
        } else {
            const adminUser = {
                username: 'admin',
                password: DEFAULT_ADMIN_PASSWORD,
                email: 'admin@example.com',
                role: 'admin'
            };

            const hashedPassword = await bcrypt.hash(adminUser.password, 10);

            await pool.query(
                'INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)',
                [adminUser.username, hashedPassword, adminUser.email, adminUser.role]
            );

            console.log('管理员账户创建成功!');
            console.log('管理员账户信息:');
            console.log(`- 用户名: ${adminUser.username}`);
            console.log(`- 密码: ${adminUser.password}`);
            console.log(`- 邮箱: ${adminUser.email}`);
            console.log(`- 角色: ${adminUser.role}`);
        }
    } catch (error) {
        console.error('创建管理员账户失败:', error);
    } finally {
        pool.end();
    }
}

createAdminUser();
