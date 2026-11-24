import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const PREFIX = 'enc:v1:';

// A dedicated MESSAGE_ENCRYPTION_KEY is recommended. JWT_SECRET is a safe
// fallback so existing deployments keep working until the new variable is set.
const rawKey =
  process.env.MESSAGE_ENCRYPTION_KEY ||
  process.env.JWT_SECRET ||
  'pingup-local-message-key';

const key = crypto.createHash('sha256').update(String(rawKey)).digest();

export const encryptMessage = (value) => {
  if (value === undefined || value === null) return value;

  const plain = String(value);
  if (!plain || plain.startsWith(PREFIX)) return plain;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    PREFIX,
    iv.toString('base64'),
    tag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
};

export const decryptMessage = (value) => {
  if (value === undefined || value === null) return value;

  const stored = String(value);
  if (!stored.startsWith(PREFIX)) return stored;

  try {
    const [, ivPart, tagPart, dataPart] = stored.split(':');
    const iv = Buffer.from(ivPart, 'base64');
    const tag = Buffer.from(tagPart, 'base64');
    const encrypted = Buffer.from(dataPart, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  } catch (error) {
    console.error('Error decrypting message:', error.message);
    return '';
  }
};
