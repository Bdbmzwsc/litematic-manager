import pool from './config/database.js';
import type { RowDataPacket } from 'mysql2';

interface UserRow extends RowDataPacket {
    id: number;
    username: string;
    email: string;
    role: string;
    password: string;
}

interface SchematicRow extends RowDataPacket {
    id: number;
    name: string;
    user_id: number;
    is_public: boolean;
}

async function checkAndFixAdminAccount(): Promise<void> {
    try {
        console.log('开始检查管理员账户状态...');

        const [users] = await pool.query<UserRow[]>('SELECT * FROM users');
        console.log(`系统中共有 ${users.length} 个用户账户`);

        const admins = users.filter(user => user.role === 'admin');
        console.log(`管理员账户数量: ${admins.length}`);

        const adminUser = users.find(user => user.username === 'admin');

        if (adminUser) {
            console.log(`找到admin用户 (ID: ${adminUser.id}):`);
            console.log(`- 用户名: ${adminUser.username}`);
            console.log(`- 角色: ${adminUser.role}`);
            console.log(`- 电子邮件: ${adminUser.email}`);

            if (adminUser.role !== 'admin') {
                console.log('admin用户不是管理员，正在修复...');

                await pool.query(
                    'UPDATE users SET role = ? WHERE id = ?',
                    ['admin', adminUser.id]
                );

                console.log('已将admin用户角色更新为管理员');
            } else {
                console.log('admin用户已经具有管理员权限，无需修复');
            }
        } else {
            console.log('系统中不存在用户名为admin的用户，请运行createAdmin.js创建管理员账户');
        }

        const [allSchematics] = await pool.query<SchematicRow[]>('SELECT * FROM schematics');
        console.log(`系统中共有 ${allSchematics.length} 个原理图`);

        const [privateSchematics] = await pool.query<SchematicRow[]>('SELECT * FROM schematics WHERE is_public = false');
        console.log(`其中私有原理图: ${privateSchematics.length} 个`);

        if (privateSchematics.length > 0) {
            console.log('\n私有原理图信息:');
            privateSchematics.forEach((schematic, index) => {
                console.log(`${index + 1}. ID: ${schematic.id}, 名称: ${schematic.name}, 所有者ID: ${schematic.user_id}`);
            });
        }

    } catch (error) {
        console.error('检查账户失败:', error);
    } finally {
        pool.end();
    }
}

checkAndFixAdminAccount();
