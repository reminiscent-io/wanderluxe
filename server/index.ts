import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import dns from "node:dns";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Fix DNS resolution order for Node.js v17+
dns.setDefaultResultOrder('verbatim');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health check endpoint
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

// Handle React routing after API routes
app.get("*", (req, res) => {
  if (app.get("env") === "development") {
    res.sendFile(path.join(__dirname, "../client/index.html"));
  } else {
    res.sendFile(path.join(__dirname, "../client/dist/public/index.html"));
  }
});

// Add CORS headers specifically for Replit domains
app.use((req, res, next) => {
  const allowedOrigins = [
    'https://dbd55640-70ab-4284-bf3e-45861cdeb954-00-3inbm7rt0087l.janeway.replit.dev',
    /\.replit\.dev$/
  ];

  const origin = req.headers.origin;
  if (origin && (allowedOrigins.includes(origin) || allowedOrigins.some(pattern => pattern instanceof RegExp && pattern.test(origin)))) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Sec-WebSocket-Protocol');
    res.header('Access-Control-Allow-Credentials', 'true');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

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

(async () => {
  const server = registerRoutes(app);

  // Error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Error:', err);
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = 5000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`Express server running on port ${PORT}`, "express");
    log(`Vite dev server running on port 5173`, "express");
    log(`Application is ready for connections`, "express");
  });
})();