import type { Response, NextFunction } from 'express';
import { verifyJWE } from '../utils/JWEUtils.js';
import type { AuthenticatedRequest } from '../types/index.js';

export const validateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        res.status(401).json({ error: '未提供认证令牌' });
        return;
    }

    const decoded = await verifyJWE(token, process.env.JWT_SECRET!, process.env.JWT_ISSUER!);
    if (decoded.error) {
        res.status(401).json({ error: '无效的认证令牌' });
        return;
    }
    req.user = decoded.payload;
    next();
};

export const optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        console.log('未提供认证令牌，以未登录身份访问');
        next();
        return;
    }
    const decoded = await verifyJWE(token, process.env.JWT_SECRET!, process.env.JWT_ISSUER!);
    if (decoded.error)
        console.log('invaild token.', decoded.error);
    req.user = decoded.payload;
    console.log(`用户已登录: ID=${decoded.payload?.id}, 角色=${decoded.payload?.role || '普通用户'}`);

    next();
};

export const isAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (req.user?.role !== 'admin') {
        res.status(403).json({ error: '需要管理员权限' });
        return;
    }
    next();
};
