import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { db } from "@db";
import { users, type User } from "@db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { Express } from "express";

declare global {
  namespace Express {
    interface User extends User {}
  }
}

export const crypto = {
  hash: (password: string) => bcrypt.hash(password, 10),
  compare: (password: string, hash: string) => bcrypt.compare(password, hash),
};

export function setupPassport(app: Express) {
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username.toLowerCase().trim()))
          .limit(1);

        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }

        const isValid = await crypto.compare(password.trim(), user.password);
        if (!isValid) {
          return done(null, false, { message: "Invalid username or password" });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db
        .select()
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
}