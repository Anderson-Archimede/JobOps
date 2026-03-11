/**
 * Generate RS256 key pair for JWT signing/verification.
 *
 * Usage:
 *   cd orchestrator
 *   npx tsx scripts/gen-keys.ts
 *
 * This will create:
 *   auth-keys/jwt.private.pem
 *   auth-keys/jwt.public.pem
 */

import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { generateKeyPairSync } from "node:crypto";

async function main() {
  const keysDir = join(process.cwd(), "auth-keys");

  if (!existsSync(keysDir)) {
    await mkdir(keysDir, { recursive: true });
  }

  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 4096,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });

  const privatePath = join(keysDir, "jwt.private.pem");
  const publicPath = join(keysDir, "jwt.public.pem");

  await writeFile(privatePath, privateKey, { encoding: "utf-8", flag: "w" });
  await writeFile(publicPath, publicKey, { encoding: "utf-8", flag: "w" });

  // eslint-disable-next-line no-console
  console.log("✅ Generated JWT RS256 key pair:");
  // eslint-disable-next-line no-console
  console.log(`- Private key: ${privatePath}`);
  // eslint-disable-next-line no-console
  console.log(`- Public key : ${publicPath}`);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("❌ Failed to generate keys:", error);
  process.exit(1);
});

