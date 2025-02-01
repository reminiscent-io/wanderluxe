
import session from "express-session";
import { Express } from "express";

export function setupSession(app: Express) {
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'your-secret-key',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: true, // Required for Replit HTTPS
        sameSite: 'none', // Allow cross-origin
        httpOnly: true,
        domain: '.replit.dev', // Allow subdomains
        maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
      }
    })
  );
}
