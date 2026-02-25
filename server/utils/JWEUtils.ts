import crypto from 'crypto';
import { EncryptJWT, jwtDecrypt } from 'jose';
import type { JWECreateResult, JWEVerifyResult, AuthPayload } from '../types/index.js';

// 确保 crypto 在全局可用（某些 Node.js 版本可能需要）
if (!globalThis.crypto) {
    (globalThis as Record<string, unknown>).crypto = crypto.webcrypto || crypto;
}

export async function createJWE(
    payload: Record<string, unknown>,
    secretKey: string,
    issuer: string,
    exp: string
): Promise<JWECreateResult> {
    try {
        const jwt = await new EncryptJWT(payload)
            .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
            .setIssuedAt()
            .setIssuer(issuer)
            .setExpirationTime(exp)
            .encrypt(Buffer.from(secretKey, 'base64'));

        return { jwt };
    } catch (error) {
        throw { error: (error as Error).message };
    }
}

export async function verifyJWE(
    jwe: string,
    secretKey: string,
    issuer: string
): Promise<JWEVerifyResult> {
    try {
        const { payload } = await jwtDecrypt(jwe, Buffer.from(secretKey, 'base64'), {
            issuer: issuer,
        });

        return { payload: payload as unknown as AuthPayload };
    } catch (error) {
        return { error: (error as Error).message };
    }
}
