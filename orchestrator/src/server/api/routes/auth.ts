import { Router } from "express";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../auth/jwt";
import { isTokenBlacklisted, blacklistToken } from "../../auth/redis-blacklist";
import { logger } from "@infra/logger";
import argon2 from "argon2";

const router = Router();

// Temporary in-memory user store (replace with DB later)
// In a real app, this would be a Drizle/Postgres table
interface User {
  id: string;
  email: string;
  passwordHash: string;
  profile: any;
}
const users: User[] = [];

/**
 * POST /api/auth/register
 */
router.post("/register", async (req, res) => {
  const { email, password, profile } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      ok: false,
      error: { code: "INVALID_REQUEST", message: "Email and password are required" },
    });
  }

  const existingUser = users.find((u) => u.email === email);
  if (existingUser) {
    return res.status(409).json({
      ok: false,
      error: { code: "CONFLICT", message: "Email already registered" },
    });
  }

  try {
    const passwordHash = await argon2.hash(password);
    const newUser: User = {
      id: Math.random().toString(36).substring(2, 15),
      email,
      passwordHash,
      profile: profile || {},
    };
    users.push(newUser);

    logger.info("User registered successfully", { email: newUser.email, userId: newUser.id });

    res.status(201).json({
      ok: true,
      data: { id: newUser.id, email: newUser.email },
      meta: { requestId: req.headers["x-request-id"] },
    });
  } catch (error) {
    logger.error("Registration failed", { error });
    res.status(500).json({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to register user" },
    });
  }
});

/**
 * POST /api/auth/login
 */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = users.find((u) => u.email === email);
  if (!user) {
    return res.status(401).json({
      ok: false,
      error: { code: "UNAUTHORIZED", message: "Invalid credentials" },
    });
  }

  try {
    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
      return res.status(401).json({
        ok: false,
        error: { code: "UNAUTHORIZED", message: "Invalid credentials" },
      });
    }

    const accessToken = signAccessToken(user.id, user.email);
    const refreshToken = signRefreshToken(user.id);

    // Set refresh token in httpOnly cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    logger.info("User logged in successfully", { userId: user.id });

    res.json({
      ok: true,
      data: { accessToken, user: { id: user.id, email: user.email, profile: user.profile } },
      meta: { requestId: req.headers["x-request-id"] },
    });
  } catch (error) {
    logger.error("Login failed", { error });
    res.status(500).json({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to login" },
    });
  }
});

/**
 * POST /api/auth/refresh
 */
router.post("/refresh", async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({
      ok: false,
      error: { code: "UNAUTHORIZED", message: "Refresh token missing" },
    });
  }

  const payload = verifyRefreshToken(refreshToken);
  if (!payload) {
    return res.status(401).json({
      ok: false,
      error: { code: "UNAUTHORIZED", message: "Invalid or expired refresh token" },
    });
  }

  // Check blacklist
  const blacklisted = await isTokenBlacklisted(payload.tokenId);
  if (blacklisted) {
    return res.status(401).json({
      ok: false,
      error: { code: "UNAUTHORIZED", message: "Token has been revoked" },
    });
  }

  const user = users.find((u) => u.id === payload.userId);
  if (!user) {
    return res.status(401).json({
      ok: false,
      error: { code: "UNAUTHORIZED", message: "User not found" },
    });
  }

  const newAccessToken = signAccessToken(user.id, user.email);
  const newRefreshToken = signRefreshToken(user.id);

  // Rotate refresh token
  res.cookie("refreshToken", newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  // Blacklist the old one
  await blacklistToken(payload.tokenId, payload.exp! - Math.floor(Date.now() / 1000));

  res.json({
    ok: true,
    data: { accessToken: newAccessToken },
    meta: { requestId: req.headers["x-request-id"] },
  });
});

/**
 * POST /api/auth/logout
 */
router.post("/logout", async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (refreshToken) {
    const payload = verifyRefreshToken(refreshToken);
    if (payload) {
      await blacklistToken(payload.tokenId, payload.exp! - Math.floor(Date.now() / 1000));
    }
  }

  res.clearCookie("refreshToken");
  res.json({
    ok: true,
    data: { message: "Logged out successfully" },
    meta: { requestId: req.headers["x-request-id"] },
  });
});

/**
 * GET /api/auth/me
 * Protected by authenticateJWT in parent router
 */
router.get("/me", (req: any, res) => {
  const GUEST_USER_ID = process.env.GUEST_USER_ID || "00000000-0000-0000-0000-000000000001";
  
  if (req.user.userId === GUEST_USER_ID) {
    return res.json({
      ok: true,
      data: { 
        id: GUEST_USER_ID, 
        email: "guest@jobops.local", 
        firstName: "Guest",
        lastName: "User",
        profileData: { role: "guest" },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      meta: { requestId: req.headers["x-request-id"] },
    });
  }

  const user = users.find((u) => u.id === req.user.userId);
  if (!user) {
    return res.status(404).json({
      ok: false,
      error: { code: "NOT_FOUND", message: "User not found" },
    });
  }

  res.json({
    ok: true,
    data: { id: user.id, email: user.email, profile: user.profile },
    meta: { requestId: req.headers["x-request-id"] },
  });
});

export const authRouter = router;
export default router;
