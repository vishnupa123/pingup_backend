import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const PREFIX = 'enc:v1:';

// A dedicated MESSAGE_ENCRYPTION_KEY is recommended. JWT_SECRET is a safe
// fallback so existing deployments keep working until the new variable is set.
// The first key is used for new messages. The rest are legacy keys tried on
// decrypt so messages written before a key rotation remain readable.
const legacyKeys = (process.env.MESSAGE_ENCRYPTION_KEYS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const rawKeys = [
  process.env.MESSAGE_ENCRYPTION_KEY,
  process.env.JWT_SECRET,
  ...legacyKeys,
  'pingup-local-message-key',
].filter(Boolean);

const keys = [...new Set(rawKeys.map(String))].map((value) =>
  crypto.createHash('sha256').update(value).digest()
);
const key = keys[0];

export const encryptMessage = (value) => {
  if (value === undefined || value === null) return value;

  const plain = String(value);
  if (!plain || plain.startsWith(PREFIX)) return plain;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Keep PREFIX's trailing colon as the only separator. Older records were
  // written with an extra colon and are still handled by decryptMessage below.
  return `${PREFIX}${[iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':')}`;
};

export const decryptMessage = (value) => {
  if (value === undefined || value === null) return value;

  const stored = String(value);
  if (!stored.startsWith(PREFIX)) return stored;

  // Remove the prefix first, then ignore the extra empty segment produced by
  // the old `enc:v1::iv:tag:data` format.
  const [ivPart, tagPart, dataPart] = stored
    .slice(PREFIX.length)
    .split(':')
    .filter(Boolean);

  if (!ivPart || !tagPart || !dataPart) return 'Unable to decrypt message';

  const iv = Buffer.from(ivPart, 'base64');
  const tag = Buffer.from(tagPart, 'base64');
  const encrypted = Buffer.from(dataPart, 'base64');

  // Try the active key first, then every legacy key. This keeps old messages
  // readable after a JWT/message encryption key rotation.
  for (const candidate of keys) {
    try {
      const decipher = crypto.createDecipheriv(ALGORITHM, candidate, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    } catch {
      // Try the next key.
    }
  }

  console.error('Error decrypting message: no key could decrypt this message');
  return 'Unable to decrypt message';
};
