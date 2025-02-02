import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth } from "./auth/combined-auth";
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dns from "node:dns";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

import chatRouter from './routes/chat';




const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Fix DNS resolution order for Node.js v17+
dns.setDefaultResultOrder('verbatim');

const app = express();

// Trust proxy - required for Replit's environment
app.set('trust proxy', true);

// Configure WebSocket for database
import ws from 'ws';
global.WebSocket = ws;

// Enable CORS before other middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://0.0.0.0:5173', process.env.FRONTEND_URL || 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use X-Replit-User-Id header or fallback to IP
    return req.headers['x-replit-user-id']?.toString() || req.ip;
  }
});

app.use(limiter);
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use X-Replit-User-Id header or fallback to IP
    return req.headers['x-replit-user-id']?.toString() || req.ip;
  }
});


// Security middleware first
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Add request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});


// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    callback(null, true); // Allow all origins
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));


// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Apply rate limiting to auth routes
app.use('/api/(login|register)', authLimiter);

// Set up authentication
setupAuth(app);

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`, "express");
    }
  });
  next();
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error details:', {
    message: err.message,
    stack: err.stack,
    status: err.status || err.statusCode || 500
  });
  const status = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'development' ? err.message : "Internal Server Error";
  res.status(status).json({ message });
});

(async () => {
  const server = registerRoutes(app);

  // API routes
  app.use('/api', (req, res, next) => {
    console.log(`[API] ${req.method} ${req.path}`);
    next();
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  };

  // Add after other middleware
  app.use('/api/chat', chatRouter);

  // Frontend routes - must be after API routes
  app.get("*", (req, res) => {
    if (app.get("env") === "development") {
      res.sendFile(path.join(__dirname, "../client/index.html"));
    } else {
      res.sendFile(path.join(__dirname, "../client/dist/public/index.html"));
    }
  });

  const PORT = process.env.PORT || 8080;
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    log(`Express server running on port ${PORT}`, "express");
  });

  // Handle graceful shutdown
  const shutdown = () => {
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
})();