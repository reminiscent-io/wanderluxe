import type { Express } from "express";
import { IVerifyOptions } from "passport-local";
import passport from "passport";
import { db } from "@db";
import { users, insertUserSchema } from "@db/schema";
import { eq } from "drizzle-orm";
import { crypto } from "./passport";
import { requireAuth } from "../middleware/auth.middleware";

export function setupAuthRoutes(app: Express) {
  app.post("/api/register", async (req, res, next) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res
          .status(400)
          .send("Invalid input: " + result.error.issues.map(i => i.message).join(", "));
      }

      const { username, password } = result.data;

      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      const hashedPassword = await crypto.hash(password);

      const [newUser] = await db
        .insert(users)
        .values({
          ...result.data,
          password: hashedPassword,
        })
        .returning();

      req.login(newUser, (err) => {
        if (err) {
          return next(err);
        }
        return res.json(newUser);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", async (req, res, next) => {
    try {
      const { username, password } = req.body;
      
      if (!username?.trim() || !password?.trim()) {
        return res.status(400).json({ 
          success: false, 
          message: "Username and password are required" 
        });
      }

      passport.authenticate(
        "local",
        async (err: any, user: Express.User, info: IVerifyOptions) => {
          if (err) {
            console.error("Login error:", err);
            return res.status(500).json({ 
              success: false, 
              message: "Internal server error" 
            });
          }

          if (!user) {
            return res.status(401).json({ 
              success: false, 
              message: info?.message ?? "Invalid credentials" 
            });
          }

          return new Promise<void>((resolve) => {
            req.logIn(user, (err) => {
              if (err) {
                console.error("Session error:", err);
                res.status(500).json({ 
                  success: false, 
                  message: "Failed to create session" 
                });
                return resolve();
              }

              res.json({ 
                success: true, 
                user,
                message: "Login successful" 
              });
              resolve();
            });
          });
        }
      )(req, res, next);
    } catch (error) {
      console.error("Unexpected error:", error);
      next(error);
    }
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).send("Logout failed");
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Test login endpoint
  app.post("/api/test-login", async (req, res) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, "test"))
        .limit(1);

      if (!user) {
        return res.status(400).json({ error: "Test user not found" });
      }

      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ error: "Login failed" });
        }
        return res.json({ success: true, user });
      });
    } catch (error) {
      return res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/user", requireAuth, (req, res) => {
    res.json(req.user);
  });
}
