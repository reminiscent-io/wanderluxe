
import { Request, Response, NextFunction } from "express";
import { db } from "@db";
import { collaborators } from "@db/schema";
import { eq, and } from "drizzle-orm";
import type { User } from "@db/schema";

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log('Headers:', req.headers);
  console.log('Session:', req.session);
  
  // Check both the method existence and authentication state
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    console.log('Unauthorized access attempt:', {
      path: req.path,
      method: req.method,
      ip: req.ip,
      origin: req.headers.origin,
      userAgent: req.headers['user-agent'],
      sessionID: req.sessionID,
      authState: {
        hasAuthMethod: !!req.isAuthenticated,
        isAuthed: !!req.isAuthenticated?.(),
      }
    });
    
    return res.status(401).json({ 
      message: "Unauthorized",
      redirectTo: "/auth",
      code: "AUTH_REQUIRED"
    });
  }

  // Add user info to req.log for downstream use
  if (req.user) {
    console.log('Authorized access:', {
      userId: req.user.id,
      username: req.user.username,
      path: req.path
    });
  }

  next();
};

export function requireTripAccess(role: "owner" | "editor" | "viewer" = "viewer") {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as User;
    if (!user?.id || !req.params.tripId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const [collaborator] = await db
        .select()
        .from(collaborators)
        .where(
          and(
            eq(collaborators.tripId, parseInt(req.params.tripId)),
            eq(collaborators.userId, user.id)
          )
        );

      if (!collaborator) {
        return res.status(403).json({ message: "No access to this trip" });
      }

      if (roleLevel[collaborator.role as keyof typeof roleLevel] < roleLevel[role]) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      next();
    } catch (error) {
      console.error('Trip access error:', error);
      next(error);
    }
  };
}

const roleLevel = {
  owner: 3,
  editor: 2,
  viewer: 1,
} as const;
