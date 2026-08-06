import { createCipheriv, createHash, randomBytes } from 'node:crypto';

const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

export function createTemporaryPassword() {
  const bytes = randomBytes(12);
  return Array.from(bytes, (byte) => PASSWORD_ALPHABET[byte % PASSWORD_ALPHABET.length]).join('');
}

export function encryptPasswordReset(username: string, password: string, bridgeToken: string) {
  const key = createHash('sha256').update(bridgeToken).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify({ username, password }), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}
