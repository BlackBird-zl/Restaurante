import 'server-only';
import { serverEnv } from '@/lib/config/server-env';
import {
  decryptQrToken, encryptQrToken, generateJoinCode, ipHash, joinCodeDigest, randomToken, sha256Hex, signContext, verifyContext,
} from './secrets-core';

export { generateJoinCode, randomToken, sha256Hex };

export function joinDigest(restaurantId: string, code: string) {
  return joinCodeDigest(serverEnv().GUEST_PIN_PEPPER, restaurantId, code);
}

export function hashIp(ip: string) {
  return ipHash(serverEnv().RATE_LIMIT_SALT, ip);
}

export function encryptQr(token: string) {
  const env = serverEnv();
  return { ciphertext: encryptQrToken(token, env.QR_ENCRYPTION_KEY, env.QR_ENCRYPTION_KEY_VERSION), keyVersion: env.QR_ENCRYPTION_KEY_VERSION };
}

export function decryptQr(ciphertext: string) {
  return decryptQrToken(ciphertext, serverEnv().qrKeys);
}

export type QrContext = { q: string; t: string; n: string; e: number; v: 1 };

export function signQrContext(ctx: Omit<QrContext, 'e' | 'v'>, ttlMs = 10 * 60_000) {
  return signContext(serverEnv().QR_CONTEXT_SECRET, { ...ctx, e: Date.now() + ttlMs, v: 1 });
}

export function readQrContext(value: string | undefined): QrContext | null {
  return verifyContext<QrContext>(serverEnv().QR_CONTEXT_SECRET, value);
}
