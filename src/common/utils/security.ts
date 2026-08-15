import * as crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'zestfoot_jwt_secret_key_12345';

/**
 * Hash password using PBKDF2 with a random salt.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify password using PBKDF2 and the stored salt/hash.
 */
export function verifyPassword(password: string, storedValue: string): boolean {
  try {
    const parts = storedValue.split(':');
    if (parts.length !== 2) return false;
    const [salt, hash] = parts;
    const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha256').toString('hex');
    return verifyHash === hash;
  } catch (e) {
    return false;
  }
}

/**
 * Generate a custom HMAC-SHA256 Token (JWT) with 7 days expiration.
 */
export function generateToken(payload: any): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const data = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET)
    .update(`${header}.${data}`)
    .digest('base64url');
  return `${header}.${data}.${signature}`;
}

/**
 * Validate the custom HMAC-SHA256 Token and return decoded payload if valid.
 */
export function validateToken(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, data, signature] = parts;

    const expectedSignature = crypto.createHmac('sha256', JWT_SECRET)
      .update(`${header}.${data}`)
      .digest('base64url');

    if (signature !== expectedSignature) return null;

    const decoded = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (decoded.exp && Date.now() > decoded.exp) {
      return null; // Expired
    }
    return decoded;
  } catch (err) {
    return null;
  }
}
