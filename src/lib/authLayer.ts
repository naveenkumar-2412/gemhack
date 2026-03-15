import { Request, Response, NextFunction } from "express";

/**
 * Enterprise Auth Layer Simulation
 * Validates Mock JWT tokens and implements basic Role-Based Access Control
 */
export function authLayer(req: Request, res: Response, next: NextFunction): void {
  // In a real app, verify JWT signature here
  const authHeader = req.headers.authorization;
  
  if (req.path.startsWith("/api/public")) {
    return next();
  }

  if (process.env.NODE_ENV === "test" || !process.env.STRICT_AUTH) {
    // Bypass auth for testing or if strict mode is off
    (req as any).user = { role: "admin", id: "dev-user" };
    return next();
  }

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized: Missing Bearer token" });
    return;
  }

  const token = authHeader.split(" ")[1];
  
  if (token === "enterprise-mock-token-admin") {
    (req as any).user = { role: "admin", id: "enterprise-admin" };
    next();
  } else if (token === "enterprise-mock-token-user") {
    (req as any).user = { role: "user", id: "standard-user" };
    next();
  } else {
    res.status(403).json({ error: "Forbidden: Invalid token signature" });
  }
}

/** RBAC Middleware Generator */
export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;
    if (!user || user.role !== role) {
      res.status(403).json({ error: `Forbidden: Requires ${role} role` });
      return;
    }
    next();
  };
}
