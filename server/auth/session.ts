
import session from "express-session";
import { Express } from "express";

export function setupSession(app: Express) {
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "development-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: true,
        sameSite: 'none',
        domain: '.replit.dev',
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
      }
    })
  );
}
