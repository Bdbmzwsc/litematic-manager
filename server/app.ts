import 'dotenv/config';

import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import schematicsRouter from './routes/schematics.js';
import authRouter from './routes/auth.js';
import invitationRouter from './routes/invitation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 中间件配置
app.use(cors());
app.use(express.json());

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    setHeaders: (res: Response, filePath: string) => {
        console.log('访问静态文件:', filePath);
        if (filePath.endsWith('.png')) {
            res.setHeader('Content-Type', 'image/png');
        } else if (filePath.endsWith('.litematic')) {
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', 'attachment');
        } else if (filePath.endsWith('.json')) {
            res.setHeader('Content-Type', 'application/json');
        }
    }
}));

// 请求日志
app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`请求方法: ${req.method}, 请求路径: ${req.url}`);
    next();
});

// 路由配置
app.use('/api/auth', authRouter);
app.use('/api/invitations', invitationRouter);
app.use('/api/schematics', schematicsRouter);

// 错误处理中间件
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('服务器错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
});

export { app };

if (process.env.NODE_ENV !== 'test') {
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
        console.log(`服务器运行在端口 ${PORT}`);
    });
}
