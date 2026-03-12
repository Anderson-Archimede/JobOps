import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../auth/jwt";

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

const GUEST_USER_ID = "00000000-0000-0000-0000-000000000001";

export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  if (process.env.AUTH_ENABLED === "false") {
    const guestId = process.env.GUEST_USER_ID || GUEST_USER_ID;
    (req as AuthRequest).user = {
      userId: guestId,
      email: "guest@jobops.local",
    };
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authorization token required" });
  }

  const token = authHeader.substring(7);

  try {
    const payload = verifyAccessToken(token);

    if (!payload) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Attach user info to request
    (req as AuthRequest).user = {
      userId: payload.userId,
      email: payload.email || "",
    };

    next();
  } catch (error) {
    console.error("JWT verification error:", error);
    return res.status(401).json({ error: "Invalid token" });
  }
}
