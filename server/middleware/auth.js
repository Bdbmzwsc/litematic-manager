const { verifyJWE } = require('../utils/JWEUtils');

const validateToken = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: '未提供认证令牌' });
    }

    const decoded = await verifyJWE(token, process.env.JWT_SECRET, process.env.JWT_ISSUER);
    if (decoded.error)
        res.status(401).json({ error: '无效的认证令牌' });
    req.user = decoded.payload;
    next();

};

const modifly_file_name = async (req, res, next) => {

}

// 可选的认证中间件，不要求一定有令牌，但如果有令牌，就会验证并将用户信息添加到请求中
const optionalAuth = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        // 无令牌时直接放行，但req.user将保持undefined
        console.log('未提供认证令牌，以未登录身份访问');
        return next();
    }
    const decoded = await verifyJWE(token, process.env.JWT_SECRET, process.env.JWT_ISSUER);
    if (decoded.error)
        console.log('invaild token.', decoded.error)
    req.user = decoded.payload;
    console.log(`用户已登录: ID=${decoded.id}, 角色=${decoded.role || '普通用户'}`);

    next();
};

const isAdmin = async (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: '需要管理员权限' });
    }
    next();
};



module.exports = { validateToken, modifly_file_name, optionalAuth, isAdmin }; 