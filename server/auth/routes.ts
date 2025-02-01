import type { Express } from "express";
import { IVerifyOptions } from "passport-local";
import passport from "passport";
import { db } from "@db";
import { users, insertUserSchema, type User } from "@db/schema";
import { eq } from "drizzle-orm";
import { crypto } from "./passport";
import { requireAuth } from "../middleware/auth.middleware";

// Create test user
const createTestUser = async () => {
  try {
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.username, 'test'))
      .limit(1);

    if (!existingUser) {
      const hashedPassword = await crypto.hash('test');
      await db.insert(users).values({
        username: 'test',
        password: hashedPassword,
      });
      console.log('Test user created successfully');
    }
  } catch (error) {
    console.error('Error creating test user:', error);
  }
};

export function setupAuthRoutes(app: Express) {
  // Create test user on startup
  createTestUser();

  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, password } = req.body;

      if (!username?.trim() || !password?.trim()) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      const normalizedUsername = username.trim().toLowerCase();

      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, normalizedUsername))
        .limit(1);

      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }

      const hashedPassword = await crypto.hash(password.trim());
      const [newUser] = await db
        .insert(users)
        .values({
          username: normalizedUsername,
          password: hashedPassword,
        })
        .returning();

      if (!newUser) {
        return res.status(500).json({ message: "Failed to create user" });
      }

      req.login(newUser, (err) => {
        if (err) return next(err);
        return res.json({
          id: newUser.id,
          username: newUser.username,
        });
      });
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log("Login attempt:", { username: req.body.username });
    passport.authenticate("local", (err: Error, user?: User, info?: { message: string }) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }
      if (!user) {
        console.log("Login failed:", { message: info?.message });
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }

      req.login(user, (err) => {
        if (err) return next(err);
        return res.json({
          id: user.id,
          username: user.username,
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/user", requireAuth, (req, res) => {
    const user = req.user as User;
    res.json({
      id: user.id,
      username: user.username,
    });
  });
}