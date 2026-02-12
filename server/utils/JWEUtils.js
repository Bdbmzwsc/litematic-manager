const { EncryptJWT, jwtDecrypt } = require('jose');

// 创建一个固定的密钥用于测试（而不是每次随机生成）
// 注意：A256GCM 需要 32 字节（256位）密钥
//const secretKey = Buffer.from('pNN7ZIUbguISl3Fu7il24H9bualepabO6oXQO5I6Muo=','base64');


async function createJWE(payload, secretKey, issuer, exp) {
  try {
    const jwt = await new EncryptJWT(payload)
      .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
      .setIssuedAt()
      .setIssuer(issuer)
      .setExpirationTime(exp)
      .encrypt(Buffer.from(secretKey, 'base64'));
    
    return { jwt };
  } catch (error) {
    throw { error : error.message };
  }
}

// 解密和验证 JWE
async function verifyJWE(jwe, secretKey, issuer) {
  try {
    const { payload, protectedHeader } = await jwtDecrypt(jwe, Buffer.from(secretKey, 'base64'), {
      issuer: issuer,
    });
    
    return { payload };
  } catch (error) {
    return { error: error.message };
  }
}

// 使用 async/await 处理 Promise
async function foo() {

    const payload = { user: 'name', id: 123, timestamp: new Date().toISOString() };
    const jwe = await createJWE(payload);
    console.log(jwe);
    const result = await verifyJWE(jwe);
    console.log('解密后的 Payload:', result);
    
}

module.exports = { createJWE, verifyJWE };