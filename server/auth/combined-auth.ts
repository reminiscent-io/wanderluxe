import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import { Express, Request, Response, NextFunction } from "express";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import type { User } from "@db/schema";

// Types
declare global {
  namespace Express {
    interface User extends Omit<User, "password"> {}
  }
}

const crypto = {
  hash: (password: string) => bcrypt.hash(password, 10),
  compare: (password: string, hash: string) => bcrypt.compare(password, hash),
};

// Auth middleware
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized", redirectTo: "/auth" });
  }
  next();
};

export const requireTripAccess = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized", redirectTo: "/auth" });
  }
  next();
};

// Setup functions
export function setupAuth(app: Express) {
  const isProduction = process.env.NODE_ENV === 'production';
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'your-secret-key',
      resave: true,
      saveUninitialized: true,
      name: 'sessionId',
      cookie: {
        secure: false,
        sameSite: 'lax',
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/'
      }
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const normalizedUsername = username.toLowerCase().trim();
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, normalizedUsername))
          .limit(1);

        if (!user) {
          return done(null, false, { message: "Invalid credentials" });
        }

        const isValid = await crypto.compare(password.trim(), user.password);
        if (!isValid) {
          return done(null, false, { message: "Invalid credentials" });
        }

        const { password: _, ...userWithoutPassword } = user;
        return done(null, userWithoutPassword);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db
        .select({
          id: users.id,
          username: users.username,
          createdAt: users.createdAt
        })
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        return done(new Error('User not found'));
      }

      done(null, user);
    } catch (err) {
      done(err);
    }
  });
  
  // Auth routes
  app.post("/api/register", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, password } = req.body;

      if (!username?.trim() || !password?.trim()) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      const normalizedUsername = username.toLowerCase().trim();
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, normalizedUsername));

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
        .returning({
          id: users.id,
          username: users.username,
          createdAt: users.createdAt
        });

      req.login(newUser, (err) => {
        if (err) return next(err);
        return res.status(201).json(newUser);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("local", (err: Error, user: Express.User | false, info?: { message: string }) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }

      req.login(user, (err) => {
        if (err) return next(err);
        return res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/user", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user as Express.User;
    res.json(user);
  });
}