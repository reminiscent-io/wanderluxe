
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import { Express, Request, Response, NextFunction } from "express";
import { db } from "@db";
import { users, type User, insertUserSchema } from "@db/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";

// Types
declare global {
  namespace Express {
    interface User extends User {}
  }
}

// Crypto helpers
const crypto = {
  hash: (password: string) => bcrypt.hash(password, 10),
  compare: (password: string, hash: string) => bcrypt.compare(password, hash),
};

// Middleware
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
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

// Setup functions
export function setupAuth(app: Express) {
  // Session setup
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'your-secret-key',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: true,
        sameSite: 'none',
        domain: '.replit.dev',
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000
      }
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({
      usernameField: 'username',
      passwordField: 'password',
      passReqToCallback: false
    }, async (username, password, done) => {
      try {
        const normalizedUsername = username.toLowerCase().trim();
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, normalizedUsername))
          .limit(1);

        if (!user) return done(null, false, { message: "Invalid credentials" });
        
        const isValid = await bcrypt.compare(password.trim(), user.password);
        if (!isValid) return done(null, false, { message: "Invalid credentials" });

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: unknown, done) => {
    try {
      const numericId = Number(id);
      if (isNaN(numericId)) return done(new Error('Invalid user ID'));
      
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, numericId))
        .limit(1);

      user ? done(null, user) : done(new Error('User not found'));
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, password } = insertUserSchema.parse(req.body);
      const normalizedUsername = username.toLowerCase().trim();

      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, normalizedUsername));

      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }

      const hashedPassword = await bcrypt.hash(password.trim(), 12);
      const [newUser] = await db
        .insert(users)
        .values({
          username: normalizedUsername,
          password: hashedPassword,
        })
        .returning();

      req.login(newUser, (err) => {
        if (err) return next(err);
        return res.status(201).json({
          id: newUser.id,
          username: newUser.username
        });
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error, user?: User, info?: { message: string }) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Authentication failed" });

      req.logIn(user, (err) => {
        if (err) return next(err);
        return res.json({
          id: user.id,
          username: user.username
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
