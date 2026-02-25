import mysql, { type Pool, type PoolConnection } from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 如果 dotenv/config 还没加载 .env，手动加载
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool: Pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'litematic',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// 添加日志
pool.on('connection', (connection: PoolConnection) => {
    console.log('数据库连接已建立');
    connection.on('error', (err: Error) => {
        console.error('数据库连接错误:', err);
    });
    connection.on('close', () => {
        console.log('数据库连接已关闭');
    });
});

pool.getConnection()
    .then(connection => {
        console.log('成功连接到数据库');
        connection.release();
    })
    .catch(err => {
        console.error('数据库连接失败:', err);
    });

export default pool;
