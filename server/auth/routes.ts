import type { Express } from "express";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { authMiddleware } from "@replit/repl-auth";

export function setupAuthRoutes(app: Express) {
  app.get("/api/user", authMiddleware, async (req, res) => {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, req.user.name))
      .limit(1);

    if (!user) {
      const [newUser] = await db
        .insert(users)
        .values({
          username: req.user.name,
          password: "", // Not needed with Replit auth
        })
        .returning();
      return res.json(newUser);
    }

    res.json(user);
  });
}