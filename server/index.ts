
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import dns from "node:dns";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setupSession } from "./auth/session";
import { setupPassport } from "./auth/passport";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Fix DNS resolution order for Node.js v17+
dns.setDefaultResultOrder('verbatim');

const app = express();

// Import security packages
import cors from 'cors';
import helmet from 'helmet';

// Security middleware first
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "https://*.replit.dev"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// Add request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check endpoint before other routes
app.get("/health", (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// CORS configuration
app.use(cors({
  origin: [
    'https://dbd55640-70ab-4284-bf3e-45861cdeb954-00-3inbm7rt0087l.janeway.replit.dev',
    /\.replit\.dev$/
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Set up session and authentication
setupSession(app);
setupPassport(app);

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine, "express");
    }
  });

  next();
});

// Health check endpoint before Vite setup
app.get("/health", (req, res) => {
  res.status(200).json({
    status: 'active',
    host: req.headers.host,
    allowedHosts: [
      process.env.VITE_ALLOWED_HOSTS,
      'dbd55640-70ab-4284-bf3e-45861cdeb954-00-3inbm7rt0087l.janeway.replit.dev'
    ]
  });
});

(async () => {
  const server = registerRoutes(app);

  // Error handling middleware before Vite setup
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Error:', err);
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

  // Setup Vite after core routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Handle React routing after API routes
  app.get("*", (req, res) => {
    if (app.get("env") === "development") {
      res.sendFile(path.join(__dirname, "../client/index.html"));
    } else {
      res.sendFile(path.join(__dirname, "../client/dist/public/index.html"));
    }
  });

  const PORT = 8080;
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    log(`Express server running on port ${PORT}`, "express");
    log(`Vite dev server running on port 5173`, "express");
  });
})();
