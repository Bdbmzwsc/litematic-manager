/**
 * 添加 download_count 列到 schematics 表
 * 运行方式: node add_download_count.js
 */
require('dotenv').config();
const pool = require('./server/config/database');

async function migrate() {
    try {
        console.log('正在添加 download_count 列...');
        await pool.execute(
            'ALTER TABLE schematics ADD COLUMN download_count INT DEFAULT 0'
        );
        console.log('✅ download_count 列添加成功');
    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('⚠️ download_count 列已存在，跳过');
        } else {
            console.error('❌ 迁移失败:', error);
        }
    } finally {
        process.exit(0);
    }
}

migrate();
