/**
 * Cryptographic primitives shared by the app server and operator scripts.
 * No `server-only` import here so that Node scripts can use it; the app imports
 * it exclusively through `crypto.server.ts`.
 */
import crypto from 'node:crypto';

export function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

export function hmacHex(key: string, message: string): string {
  return crypto.createHmac('sha256', key).update(message, 'utf8').digest('hex');
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

/** Six random digits (uniform), e.g. "048213". */
export function generateJoinCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function joinCodeDigest(pepper: string, restaurantId: string, code: string): string {
  return hmacHex(pepper, `join:${restaurantId}:${code}`);
}

function keyFromBase64(keyB64: string): Buffer {
  const key = Buffer.from(keyB64, 'base64');
  if (key.length !== 32) throw new Error('QR_ENCRYPTION_KEY must be 32 bytes encoded in base64');
  return key;
}

/** AES-256-GCM; output `v{version}.{iv}.{ciphertext}.{tag}` (base64url parts). */
export function encryptQrToken(token: string, keyB64: string, version: number): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyFromBase64(keyB64), iv);
  cipher.setAAD(Buffer.from(`qr:v${version}`));
  const ct = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v${version}.${iv.toString('base64url')}.${ct.toString('base64url')}.${tag.toString('base64url')}`;
}

export function decryptQrToken(payload: string, keysByVersion: Record<number, string>): string {
  const [v, ivB, ctB, tagB] = payload.split('.');
  const version = Number((v ?? '').replace(/^v/, ''));
  const keyB64 = keysByVersion[version];
  if (!keyB64 || !ivB || !ctB || !tagB) throw new Error('Unknown QR key version or malformed ciphertext');
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyFromBase64(keyB64), Buffer.from(ivB, 'base64url'));
  decipher.setAAD(Buffer.from(`qr:v${version}`));
  decipher.setAuthTag(Buffer.from(tagB, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(ctB, 'base64url')), decipher.final()]).toString('utf8');
}

/** Signed, expiring context value: base64url(json).hmac */
export function signContext(secret: string, payload: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${hmacHex(secret, `ctx:${body}`)}`;
}

export function verifyContext<T extends Record<string, unknown>>(secret: string, value: string | undefined): T | null {
  if (!value) return null;
  const [body, sig] = value.split('.');
  if (!body || !sig) return null;
  const expected = hmacHex(secret, `ctx:${body}`);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as T & { e?: number };
    if (typeof data.e === 'number' && data.e < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

/** Deterministic UUID v5 (RFC 4122) for fixtures. */
export function uuidV5(name: string, namespace: string): string {
  const ns = Buffer.from(namespace.replace(/-/g, ''), 'hex');
  const hash = crypto.createHash('sha1').update(Buffer.concat([ns, Buffer.from(name, 'utf8')])).digest();
  hash[6] = (hash[6]! & 0x0f) | 0x50;
  hash[8] = (hash[8]! & 0x3f) | 0x80;
  const h = hash.subarray(0, 16).toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

/** Daily-salted IP hash; raw IPs are never stored. */
export function ipHash(salt: string, ip: string, day = new Date().toISOString().slice(0, 10)): string {
  return hmacHex(salt, `ip:${day}:${ip}`);
}
