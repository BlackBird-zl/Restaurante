import { describe, expect, it } from 'vitest';
import crypto from 'node:crypto';
import { decryptQrToken, encryptQrToken, generateJoinCode, joinCodeDigest, signContext, uuidV5, verifyContext } from '@/lib/security/secrets-core';
import { safeNext } from '@/modules/auth/redirects';

const key = crypto.randomBytes(32).toString('base64');

describe('join code', () => {
  it('is always 6 digits', () => {
    for (let i = 0; i < 500; i++) expect(generateJoinCode()).toMatch(/^\d{6}$/);
  });
  it('digest is tenant-bound and peppered', () => {
    const a = joinCodeDigest('pepper', 'r1', '123456');
    expect(a).toHaveLength(64);
    expect(joinCodeDigest('pepper', 'r2', '123456')).not.toBe(a);
    expect(joinCodeDigest('other', 'r1', '123456')).not.toBe(a);
  });
});

describe('QR token encryption (AES-256-GCM, versioned key)', () => {
  it('round-trips and rejects tampering or unknown versions', () => {
    const c = encryptQrToken('tok_abc', key, 1);
    expect(c.startsWith('v1.')).toBe(true);
    expect(decryptQrToken(c, { 1: key })).toBe('tok_abc');
    const parts = c.split('.');
    parts[2] = Buffer.from('tok_xyz').toString('base64url');
    expect(() => decryptQrToken(parts.join('.'), { 1: key })).toThrow();
    expect(() => decryptQrToken(c, { 2: key })).toThrow();
  });
});

describe('signed context cookie', () => {
  it('verifies signature and expiry', () => {
    const v = signContext('s3cret', { q: 'x', e: Date.now() + 60_000 });
    expect(verifyContext('s3cret', v)?.q).toBe('x');
    expect(verifyContext('other', v)).toBeNull();
    expect(verifyContext('s3cret', v.replace(/^./, 'A'))).toBeNull();
    expect(verifyContext('s3cret', signContext('s3cret', { q: 'x', e: Date.now() - 1 }))).toBeNull();
    expect(verifyContext('s3cret', undefined)).toBeNull();
  });
});

describe('uuidV5', () => {
  it('matches the RFC 4122 test vector', () => {
    expect(uuidV5('www.example.com', '6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe('2ed6657d-e927-568b-95e1-2665a8aea6a2');
  });
});

describe('safeNext (open-redirect guard)', () => {
  it.each([
    ['/r/patio-do-ferro/op/salao', '/r/patio-do-ferro/op/salao'],
    ['/restaurantes', '/restaurantes'],
    ['//evil.example', '/restaurantes'],
    ['https://evil.example', '/restaurantes'],
    ['/\\evil', '/restaurantes'],
    ['/api/v1/staff/r/x', '/restaurantes'],
    [null, '/restaurantes'],
  ])('%s → %s', (input, out) => expect(safeNext(input)).toBe(out));
});
