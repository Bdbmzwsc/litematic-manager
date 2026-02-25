import rateLimit from 'express-rate-limit';

// 下载接口限流：每个IP每分钟最多5次
export const downloadLimiter = rateLimit({
    windowMs: 60 * 1000,   // 1分钟窗口
    max: 5,                 // 每个窗口最多5次请求
    message: { error: '下载请求过于频繁，请稍后再试' },
    standardHeaders: true,  // 返回 RateLimit-* 标准头
    legacyHeaders: false,
});
