import { createHmac } from 'crypto';

function base64url(input: Buffer | string): string {
  const b = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return b
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64urlJson(obj: any): string {
  return base64url(Buffer.from(JSON.stringify(obj)));
}

function parseExpiresIn(exp: string): number {
  // Supports s, m, h, d (e.g. "3600", "60m", "2h", "3d")
  if (!exp) return 0;
  if (/^\d+$/.test(exp)) return parseInt(exp, 10);
  const m = exp.match(/^(\d+)([smhd])$/);
  if (!m) return 0;
  const val = parseInt(m[1], 10);
  const unit = m[2];
  switch (unit) {
    case 's':
      return val;
    case 'm':
      return val * 60;
    case 'h':
      return val * 60 * 60;
    case 'd':
      return val * 24 * 60 * 60;
    default:
      return 0;
  }
}

export function sign(
  payload: Record<string, any>,
  secret: string,
  options?: { algorithm?: 'HS256'; expiresIn?: string },
): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const expSeconds = parseExpiresIn(options?.expiresIn || '');
  const withTimes = {
    iat: now,
    ...(expSeconds ? { exp: now + expSeconds } : {}),
    ...payload,
  };
  const unsigned = `${base64urlJson(header)}.${base64urlJson(withTimes)}`;
  const sig = createHmac('sha256', secret).update(unsigned).digest();
  const token = `${unsigned}.${base64url(sig)}`;
  return token;
}

export function verify(
  token: string,
  secret: string,
  options?: { algorithms?: Array<'HS256'> },
): Record<string, any> {
  if (!token || token.split('.').length !== 3) {
    throw new Error('Invalid JWT');
  }
  const [h, p, s] = token.split('.');
  const expected = base64url(
    createHmac('sha256', secret).update(`${h}.${p}`).digest(),
  );
  if (s !== expected) {
    throw new Error('Invalid signature');
  }
  const payload = JSON.parse(
    Buffer.from(p.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString(
      'utf8',
    ),
  );
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && typeof payload.exp === 'number' && now >= payload.exp) {
    throw new Error('Token expired');
  }
  return payload;
}

export function decode(token: string): Record<string, any> | null {
  if (!token || token.split('.').length !== 3) return null;
  const [, p] = token.split('.');
  try {
    return JSON.parse(
      Buffer.from(p.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString(
        'utf8',
      ),
    );
  } catch {
    return null;
  }
}

export type JwtPayload = Record<string, any>;
