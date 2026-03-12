import { generateKeyPairSync } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const AUTH_KEYS_DIR = join(__dirname, '../orchestrator/auth-keys');

try {
  // Ensure directory exists
  mkdirSync(AUTH_KEYS_DIR, { recursive: true });

  console.log('Generating RS256 key pair...');

  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  writeFileSync(join(AUTH_KEYS_DIR, 'jwt.private.pem'), privateKey);
  writeFileSync(join(AUTH_KEYS_DIR, 'jwt.public.pem'), publicKey);

  console.log(`✅ Success! Keys generated in ${AUTH_KEYS_DIR}`);
  console.log('⚠️  KEEP private.pem SECURE AND NEVER COMMIT IT TO GIT (it should be in .gitignore)');
} catch (error) {
  console.error('❌ Error generating keys:', error);
  process.exit(1);
}
