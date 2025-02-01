
import { Request, Response, NextFunction } from "express";
import { db } from "@db";
import { collaborators } from "@db/schema";
import { eq, and } from "drizzle-orm";

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ 
      message: "Unauthorized",
      redirectTo: "/auth"
    });
  }
  next();
};

export function requireTripAccess(role: "owner" | "editor" | "viewer" = "viewer") {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.params.tripId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const [collaborator] = await db
        .select()
        .from(collaborators)
        .where(
          and(
            eq(collaborators.tripId, parseInt(req.params.tripId)),
            eq(collaborators.userId, req.user.id)
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
      next(error);
    }
  };
}

const roleLevel = {
  owner: 3,
  editor: 2,
  viewer: 1,
};
