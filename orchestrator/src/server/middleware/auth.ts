import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../auth/jwt";
import { logger } from "../../infra/logger";

/**
 * Middleware to authenticate requests using JWT RS256.
 * Expects "Authorization: Bearer <token>" header.
 */
export async function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Missing authorization header",
      },
      meta: { requestId: req.headers["x-request-id"] },
    });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Bearer token not found",
      },
      meta: { requestId: req.headers["x-request-id"] },
    });
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    return res.status(401).json({
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid or expired access token",
      },
      meta: { requestId: req.headers["x-request-id"] },
    });
  }

  // Attach user to request
  (req as any).user = payload;
  
  next();
}
