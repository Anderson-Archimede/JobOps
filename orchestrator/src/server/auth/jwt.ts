/**
 * JWT helpers using RS256 (asymmetric keys).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";

const keysDir = join(process.cwd(), "auth-keys");
const privateKeyPath = join(keysDir, "jwt.private.pem");
const publicKeyPath = join(keysDir, "jwt.public.pem");

// Load keys once at startup
const PRIVATE_KEY = readFileSync(privateKeyPath, "utf-8");
const PUBLIC_KEY = readFileSync(publicKeyPath, "utf-8");

export interface AccessTokenPayload extends JwtPayload {
  sub: string;
  email?: string;
  type: "access";
  userId: string;
}

export interface RefreshTokenPayload extends JwtPayload {
  sub: string;
  type: "refresh";
  tokenId: string;
  userId: string;
}

export function signAccessToken(userId: string, email: string) {
  const payload: Omit<AccessTokenPayload, "type"> = {
    sub: userId,
    email,
  };
  const options: SignOptions = {
    algorithm: "RS256",
    expiresIn: "15m",
  };
  return jwt.sign({ ...payload, type: "access" }, PRIVATE_KEY, options);
}

export function signRefreshToken(userId: string) {
  const payload: Omit<RefreshTokenPayload, "type"> = {
    sub: userId,
    tokenId: `refresh-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
  };
  const options: SignOptions = {
    algorithm: "RS256",
    expiresIn: "7d",
  };
  return jwt.sign({ ...payload, type: "refresh" }, PRIVATE_KEY, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const decoded = jwt.verify(token, PUBLIC_KEY, {
      algorithms: ["RS256"],
    }) as AccessTokenPayload;
    if (decoded.type !== "access") {
      return null;
    }
    return {
      ...decoded,
      userId: decoded.sub,
      email: decoded.email || "",
    };
  } catch (error) {
    return null;
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    const decoded = jwt.verify(token, PUBLIC_KEY, {
      algorithms: ["RS256"],
    }) as RefreshTokenPayload;
    if (decoded.type !== "refresh") {
      return null;
    }
    return {
      ...decoded,
      userId: decoded.sub,
    };
  } catch (error) {
    return null;
  }
}

