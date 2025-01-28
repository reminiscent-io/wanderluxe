import session from "express-session";
import createMemoryStore from "memorystore";
import type { Express } from "express";

export function setupSession(app: Express) {
  const MemoryStore = createMemoryStore(session);
  const sessionSettings = {
    secret: process.env.REPL_ID || "luxury-travel-secret",
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({
      checkPeriod: 86400000,
    }),
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
    sessionSettings.cookie = {
      secure: true,
    };
  }

  app.use(session(sessionSettings));
}